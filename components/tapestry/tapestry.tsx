'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomBehavior, ZoomTransform, zoomIdentity } from 'd3-zoom';
import {
  TapestryNode,
  TapestryConnection,
  TapestryGroup,
  TapestryState,
  TapestryNodeType,
  createNode,
  createConnection,
  createGroup,
  createEmptyTapestry,
  getTapestryStorageKey,
  migrateTapestryState,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_CHARACTER_WIDTH,
  DEFAULT_CHARACTER_HEIGHT,
  DEFAULT_GROUP_WIDTH,
  DEFAULT_GROUP_HEIGHT,
  NODE_TYPE_COLORS,
  NOTE_COLORS,
  CONNECTION_COLORS,
  STATUS_COLORS,
  TIME_ICONS,
} from '@/types/tapestry';
import { normalizeTimeOfDay } from '@/lib/prosemirror/utils/time-detection';
import '@/styles/tapestry.css';
import { TapestryToolbar } from './tapestry-toolbar';
import { NoteEditorDialog } from './note-editor-dialog';
import { createDefaultFilters, type TapestryFilters } from './filter-panel';
import { ContextMenu, type ContextMenuItem } from './context-menu';
import { sanitizeForD3Text } from '@/lib/utils';
import { Scene, Location } from '@/types/screenplay';
import type { IndexCard } from '@/components/index-cards';
import type { CharacterInfo } from '@/hooks/editor/types';
import { PaperNoise } from '@/components/prosemirror/PaperNoise';

// New layout system imports
import {
  computeLayout,
  createEdgeBundles,
  generateBundledEdgePath,
  getHighlightedEdges,
  getEdgeOpacity,
  type LayoutResult,
  type EdgeBundle,
  type HighlightState,
  INITIAL_HIGHLIGHT_STATE,
  EDGE_OPACITY,
  DEFAULT_LAYOUT_CONFIG,
} from '@/lib/tapestry';
import { EntitySidebar } from './EntitySidebar';
import { Minimap } from './Minimap';
import { CharacterProfilePanel } from './character-profile-panel';

// Get index cards from localStorage
function getIndexCardsStorageKey(screenplayId: string): string {
  return `verso-cards-${screenplayId}`;
}

function loadIndexCards(screenplayId: string): IndexCard[] {
  try {
    const saved = localStorage.getItem(getIndexCardsStorageKey(screenplayId));
    if (saved) {
      return JSON.parse(saved) as IndexCard[];
    }
  } catch {
    // Invalid data
  }
  return [];
}

// Node type icons (simple text indicators)
const NODE_TYPE_ICONS: Record<TapestryNodeType, string> = {
  scene: 'S',
  character: 'C',
  item: 'I',
  location: 'L',
  note: 'N',
};

// Helper to get node dimensions based on type
function getNodeDimensions(node: TapestryNode): { width: number; height: number } {
  if (node.type === 'character') {
    return {
      width: node.width || DEFAULT_CHARACTER_WIDTH,
      height: node.height || DEFAULT_CHARACTER_HEIGHT
    };
  }
  return {
    width: node.width || DEFAULT_NOTE_WIDTH,
    height: node.height || DEFAULT_NOTE_HEIGHT
  };
}

interface TapestryProps {
  screenplayId: string;
  screenplayTitle: string;
  scenes?: Scene[];
  characters?: CharacterInfo[];
  locations?: Location[];
  onSceneClick?: (sceneId: string) => void;
}

export function Tapestry({
  screenplayId,
  screenplayTitle,
  scenes = [],
  characters = [],
  locations = [],
  onSceneClick,
}: TapestryProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<TapestryState>(createEmptyTapestry);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<TapestryNode | null>(null);
  const [filters, setFilters] = useState<TapestryFilters>(createDefaultFilters);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    groupId?: string;
  } | null>(null);

  // Highlight state for edge bundling interactions
  const [highlightState, setHighlightState] = useState<HighlightState>(INITIAL_HIGHLIGHT_STATE);

  // Toggle for new layout mode (can be controlled via toolbar)
  const [useNewLayout, setUseNewLayout] = useState(false);

  // Character profile panel state
  const [profileCharacter, setProfileCharacter] = useState<TapestryNode | null>(null);

  // Hover state for highlighting connections
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Toggle for showing all connection lines (off by default)
  const [showAllLines, setShowAllLines] = useState(false);

  // Calculate highlighted connections and nodes based on hover
  const { highlightedConnections, highlightedNodeIds } = useMemo(() => {
    if (!hoveredNodeId) {
      return { highlightedConnections: new Set<string>(), highlightedNodeIds: new Set<string>() };
    }

    const connIds = new Set<string>();
    const nodeIds = new Set<string>([hoveredNodeId]);

    state.connections.forEach(conn => {
      if (conn.sourceId === hoveredNodeId || conn.targetId === hoveredNodeId) {
        connIds.add(conn.id);
        nodeIds.add(conn.sourceId);
        nodeIds.add(conn.targetId);
      }
    });

    return { highlightedConnections: connIds, highlightedNodeIds: nodeIds };
  }, [hoveredNodeId, state.connections]);

  // Get available characters for filter panel
  const availableCharacters = characters.map(c => c.name);

  // Compute layout using new engine
  const layout = useMemo<LayoutResult | null>(() => {
    if (!useNewLayout || state.nodes.length === 0) return null;
    return computeLayout({
      nodes: state.nodes,
      connections: state.connections,
    });
  }, [useNewLayout, state.nodes, state.connections]);

  // Create edge bundles for hierarchical bundling
  const edgeBundles = useMemo<EdgeBundle[]>(() => {
    if (!layout) return [];
    return createEdgeBundles(layout, state.connections);
  }, [layout, state.connections]);

  // Get highlighted edges based on current highlight state
  const highlightedEdges = useMemo(() => {
    const activeCharId = highlightState.lockedCharacterId || highlightState.hoveredCharacterId;
    const activeSceneId = highlightState.lockedSceneId || highlightState.hoveredSceneId;
    return getHighlightedEdges(edgeBundles, activeCharId, activeSceneId);
  }, [edgeBundles, highlightState]);

  const hasAnyHighlight = !!(
    highlightState.hoveredCharacterId ||
    highlightState.hoveredSceneId ||
    highlightState.lockedCharacterId ||
    highlightState.lockedSceneId
  );

  // Sidebar interaction handlers
  const handleEntityHover = useCallback((nodeId: string | null) => {
    setHighlightState(prev => ({
      ...prev,
      hoveredCharacterId: nodeId,
    }));
  }, []);

  const handleEntityClick = useCallback((nodeId: string) => {
    setHighlightState(prev => ({
      ...prev,
      lockedCharacterId: prev.lockedCharacterId === nodeId ? null : nodeId,
    }));
  }, []);

  // Scene hover handler for edge highlighting
  const handleSceneHover = useCallback((nodeId: string | null) => {
    setHighlightState(prev => ({
      ...prev,
      hoveredSceneId: nodeId,
    }));
  }, []);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    setHighlightState(INITIAL_HIGHLIGHT_STATE);
  }, []);

  // Check if a node matches the current filters
  const nodeMatchesFilters = useCallback((node: TapestryNode): boolean => {
    // Type filter
    if (!filters.types.includes(node.type || 'note')) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = node.title?.toLowerCase().includes(searchLower);
      const matchesContent = node.content?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesContent) {
        return false;
      }
    }

    // Character filter (only applies to scenes that contain the character)
    if (filters.characters.length > 0) {
      if (node.type === 'scene') {
        // Get scene info to check characters
        const scene = scenes.find(s => s.id === node.sceneId);
        if (scene) {
          const hasCharacter = filters.characters.some(c =>
            scene.characters?.includes(c)
          );
          if (!hasCharacter) {
            return false;
          }
        }
      } else if (node.type === 'character') {
        // Character nodes match if they're in the filter list
        if (!filters.characters.includes(node.title)) {
          return false;
        }
      }
      // Other node types pass through when character filter is active
    }

    return true;
  }, [filters, scenes]);

  // Refs for D3
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const lastTapRef = useRef<{ nodeId: string; time: number } | null>(null);

  // Load state from localStorage with migration
  useEffect(() => {
    const storageKey = getTapestryStorageKey(screenplayId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate legacy data if needed
        const migrated = migrateTapestryState(parsed);
        setState(migrated);
        transformRef.current = d3.zoomIdentity
          .translate(migrated.panX, migrated.panY)
          .scale(migrated.zoom);

        // Save migrated data back if it changed
        if (parsed !== migrated) {
          localStorage.setItem(storageKey, JSON.stringify(migrated));
        }
      } catch {
        // Invalid data, start fresh
      }
    }
  }, [screenplayId]);

  // Auto-sync scenes, characters, and locations with enriched data
  useEffect(() => {
    if (scenes.length === 0 && characters.length === 0 && locations.length === 0) return;

    // Load index card data for enrichment
    const indexCards = loadIndexCards(screenplayId);
    const cardsBySceneId = new Map(indexCards.map(c => [c.sceneId, c]));

    setState(prev => {
      // Get existing linked nodes by type
      const existingSceneNodes = new Map(
        prev.nodes.filter(n => n.sceneId).map(n => [n.sceneId, n])
      );
      const existingCharacterNodes = new Map(
        prev.nodes.filter(n => n.characterId).map(n => [n.characterId, n])
      );

      const updatedNodes: TapestryNode[] = [];
      const newGroups: TapestryGroup[] = [...prev.groups];

      // ============================================================================
      // BIPARTITE LAYOUT: Characters LEFT, Scenes RIGHT (in act lanes)
      // ============================================================================

      // Layout constants
      const sceneNodeWidth = DEFAULT_NOTE_WIDTH;
      const sceneNodeHeight = DEFAULT_NOTE_HEIGHT;
      const charNodeWidth = DEFAULT_CHARACTER_WIDTH;
      const charNodeHeight = DEFAULT_CHARACTER_HEIGHT;

      const leftMargin = 60;
      const charColumnWidth = charNodeWidth + 40;  // Character column on left
      const sceneStartX = leftMargin + charColumnWidth + 80;  // Gap between chars and scenes
      const sceneSpacing = sceneNodeWidth + 30;  // Horizontal spacing between scenes
      const actRowSpacing = sceneNodeHeight + 40;  // Vertical spacing between rows in act

      // Group scenes by "act" (every 10 scenes = 1 act)
      const getActNumber = (sceneNum: number) => Math.ceil(sceneNum / 10);
      const scenesByAct = new Map<number, typeof scenes>();
      scenes.forEach(scene => {
        const act = getActNumber(scene.number);
        if (!scenesByAct.has(act)) scenesByAct.set(act, []);
        scenesByAct.get(act)!.push(scene);
      });

      // Sort characters by dialogue count (most active at top)
      const sortedCharacters = [...characters].sort((a, b) => b.dialogueCount - a.dialogueCount);

      // === CHARACTER NODES (left column, sorted by dialogue count) ===
      const charVerticalSpacing = charNodeHeight + 25;
      const charStartY = 60;

      sortedCharacters.forEach((char, i) => {
        const existingNode = existingCharacterNodes.get(char.id);

        if (existingNode) {
          updatedNodes.push({
            ...existingNode,
            type: 'character',
            dialogueCount: char.dialogueCount,
            sceneAppearances: scenes
              .filter(s => s.characters?.includes(char.name))
              .map(s => s.id),
          });
        } else {
          const x = leftMargin;
          const y = charStartY + i * charVerticalSpacing;

          updatedNodes.push(createNode({
            type: 'character',
            x,
            y,
            title: char.name,
            content: `${char.dialogueCount} dialogue${char.dialogueCount !== 1 ? 's' : ''}`,
            characterId: char.id,
            dialogueCount: char.dialogueCount,
            sceneAppearances: scenes
              .filter(s => s.characters?.includes(char.name))
              .map(s => s.id),
            color: NODE_TYPE_COLORS.character,
          }));
        }
      });

      // Calculate character column height for centering scenes
      const charColumnHeight = sortedCharacters.length * charVerticalSpacing;

      // === SCENE NODES (right side, organized in horizontal act lanes) ===
      // Each act is a horizontal row, scenes flow left-to-right within each act
      const actBounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
      let currentActY = charStartY;  // Start scenes aligned with first character

      const sortedActs = Array.from(scenesByAct.keys()).sort((a, b) => a - b);

      sortedActs.forEach((actNum) => {
        const actScenes = scenesByAct.get(actNum)!;
        const actStartY = currentActY;

        // Calculate how many scenes per row (aim for 4-6 per row)
        const scenesPerRow = Math.min(6, Math.max(3, actScenes.length));
        const numRows = Math.ceil(actScenes.length / scenesPerRow);

        actScenes.forEach((scene, i) => {
          const existingNode = existingSceneNodes.get(scene.id);
          const card = cardsBySceneId.get(scene.id);

          if (existingNode) {
            updatedNodes.push({
              ...existingNode,
              type: 'scene',
              title: existingNode.title.startsWith('Scene ')
                ? `Scene ${scene.number}`
                : existingNode.title,
              content: card?.summary && existingNode.content === scene.heading
                ? card.summary
                : existingNode.content || card?.summary || scene.heading,
              color: card?.color || existingNode.color,
              sceneNumber: scene.number,
              timeOfDay: scene.timeOfDay,
            });
          } else {
            // Arrange scenes in rows within act lane
            const col = i % scenesPerRow;
            const row = Math.floor(i / scenesPerRow);
            const x = sceneStartX + col * sceneSpacing;
            const y = actStartY + row * actRowSpacing;

            // Track bounds for this act
            if (!actBounds.has(actNum)) {
              actBounds.set(actNum, { minX: x, minY: y, maxX: x + sceneNodeWidth, maxY: y + sceneNodeHeight });
            } else {
              const bounds = actBounds.get(actNum)!;
              bounds.minX = Math.min(bounds.minX, x);
              bounds.minY = Math.min(bounds.minY, y);
              bounds.maxX = Math.max(bounds.maxX, x + sceneNodeWidth);
              bounds.maxY = Math.max(bounds.maxY, y + sceneNodeHeight);
            }

            updatedNodes.push(createNode({
              type: 'scene',
              x,
              y,
              title: `Scene ${scene.number}`,
              content: card?.summary || scene.heading,
              sceneId: scene.id,
              sceneNumber: scene.number,
              timeOfDay: scene.timeOfDay,
              color: card?.color || NODE_TYPE_COLORS.scene,
            }));
          }
        });

        // Move Y position for next act (each act gets its own horizontal lane)
        currentActY += numRows * actRowSpacing + 60; // Gap between acts
      });

      // Create auto-groups for each act (only if no existing groups)
      if (prev.groups.length === 0 && scenesByAct.size > 1) {
        const actGroupIds = new Map<number, string>();

        // First pass: create groups and store their IDs
        actBounds.forEach((bounds, actNum) => {
          const padding = 20;
          const group = createGroup({
            x: bounds.minX - padding,
            y: bounds.minY - 40, // Room for header
            width: bounds.maxX - bounds.minX + padding * 2,
            height: bounds.maxY - bounds.minY + padding + 40,
            title: `Act ${actNum}`,
            color: NOTE_COLORS[(actNum - 1) % NOTE_COLORS.length],
          });
          actGroupIds.set(actNum, group.id);
          newGroups.push(group);
        });

        // Second pass: assign groupId to scene nodes based on their act
        updatedNodes.forEach(node => {
          if (node.type === 'scene' && node.sceneNumber) {
            const actNum = getActNumber(node.sceneNumber);
            const groupId = actGroupIds.get(actNum);
            if (groupId) {
              node.groupId = groupId;
            }
          }
        });
      }

      // Keep user-created nodes (notes, items, etc. that weren't auto-imported)
      const userNodes = prev.nodes.filter(n =>
        !n.sceneId && !n.characterId && (n.type === 'note' || n.type === 'item')
      );

      const newNodes = [...userNodes, ...updatedNodes];

      // === AUTO-CREATE CONNECTIONS ===
      // Create "appears_in" connections between characters and their scenes
      const existingConnectionKeys = new Set(
        prev.connections.map(c => `${c.sourceId}-${c.targetId}`)
      );
      const newConnections = [...prev.connections];

      // Build maps for quick lookup
      const nodesBySceneId = new Map(
        newNodes.filter(n => n.sceneId).map(n => [n.sceneId, n])
      );

      // Character → Scene connections
      newNodes.filter(n => n.type === 'character' && n.sceneAppearances).forEach(charNode => {
        charNode.sceneAppearances?.forEach(sceneId => {
          const sceneNode = nodesBySceneId.get(sceneId);
          if (sceneNode) {
            const key = `${charNode.id}-${sceneNode.id}`;
            const reverseKey = `${sceneNode.id}-${charNode.id}`;
            if (!existingConnectionKeys.has(key) && !existingConnectionKeys.has(reverseKey)) {
              newConnections.push(createConnection(charNode.id, sceneNode.id, 'appears_in', {
                label: 'appears in',
                directed: true,
              }));
              existingConnectionKeys.add(key);
            }
          }
        });
      });

      // Only update if there are changes
      const hasNodeChanges = newNodes.length !== prev.nodes.length ||
        newNodes.some((n, i) => {
          const oldNode = prev.nodes[i];
          return !oldNode || n.id !== oldNode.id || n.content !== oldNode.content;
        });
      const hasConnectionChanges = newConnections.length !== prev.connections.length;
      const hasGroupChanges = newGroups.length !== prev.groups.length;

      if (!hasNodeChanges && !hasConnectionChanges && !hasGroupChanges) return prev;

      const newState = { ...prev, nodes: newNodes, connections: newConnections, groups: newGroups };
      const storageKey = getTapestryStorageKey(screenplayId);
      localStorage.setItem(storageKey, JSON.stringify(newState));
      return newState;
    });
  }, [scenes, characters, locations, screenplayId]);

  // Save state to localStorage
  const saveState = useCallback((newState: TapestryState) => {
    const storageKey = getTapestryStorageKey(screenplayId);
    localStorage.setItem(storageKey, JSON.stringify(newState));
  }, [screenplayId]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();
    svg.on('.zoom', null);

    // Clean grid background (matches app style)
    const defs = svg.append('defs');

    // Subtle dot grid pattern
    const pattern = defs.append('pattern')
      .attr('id', 'gridPattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 24)
      .attr('height', 24);

    pattern.append('circle')
      .attr('cx', 12)
      .attr('cy', 12)
      .attr('r', 1)
      .attr('fill', 'hsl(var(--muted-foreground) / 0.15)');

    // Arrow marker for directed connections
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'hsl(var(--primary))');

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'hsl(var(--muted) / 0.3)');

    // Grid overlay
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#gridPattern)');

    // Create container group for zoom
    const container = svg.append('g').attr('class', 'tapestry-container');

    // Setup zoom with touch gesture support
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .touchable(() => true)
      .filter((event) => {
        if (event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend') {
          return true;
        }
        return !event.button;
      })
      .on('zoom', (event) => {
        // Only update D3 transform during zoom (no React state update)
        container.attr('transform', event.transform);
        transformRef.current = event.transform;
      })
      .on('end', () => {
        // Save to React state only when zoom/pan ends
        setState(prev => ({
          ...prev,
          zoom: transformRef.current.k,
          panX: transformRef.current.x,
          panY: transformRef.current.y,
        }));
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Apply saved transform
    svg.call(zoom.transform, transformRef.current);

    // Draw groups first (behind everything)
    const groupsGroup = container.append('g').attr('class', 'groups');

    // Create drag behavior for groups (moves child nodes too)
    const groupDrag = d3.drag<SVGGElement, TapestryGroup>()
      .touchable(() => true)
      .container(function() {
        return container.node() as SVGGElement;
      })
      .subject(function(event, d) {
        return { x: d.x, y: d.y };
      })
      .on('start', function(event, d) {
        event.sourceEvent?.stopPropagation();
        d3.select(this).raise().attr('opacity', 0.9);
      })
      .on('drag', function(event, d) {
        const dx = event.x - d.x;
        const dy = event.y - d.y;
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);

        // Move child nodes visually during drag
        state.nodes.filter(n => n.groupId === d.id).forEach(node => {
          node.x += dx;
          node.y += dy;
          // Update the visual position of the node
          nodesGroup.select(`[data-node-id="${node.id}"]`)
            .attr('transform', `translate(${node.x}, ${node.y})`);
        });
      })
      .on('end', function(event, d) {
        d3.select(this).attr('opacity', 1);
        setState(prev => {
          // Calculate delta from original position
          const originalGroup = prev.groups.find(g => g.id === d.id);
          const dx = originalGroup ? d.x - originalGroup.x : 0;
          const dy = originalGroup ? d.y - originalGroup.y : 0;

          const newState = {
            ...prev,
            groups: prev.groups.map(g => g.id === d.id ? { ...g, x: d.x, y: d.y } : g),
            // Update all child nodes' positions
            nodes: prev.nodes.map(n =>
              n.groupId === d.id ? { ...n, x: n.x + dx, y: n.y + dy } : n
            ),
          };
          saveState(newState);
          return newState;
        });
      });

    const groupHeaderHeight = 32;
    const groupPadding = 20;

    state.groups.forEach(group => {
      const isCollapsed = group.collapsed || false;

      // Dynamic resize: calculate bounds from child nodes
      const childNodes = state.nodes.filter(n => n.groupId === group.id);
      let dynamicWidth = group.width;
      let dynamicHeight = group.height;

      if (childNodes.length > 0) {
        const minX = Math.min(...childNodes.map(n => n.x));
        const maxX = Math.max(...childNodes.map(n => n.x + (n.width || DEFAULT_NOTE_WIDTH)));
        const minY = Math.min(...childNodes.map(n => n.y));
        const maxY = Math.max(...childNodes.map(n => n.y + (n.height || DEFAULT_NOTE_HEIGHT)));

        dynamicWidth = maxX - minX + groupPadding * 2;
        dynamicHeight = maxY - minY + groupPadding + groupHeaderHeight + 10;

        // Update group position to be relative to child bounds
        group.x = minX - groupPadding;
        group.y = minY - groupHeaderHeight - 10;
      }

      const displayHeight = isCollapsed ? groupHeaderHeight + 30 : dynamicHeight;
      const displayWidth = dynamicWidth;

      const groupG = groupsGroup.append('g')
        .datum(group)
        .attr('class', 'tapestry-group')
        .attr('data-group-id', group.id)
        .attr('transform', `translate(${group.x}, ${group.y})`)
        .attr('cursor', 'grab')
        .call(groupDrag);

      // Group background - monochromatic with dashed border and soft shadow
      groupG.append('rect')
        .attr('class', 'group-body')
        .attr('width', displayWidth)
        .attr('height', displayHeight)
        .attr('rx', 12)
        .attr('fill', 'hsl(var(--muted) / 0.2)')
        .attr('stroke', 'hsl(var(--border))')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', isCollapsed ? 'none' : '8,4')
        .attr('filter', 'url(#soft-shadow)');

      // Header bar - accent color (subtle)
      groupG.append('rect')
        .attr('class', 'group-header')
        .attr('width', displayWidth)
        .attr('height', groupHeaderHeight)
        .attr('rx', 12)
        .attr('ry', 12)
        .attr('fill', `${group.color}15`);

      // Square off bottom of header
      groupG.append('rect')
        .attr('y', 12)
        .attr('width', displayWidth)
        .attr('height', groupHeaderHeight - 12)
        .attr('fill', `${group.color}15`);

      // Header divider (only when expanded)
      if (!isCollapsed) {
        groupG.append('line')
          .attr('x1', 0)
          .attr('y1', groupHeaderHeight)
          .attr('x2', displayWidth)
          .attr('y2', groupHeaderHeight)
          .attr('stroke', 'hsl(var(--border))')
          .attr('stroke-width', 1);
      }

      // Collapse/expand toggle
      groupG.append('text')
        .attr('class', 'collapse-toggle')
        .attr('x', 14)
        .attr('y', groupHeaderHeight / 2 + 5)
        .attr('font-size', '10px')
        .attr('fill', 'hsl(var(--muted-foreground))')
        .attr('cursor', 'pointer')
        .text(isCollapsed ? '▶' : '▼')
        .on('click', (event) => {
          event.stopPropagation();
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.map(g =>
                g.id === group.id ? { ...g, collapsed: !g.collapsed } : g
              ),
            };
            saveState(newState);
            return newState;
          });
        });

      // Title text
      groupG.append('text')
        .attr('x', 30)
        .attr('y', groupHeaderHeight / 2 + 5)
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', 'hsl(var(--foreground))')
        .text(sanitizeForD3Text(group.title, 25));

      // Node count badge and stacked cards preview when collapsed
      if (isCollapsed) {
        const childCount = childNodes.length;
        if (childCount > 0) {
          // Count badge
          groupG.append('text')
            .attr('x', displayWidth - 40)
            .attr('y', groupHeaderHeight / 2 + 4)
            .attr('font-size', '10px')
            .attr('fill', 'hsl(var(--muted-foreground))')
            .text(`${childCount} items`);

          // Stacked card previews (show up to 3 mini cards peeking below header)
          const previewNodes = childNodes.slice(0, 3);
          previewNodes.forEach((node, i) => {
            const offset = i * 4;
            const cardWidth = Math.min(60, displayWidth - 30);
            groupG.append('rect')
              .attr('x', 10 + offset)
              .attr('y', groupHeaderHeight + 2 + i * 3)
              .attr('width', cardWidth)
              .attr('height', 18)
              .attr('rx', 4)
              .attr('fill', 'hsl(var(--card))')
              .attr('stroke', 'hsl(var(--border))')
              .attr('stroke-width', 0.5)
              .attr('opacity', 0.8 - i * 0.2);
          });
        }
      }

      // Double-click to edit group title
      groupG.on('dblclick', (event) => {
        event.stopPropagation();
        const newTitle = window.prompt('Group title:', group.title);
        if (newTitle && newTitle !== group.title) {
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.map(g => g.id === group.id ? { ...g, title: newTitle } : g),
            };
            saveState(newState);
            return newState;
          });
        }
      });

      // Delete button (top right corner)
      const deleteG = groupG.append('g')
        .attr('transform', `translate(${displayWidth - 24}, ${groupHeaderHeight / 2})`)
        .attr('cursor', 'pointer')
        .attr('opacity', 0.4)
        .on('mouseenter', function() { d3.select(this).attr('opacity', 1); })
        .on('mouseleave', function() { d3.select(this).attr('opacity', 0.4); })
        .on('click', (event) => {
          event.stopPropagation();
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.filter(g => g.id !== group.id),
              nodes: prev.nodes.map(n => n.groupId === group.id ? { ...n, groupId: undefined } : n),
            };
            saveState(newState);
            return newState;
          });
        });

      deleteG.append('circle')
        .attr('r', 10)
        .attr('fill', 'hsl(var(--destructive) / 0.15)');

      deleteG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('font-size', '14px')
        .attr('font-weight', '500')
        .attr('fill', 'hsl(var(--destructive))')
        .text('×');

      // Right-click context menu for groups
      groupG.on('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          groupId: group.id,
        });
      });
    });

    // Draw connections first (behind nodes)
    const connectionsGroup = container.append('g').attr('class', 'connections');

    // Use bundled edges when new layout is active
    if (layout && edgeBundles.length > 0) {
      // Render bundled edges with hierarchical bundling
      edgeBundles.forEach(bundle => {
        const bundleGroup = connectionsGroup.append('g')
          .attr('class', 'edge-bundle')
          .attr('data-entity-id', bundle.sourceEntityId);

        bundle.edges.forEach(edge => {
          // Generate bundled path
          const pathD = generateBundledEdgePath(bundle, edge, layout);

          // Calculate opacity based on highlight state
          const edgeOpacity = getEdgeOpacity(edge.connectionId, highlightedEdges, hasAnyHighlight);

          // Check if edge should be filtered out
          const sourceNode = state.nodes.find(n => n.id === bundle.sourceEntityId);
          const targetNode = state.nodes.find(n => n.id === edge.targetNodeId);
          const sourceMatches = sourceNode ? nodeMatchesFilters(sourceNode) : true;
          const targetMatches = targetNode ? nodeMatchesFilters(targetNode) : true;
          const connectionVisible = sourceMatches && targetMatches;

          const pathId = `bundled-path-${edge.connectionId}`;
          const isHighlighted = highlightedEdges.has(edge.connectionId);

          const edgeGroup = bundleGroup.append('g')
            .attr('class', 'bundled-edge')
            .attr('cursor', 'pointer')
            .attr('opacity', connectionVisible ? edgeOpacity : 0.05);

          // Background path for depth
          edgeGroup.append('path')
            .attr('d', pathD)
            .attr('stroke', bundle.color)
            .attr('stroke-width', edge.thickness + 3)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
            .attr('opacity', 0.1);

          // Main path with character color and dialogue-based thickness
          const mainPath = edgeGroup.append('path')
            .attr('id', pathId)
            .attr('class', `connection-path ${isHighlighted ? 'highlighted' : ''}`)
            .attr('d', pathD)
            .attr('stroke', bundle.color)
            .attr('stroke-width', edge.thickness)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
            .style('--connection-accent-color', bundle.color);

          // Add glow effect when highlighted
          if (isHighlighted) {
            mainPath.attr('filter', `drop-shadow(0 0 4px ${bundle.color})`);
          }

          // Hover interactions
          edgeGroup
            .on('mouseenter', function() {
              if (!hasAnyHighlight) {
                d3.select(this).attr('opacity', 1);
                mainPath.attr('filter', `drop-shadow(0 0 4px ${bundle.color})`);
              }
            })
            .on('mouseleave', function() {
              if (!hasAnyHighlight) {
                d3.select(this).attr('opacity', EDGE_OPACITY.default);
                mainPath.attr('filter', null);
              }
            })
            .on('click', () => {
              // Remove connection
              setState(prev => {
                const conn = prev.connections.find(c => c.id === edge.connectionId);
                if (!conn) return prev;
                const newState = {
                  ...prev,
                  connections: prev.connections.filter(c => c.id !== edge.connectionId),
                };
                saveState(newState);
                return newState;
              });
            });
        });
      });
    } else {
      // Fallback: original connection rendering for non-bundled mode
      state.connections.forEach(conn => {
        const sourceNode = state.nodes.find(n => n.id === conn.sourceId);
        const targetNode = state.nodes.find(n => n.id === conn.targetId);
        if (!sourceNode || !targetNode) return;

        // Check if both endpoints match the filter
        const sourceMatches = nodeMatchesFilters(sourceNode);
        const targetMatches = nodeMatchesFilters(targetNode);
        const connectionVisible = sourceMatches && targetMatches;

        // Use proper dimensions for each node type
        const sourceDims = getNodeDimensions(sourceNode);
        const targetDims = getNodeDimensions(targetNode);

        // Connection points at pins (right edge of source, left edge of target)
        const sourceX = sourceNode.x + sourceDims.width;
        const sourceY = sourceNode.y + sourceDims.height / 2;
        const targetX = targetNode.x;
        const targetY = targetNode.y + targetDims.height / 2;

        // Taut thread curve - smooth bezier
        const dx = Math.abs(targetX - sourceX);
        const controlOffset = Math.max(40, dx * 0.3);
        const pathD = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

        // Monochromatic by default, accent color when highlighted
        const mutedColor = 'hsl(var(--muted-foreground))';
        const accentColor = CONNECTION_COLORS[conn.type] || conn.color || CONNECTION_COLORS.custom;

        // Determine visibility: show if showAllLines is on, or if this connection is highlighted
        const isHighlightedConn = highlightedConnections.has(conn.id);
        const shouldShow = showAllLines || isHighlightedConn;

        // Determine opacity based on hover/highlight state
        let connOpacity = 0;
        if (shouldShow && connectionVisible) {
          connOpacity = isHighlightedConn ? 1 : (showAllLines ? 0.25 : 0);
        } else if (!connectionVisible) {
          connOpacity = 0.05;
        }

        const connGroup = connectionsGroup.append('g')
          .attr('class', 'connection')
          .attr('data-conn-id', conn.id)
          .attr('cursor', 'pointer')
          .attr('opacity', connOpacity)
          .on('click', () => {
            setState(prev => {
              const newState = {
                ...prev,
                connections: prev.connections.filter(c => c.id !== conn.id),
              };
              saveState(newState);
              return newState;
            });
          });

        // Background path (thicker, for visual depth)
        const pathId = `path-${conn.id}`;
        connGroup.append('path')
          .attr('d', pathD)
          .attr('stroke', isHighlightedConn ? accentColor : mutedColor)
          .attr('stroke-width', isHighlightedConn ? 6 : 5)
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('opacity', isHighlightedConn ? 0.3 : 0.08);

        // Main connection path
        const mainPath = connGroup.append('path')
          .attr('id', pathId)
          .attr('class', `connection-path ${isHighlightedConn ? 'highlighted' : ''}`)
          .attr('d', pathD)
          .attr('stroke', isHighlightedConn ? accentColor : mutedColor)
          .attr('stroke-width', isHighlightedConn ? 3 : 2)
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .style('--connection-accent-color', accentColor)
          .attr('marker-end', conn.directed ? 'url(#arrow)' : null);

        // Hover: switch to accent color
        mainPath
          .on('mouseenter', function() {
            d3.select(this).attr('stroke', accentColor);
            if (this.parentNode) d3.select(this.parentNode as Element).attr('opacity', 1);
          })
          .on('mouseleave', function() {
            d3.select(this).attr('stroke', isHighlightedConn ? accentColor : mutedColor);
            if (this.parentNode) d3.select(this.parentNode as Element).attr('opacity', connOpacity);
          });

        // Connection label on path (handwritten style)
        if (conn.label) {
          connGroup.append('text')
            .attr('class', 'connection-label-handwritten')
            .attr('dy', -8)
            .attr('font-family', "'Caveat', cursive")
            .attr('font-size', '13px')
            .attr('fill', 'hsl(var(--foreground) / 0.7)')
            .append('textPath')
            .attr('href', `#${pathId}`)
            .attr('startOffset', '50%')
            .attr('text-anchor', 'middle')
            .text(conn.label);
        }
      });
    }

    // Draw nodes
    const nodesGroup = container.append('g').attr('class', 'nodes');

    // Create drag behavior with touch support
    const drag = d3.drag<SVGGElement, TapestryNode>()
      .touchable(() => true)
      .container(function() {
        return container.node() as SVGGElement;
      })
      .subject(function(event, d) {
        return { x: d.x, y: d.y };
      })
      .on('start', function(event, d) {
        event.sourceEvent?.stopPropagation();
        d3.select(this).raise().attr('opacity', 0.95);
        d3.select(this).attr('cursor', 'grabbing');
      })
      .on('drag', function(event, d) {
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);

        // Update all connections involving this node in real-time (thread-like behavior)
        const draggedDims = getNodeDimensions(d);

        state.connections.forEach(conn => {
          if (conn.sourceId !== d.id && conn.targetId !== d.id) return;

          // Get the other node's current position
          const sourceNode = conn.sourceId === d.id ? d : state.nodes.find(n => n.id === conn.sourceId);
          const targetNode = conn.targetId === d.id ? d : state.nodes.find(n => n.id === conn.targetId);
          if (!sourceNode || !targetNode) return;

          const sourceDims = getNodeDimensions(sourceNode as TapestryNode);
          const targetDims = getNodeDimensions(targetNode as TapestryNode);

          // Calculate connection points (right edge of source, left edge of target)
          const sourceX = sourceNode.x + sourceDims.width;
          const sourceY = sourceNode.y + sourceDims.height / 2;
          const targetX = targetNode.x;
          const targetY = targetNode.y + targetDims.height / 2;

          // Taut thread curve - smooth bezier
          const dx = Math.abs(targetX - sourceX);
          const controlOffset = Math.max(40, dx * 0.3);
          const pathD = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

          // Update all path elements for this connection
          connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
        });
      })
      .on('end', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('cursor', 'grab');

        // Check if node was dropped into a group
        const nodeDims = getNodeDimensions(d);
        const nodeCenterX = d.x + nodeDims.width / 2;
        const nodeCenterY = d.y + nodeDims.height / 2;

        let newGroupId: string | undefined = undefined;

        // Find if node center is inside any group bounds
        for (const group of state.groups) {
          // Calculate group bounds from child nodes or use stored position
          const childNodes = state.nodes.filter(n => n.groupId === group.id && n.id !== d.id);
          let groupX = group.x || 0;
          let groupY = group.y || 0;
          let groupWidth = group.width || DEFAULT_GROUP_WIDTH;
          let groupHeight = group.height || DEFAULT_GROUP_HEIGHT;

          if (childNodes.length > 0) {
            const minX = Math.min(...childNodes.map(n => n.x));
            const minY = Math.min(...childNodes.map(n => n.y));
            const maxX = Math.max(...childNodes.map(n => n.x + (n.width || DEFAULT_NOTE_WIDTH)));
            const maxY = Math.max(...childNodes.map(n => n.y + (n.height || DEFAULT_NOTE_HEIGHT)));
            groupX = minX - 20;
            groupY = minY - 42;
            groupWidth = maxX - minX + 40;
            groupHeight = maxY - minY + 62;
          }

          // Check if node center is inside this group
          if (nodeCenterX >= groupX && nodeCenterX <= groupX + groupWidth &&
              nodeCenterY >= groupY && nodeCenterY <= groupY + groupHeight) {
            newGroupId = group.id;
            break;
          }
        }

        setState(prev => {
          const currentNode = prev.nodes.find(n => n.id === d.id);
          const oldGroupId = currentNode?.groupId;

          const newState = {
            ...prev,
            nodes: prev.nodes.map(n => n.id === d.id
              ? { ...n, x: d.x, y: d.y, groupId: newGroupId }
              : n
            ),
          };
          saveState(newState);
          return newState;
        });
      });

    // Load index cards for scene status display
    const indexCards = loadIndexCards(screenplayId);
    const cardsBySceneId = new Map(indexCards.map(c => [c.sceneId, c]));

    // Render each node
    state.nodes.forEach(node => {
      // Skip nodes in collapsed groups
      if (node.groupId) {
        const parentGroup = state.groups.find(g => g.id === node.groupId);
        if (parentGroup?.collapsed) return;
      }

      const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
      const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;
      const nodeType = node.type || 'note';
      const matchesFilter = nodeMatchesFilters(node);

      // Slight rotation for organic feel (±2 degrees, seeded by node id)
      const rotationSeed = node.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const rotation = ((rotationSeed % 100) / 100 - 0.5) * 4;

      // Monochromatic header - accent on selection/hover
      const accentColor = nodeType === 'scene' ? NODE_TYPE_COLORS.scene : (node.color || NODE_TYPE_COLORS[nodeType]);
      const mutedHeaderColor = 'hsl(var(--muted))';
      const isSelected = selectedNode === node.id;

      // Determine if this node is highlighted from hover
      const isNodeHighlighted = highlightedNodeIds.has(node.id);
      const hasActiveHover = hoveredNodeId !== null;

      const nodeGroup = nodesGroup.append('g')
        .datum(node)
        .attr('class', `node ${nodeType === 'character' ? 'polaroid-node' : ''} ${isSelected ? 'selected' : ''} ${isNodeHighlighted ? 'highlighted' : ''}`)
        .attr('data-node-id', node.id)
        .attr('transform', `translate(${node.x}, ${node.y}) rotate(${rotation}, ${nodeWidth/2}, ${nodeHeight/2})`)
        .attr('cursor', 'grab')
        .attr('opacity', matchesFilter ? (hasActiveHover && !isNodeHighlighted ? 0.3 : 1) : 0.2)
        .call(drag)
        .on('mouseenter', () => setHoveredNodeId(node.id))
        .on('mouseleave', () => setHoveredNodeId(null));

      // ========== POLAROID STYLE FOR CHARACTER NODES ==========
      if (nodeType === 'character') {
        const polaroidWidth = DEFAULT_CHARACTER_WIDTH;
        const polaroidHeight = DEFAULT_CHARACTER_HEIGHT;
        const portraitHeight = polaroidHeight - 60; // Space for name and stats
        const borderPadding = 8;

        // Get initials for avatar
        const initials = node.title
          .split(' ')
          .slice(0, 2)
          .map(w => w[0])
          .join('')
          .toUpperCase();

        // Polaroid frame - uses card background for theme compatibility
        nodeGroup.append('rect')
          .attr('class', 'polaroid-frame node-bg')
          .attr('width', polaroidWidth)
          .attr('height', polaroidHeight)
          .attr('rx', 6)
          .attr('fill', 'hsl(var(--card))')
          .attr('stroke', isSelected ? accentColor : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 2 : 1)
          .attr('filter', 'url(#node-shadow)');

        // Portrait area (colored background with initials)
        nodeGroup.append('rect')
          .attr('class', 'polaroid-portrait')
          .attr('x', borderPadding)
          .attr('y', borderPadding)
          .attr('width', polaroidWidth - borderPadding * 2)
          .attr('height', portraitHeight)
          .attr('rx', 2)
          .attr('fill', node.color || NODE_TYPE_COLORS.character);

        // Initials in portrait
        nodeGroup.append('text')
          .attr('x', polaroidWidth / 2)
          .attr('y', borderPadding + portraitHeight / 2 + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', '32px')
          .attr('font-weight', '700')
          .attr('fill', 'white')
          .attr('opacity', 0.9)
          .text(initials);

        // Character name (handwritten style)
        nodeGroup.append('text')
          .attr('class', 'polaroid-name node-title')
          .attr('x', polaroidWidth / 2)
          .attr('y', portraitHeight + borderPadding + 24)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'Caveat', cursive")
          .attr('font-size', '16px')
          .attr('font-weight', '600')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(node.title || 'Untitled', 14));

        // Stats line (dialogue count)
        const dialogueText = `${node.dialogueCount || 0} lines`;
        nodeGroup.append('text')
          .attr('class', 'polaroid-stats')
          .attr('x', polaroidWidth / 2)
          .attr('y', portraitHeight + borderPadding + 42)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'Caveat', cursive")
          .attr('font-size', '12px')
          .attr('fill', 'hsl(var(--muted-foreground))')
          .text(dialogueText);

        // Pin indicator if pinned
        if (node.pinned) {
          nodeGroup.append('circle')
            .attr('class', 'node-pinned-indicator')
            .attr('cx', polaroidWidth - 12)
            .attr('cy', 12)
            .attr('r', 6)
            .attr('fill', 'hsl(var(--primary))');
          nodeGroup.append('text')
            .attr('x', polaroidWidth - 12)
            .attr('y', 16)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('fill', 'white')
            .text('📌');
        }

        // Connection pins (smaller for polaroid)
        nodeGroup.append('circle')
          .attr('class', 'node-pin')
          .attr('cx', 0)
          .attr('cy', polaroidHeight / 2)
          .attr('r', 5)
          .attr('fill', accentColor)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        nodeGroup.append('circle')
          .attr('class', 'node-pin')
          .attr('cx', polaroidWidth)
          .attr('cy', polaroidHeight / 2)
          .attr('r', 5)
          .attr('fill', accentColor)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        // Hover effect
        nodeGroup
          .on('mouseenter', function() {
            if (selectedNode !== node.id) {
              d3.select(this).select('.polaroid-frame')
                .attr('stroke', accentColor)
                .attr('stroke-width', 2);
            }
          })
          .on('mouseleave', function() {
            if (selectedNode !== node.id) {
              d3.select(this).select('.polaroid-frame')
                .attr('stroke', 'hsl(var(--border))')
                .attr('stroke-width', 1);
            }
          });

      } else {
        // ========== STANDARD NODE RENDERING ==========
        const headerHeight = 24;

        // Node background with soft shadow (procreate style)
        nodeGroup.append('rect')
          .attr('class', 'node-bg')
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('rx', 8)
          .attr('fill', 'hsl(var(--card))')
          .attr('stroke', isSelected ? accentColor : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 2 : 1)
          .attr('filter', 'url(#node-shadow)');

      // Header bar - monochromatic by default, accent when selected
      nodeGroup.append('rect')
        .attr('class', 'node-header')
        .attr('width', nodeWidth)
        .attr('height', headerHeight)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', isSelected ? accentColor : mutedHeaderColor);

      // Square off bottom corners of header
      nodeGroup.append('rect')
        .attr('class', 'node-header-bottom')
        .attr('y', 8)
        .attr('width', nodeWidth)
        .attr('height', headerHeight - 8)
        .attr('fill', isSelected ? accentColor : mutedHeaderColor);

      // Type icon in header
      nodeGroup.append('text')
        .attr('class', 'node-type-icon')
        .attr('x', 8)
        .attr('y', headerHeight / 2 + 4)
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', isSelected ? 'white' : 'hsl(var(--muted-foreground))')
        .text(NODE_TYPE_ICONS[nodeType]);

      // Title in header (shorter for scenes to make room for time icon)
      const titleMaxChars = nodeType === 'scene' && node.timeOfDay ? 18 : 22;
      nodeGroup.append('text')
        .attr('class', 'node-title')
        .attr('x', 22)
        .attr('y', headerHeight / 2 + 4)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', isSelected ? 'white' : 'hsl(var(--foreground))')
        .text(sanitizeForD3Text(node.title || 'Untitled', titleMaxChars));

      // Hover behavior for monochromatic nodes
      nodeGroup
        .on('mouseenter', function() {
          if (selectedNode !== node.id) {
            d3.select(this).select('.node-header').attr('fill', accentColor);
            d3.select(this).select('.node-header-bottom').attr('fill', accentColor);
            d3.select(this).select('.node-type-icon').attr('fill', 'white');
            d3.select(this).select('.node-title').attr('fill', 'white');
            d3.select(this).select('.time-icon').attr('fill', 'white');
            d3.select(this).select('.node-bg').attr('stroke', accentColor);
          }
        })
        .on('mouseleave', function() {
          if (selectedNode !== node.id) {
            d3.select(this).select('.node-header').attr('fill', mutedHeaderColor);
            d3.select(this).select('.node-header-bottom').attr('fill', mutedHeaderColor);
            d3.select(this).select('.node-type-icon').attr('fill', 'hsl(var(--muted-foreground))');
            d3.select(this).select('.node-title').attr('fill', 'hsl(var(--foreground))');
            d3.select(this).select('.time-icon').attr('fill', 'hsl(var(--muted-foreground))');
            d3.select(this).select('.node-bg').attr('stroke', 'hsl(var(--border))');
          }
        });

      // Time of day icon for scene nodes (in header, right side)
      if (nodeType === 'scene' && node.timeOfDay) {
        const normalizedTime = normalizeTimeOfDay(node.timeOfDay);
        const timeIcon = TIME_ICONS[normalizedTime] || TIME_ICONS.DAY;
        nodeGroup.append('text')
          .attr('class', 'time-icon')
          .attr('x', nodeWidth - 18)
          .attr('y', headerHeight / 2 + 4)
          .attr('font-size', '11px')
          .attr('fill', isSelected ? 'white' : 'hsl(var(--muted-foreground))')
          .text(timeIcon);
      }

      // Content area (3 lines max for cleaner look)
      const contentLines = wrapText(node.content || '', 28);
      contentLines.slice(0, 3).forEach((line, i) => {
        nodeGroup.append('text')
          .attr('x', 10)
          .attr('y', headerHeight + 16 + i * 14)
          .attr('font-size', '10px')
          .attr('fill', 'hsl(var(--card-foreground) / 0.8)')
          .text(sanitizeForD3Text(line, 30));
      });

      // Status badge for scene nodes (bottom of card)
      if (nodeType === 'scene' && node.sceneId) {
        const card = cardsBySceneId.get(node.sceneId);
        const status = card?.status || 'draft';
        const statusColor = STATUS_COLORS[status] || STATUS_COLORS.draft;
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

        // Status badge (pill shape)
        const badgeWidth = 48;
        const badgeHeight = 14;
        const badgeG = nodeGroup.append('g')
          .attr('transform', `translate(8, ${nodeHeight - badgeHeight - 6})`);

        badgeG.append('rect')
          .attr('width', badgeWidth)
          .attr('height', badgeHeight)
          .attr('rx', badgeHeight / 2)
          .attr('fill', `${statusColor}20`)
          .attr('stroke', statusColor)
          .attr('stroke-width', 1);

        badgeG.append('text')
          .attr('x', badgeWidth / 2)
          .attr('y', badgeHeight / 2 + 3)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('font-weight', '500')
          .attr('fill', statusColor)
          .text(statusLabel);

        // Location label (right side)
        const scene = scenes.find(s => s.id === node.sceneId);
        if (scene?.location?.name) {
          const locationName = scene.location.name.length > 12
            ? scene.location.name.slice(0, 11) + '…'
            : scene.location.name;
          nodeGroup.append('text')
            .attr('x', nodeWidth - 10)
            .attr('y', nodeHeight - 10)
            .attr('text-anchor', 'end')
            .attr('font-size', '8px')
            .attr('fill', 'hsl(var(--muted-foreground))')
            .text(locationName);
        }
      }

      // Larger pins for thread-like connections (6px radius) - non-character nodes
      // Input pin (left side)
      nodeGroup.append('circle')
        .attr('class', 'node-pin')
        .attr('cx', 0)
        .attr('cy', nodeHeight / 2)
        .attr('r', 6)
        .attr('fill', accentColor)
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', 2);

      // Output pin (right side)
      nodeGroup.append('circle')
        .attr('class', 'node-pin')
        .attr('cx', nodeWidth)
        .attr('cy', nodeHeight / 2)
        .attr('r', 6)
        .attr('fill', accentColor)
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', 2);
      } // End else (standard node rendering)

      // Click handlers
      nodeGroup.on('click', (event) => {
        event.stopPropagation();
        const now = Date.now();

        // Double-tap detection
        if (lastTapRef.current &&
            lastTapRef.current.nodeId === node.id &&
            now - lastTapRef.current.time < 300) {
          lastTapRef.current = null;
          setEditingNode(node);
          return;
        }

        lastTapRef.current = { nodeId: node.id, time: now };

        if (isConnecting && connectingFrom) {
          if (connectingFrom !== node.id) {
            setState(prev => {
              const exists = prev.connections.some(
                c => (c.sourceId === connectingFrom && c.targetId === node.id) ||
                     (c.sourceId === node.id && c.targetId === connectingFrom)
              );
              if (exists) return prev;

              const newState = {
                ...prev,
                connections: [...prev.connections, createConnection(connectingFrom, node.id)],
              };
              saveState(newState);
              return newState;
            });
          }
          setIsConnecting(false);
          setConnectingFrom(null);
        } else {
          setSelectedNode(node.id);
          // Open profile panel for character nodes
          if (node.type === 'character') {
            setProfileCharacter(node);
          } else if (node.sceneId && onSceneClick) {
            onSceneClick(node.sceneId);
          }
        }
      });

      nodeGroup.on('dblclick', (event) => {
        event.stopPropagation();
        // Double-click on character opens profile panel
        if (node.type === 'character') {
          setProfileCharacter(node);
        } else {
          setEditingNode(node);
        }
      });

      // Right-click context menu for nodes
      nodeGroup.on('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id,
        });
        setSelectedNode(node.id);
      });
    });

    // Group controls overlay (rendered ON TOP of nodes for interactivity)
    const groupControlsOverlay = container.append('g').attr('class', 'group-controls-overlay');

    state.groups.forEach(group => {
      const isCollapsed = group.collapsed || false;
      const childNodes = state.nodes.filter(n => n.groupId === group.id);

      // Calculate group position from child nodes
      let groupX = group.x;
      let groupY = group.y;
      let displayWidth = group.width;

      if (childNodes.length > 0) {
        const minX = Math.min(...childNodes.map(n => n.x));
        const maxX = Math.max(...childNodes.map(n => n.x + (n.width || DEFAULT_NOTE_WIDTH)));
        const minY = Math.min(...childNodes.map(n => n.y));
        groupX = minX - 20; // groupPadding
        groupY = minY - 32 - 10; // groupHeaderHeight + offset
        displayWidth = maxX - minX + 40;
      }

      const controlsG = groupControlsOverlay.append('g')
        .attr('class', 'group-controls')
        .attr('data-group-id', group.id)
        .attr('transform', `translate(${groupX}, ${groupY})`);

      // Drag handle covering the header - slightly visible for affordance
      const dragHandle = controlsG.append('rect')
        .attr('class', 'group-drag-handle')
        .attr('width', displayWidth)
        .attr('height', 32)
        .attr('fill', 'rgba(255,255,255,0.01)')
        .attr('stroke', 'none')
        .attr('cursor', 'grab')
        .style('pointer-events', 'all');

      // Store positions for this group's drag
      let dragStartX = groupX;
      let dragStartY = groupY;

      const groupDragBehavior = d3.drag<SVGRectElement, unknown>()
        .container(function() { return container.node() as SVGGElement; })
        .on('start', function(event) {
          event.sourceEvent?.stopPropagation();
          d3.select(this).attr('cursor', 'grabbing');
          const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
          groupEl.raise().attr('opacity', 0.85);
          // Store starting position
          dragStartX = groupX;
          dragStartY = groupY;
        })
        .on('drag', function(event) {
          const dx = event.dx;
          const dy = event.dy;
          dragStartX += dx;
          dragStartY += dy;

          // Update group background position
          const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
          groupEl.attr('transform', `translate(${dragStartX}, ${dragStartY})`);

          // Update this control overlay position
          d3.select(this.parentNode as Element).attr('transform', `translate(${dragStartX}, ${dragStartY})`);

          // Move child nodes visually and track their new positions
          const childNodePositions = new Map<string, {x: number, y: number}>();
          state.nodes.filter(n => n.groupId === group.id).forEach(node => {
            const nodeEl = nodesGroup.select(`[data-node-id="${node.id}"]`);
            const nodeTransform = nodeEl.attr('transform');
            const nodeMatch = nodeTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (nodeMatch) {
              const nodeX = parseFloat(nodeMatch[1]) + dx;
              const nodeY = parseFloat(nodeMatch[2]) + dy;
              // Preserve rotation if present
              const rotationMatch = nodeTransform?.match(/rotate\([^)]+\)/);
              const rotation = rotationMatch ? ' ' + rotationMatch[0] : '';
              nodeEl.attr('transform', `translate(${nodeX}, ${nodeY})${rotation}`);
              childNodePositions.set(node.id, {x: nodeX, y: nodeY});
            }
          });

          // Update connections for moved nodes
          state.connections.forEach(conn => {
            const sourceInGroup = childNodePositions.has(conn.sourceId);
            const targetInGroup = childNodePositions.has(conn.targetId);
            if (!sourceInGroup && !targetInGroup) return;

            const sourceNode = state.nodes.find(n => n.id === conn.sourceId);
            const targetNode = state.nodes.find(n => n.id === conn.targetId);
            if (!sourceNode || !targetNode) return;

            // Get positions - from map if in group, otherwise from DOM
            let sX: number, sY: number, tX: number, tY: number;

            if (sourceInGroup) {
              const pos = childNodePositions.get(conn.sourceId)!;
              sX = pos.x;
              sY = pos.y;
            } else {
              const sourceEl = nodesGroup.select(`[data-node-id="${sourceNode.id}"]`);
              const sourceTransform = sourceEl.attr('transform');
              const sourceMatch = sourceTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (!sourceMatch) return;
              sX = parseFloat(sourceMatch[1]);
              sY = parseFloat(sourceMatch[2]);
            }

            if (targetInGroup) {
              const pos = childNodePositions.get(conn.targetId)!;
              tX = pos.x;
              tY = pos.y;
            } else {
              const targetEl = nodesGroup.select(`[data-node-id="${targetNode.id}"]`);
              const targetTransform = targetEl.attr('transform');
              const targetMatch = targetTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (!targetMatch) return;
              tX = parseFloat(targetMatch[1]);
              tY = parseFloat(targetMatch[2]);
            }

            const sourceDims = getNodeDimensions(sourceNode);
            const targetDims = getNodeDimensions(targetNode);

            const srcX = sX + sourceDims.width;
            const srcY = sY + sourceDims.height / 2;
            const tgtX = tX;
            const tgtY = tY + targetDims.height / 2;

            const pathDx = Math.abs(tgtX - srcX);
            const controlOffset = Math.max(40, pathDx * 0.3);
            const pathD = `M ${srcX} ${srcY} C ${srcX + controlOffset} ${srcY}, ${tgtX - controlOffset} ${tgtY}, ${tgtX} ${tgtY}`;

            connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
          });
        })
        .on('end', function() {
          d3.select(this).attr('cursor', 'grab');
          const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
          groupEl.attr('opacity', 1);

          // Calculate how much the group moved from original state positions
          const childNodes = state.nodes.filter(n => n.groupId === group.id);
          let originalX = group.x;
          let originalY = group.y;

          if (childNodes.length > 0) {
            const minX = Math.min(...childNodes.map(n => n.x));
            const minY = Math.min(...childNodes.map(n => n.y));
            originalX = minX - 20;
            originalY = minY - 42;
          }

          const dx = dragStartX - originalX;
          const dy = dragStartY - originalY;

          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            setState(prev => {
              const newState = {
                ...prev,
                groups: prev.groups.map(g => g.id === group.id ? { ...g, x: dragStartX, y: dragStartY } : g),
                nodes: prev.nodes.map(n =>
                  n.groupId === group.id ? { ...n, x: n.x + dx, y: n.y + dy } : n
                ),
              };
              saveState(newState);
              return newState;
            });
          }
        });

      dragHandle.call(groupDragBehavior);

      // Collapse toggle (on top, clickable)
      controlsG.append('text')
        .attr('class', 'collapse-toggle-overlay')
        .attr('x', 14)
        .attr('y', 32 / 2 + 5)
        .attr('font-size', '10px')
        .attr('fill', 'hsl(var(--muted-foreground))')
        .attr('cursor', 'pointer')
        .attr('pointer-events', 'all')
        .text(isCollapsed ? '▶' : '▼')
        .on('click', (event) => {
          event.stopPropagation();
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.map(g =>
                g.id === group.id ? { ...g, collapsed: !g.collapsed } : g
              ),
            };
            saveState(newState);
            return newState;
          });
        });

      // Delete button overlay
      const deleteG = controlsG.append('g')
        .attr('transform', `translate(${displayWidth - 24}, ${32 / 2})`)
        .attr('cursor', 'pointer')
        .attr('opacity', 0.4)
        .on('mouseenter', function() { d3.select(this).attr('opacity', 1); })
        .on('mouseleave', function() { d3.select(this).attr('opacity', 0.4); })
        .on('click', (event) => {
          event.stopPropagation();
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.filter(g => g.id !== group.id),
              nodes: prev.nodes.map(n => n.groupId === group.id ? { ...n, groupId: undefined } : n),
            };
            saveState(newState);
            return newState;
          });
        });

      deleteG.append('circle')
        .attr('r', 10)
        .attr('fill', 'hsl(var(--destructive) / 0.15)');

      deleteG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('font-size', '14px')
        .attr('font-weight', '500')
        .attr('fill', 'hsl(var(--destructive))')
        .text('×');
    });

    // Click on canvas
    svg.on('click', () => {
      if (isConnecting) {
        setIsConnecting(false);
        setConnectingFrom(null);
      }
      setSelectedNode(null);
      setContextMenu(null);
    });

    return () => {
      svg.on('.zoom', null);
      svg.on('click', null);
      svg.selectAll('*').remove();
    };
  }, [state.nodes, state.connections, state.groups, dimensions, isConnecting, connectingFrom, selectedNode, saveState, onSceneClick, nodeMatchesFilters, layout, edgeBundles, highlightedEdges, hasAnyHighlight, showAllLines, hoveredNodeId, highlightedConnections, highlightedNodeIds]);

  // Add new node of specified type
  const handleAddNode = useCallback((type: TapestryNodeType) => {
    const centerX = dimensions.width / 2 - DEFAULT_NOTE_WIDTH / 2;
    const centerY = dimensions.height / 2 - DEFAULT_NOTE_HEIGHT / 2;

    const adjustedX = (centerX - transformRef.current.x) / transformRef.current.k;
    const adjustedY = (centerY - transformRef.current.y) / transformRef.current.k;

    const typeLabels: Record<TapestryNodeType, string> = {
      note: 'New Note',
      scene: 'New Scene',
      character: 'New Character',
      location: 'New Location',
      item: 'New Item',
    };

    const newNode = createNode({
      type,
      x: adjustedX + Math.random() * 50 - 25,
      y: adjustedY + Math.random() * 50 - 25,
      title: typeLabels[type],
      content: '',
    });

    setState(prev => {
      const newState = { ...prev, nodes: [...prev.nodes, newNode] };
      saveState(newState);
      return newState;
    });
    setSelectedNode(newNode.id);
  }, [dimensions, saveState]);

  // Add new group
  const handleAddGroup = useCallback(() => {
    const centerX = dimensions.width / 2 - DEFAULT_GROUP_WIDTH / 2;
    const centerY = dimensions.height / 2 - DEFAULT_GROUP_HEIGHT / 2;

    const adjustedX = (centerX - transformRef.current.x) / transformRef.current.k;
    const adjustedY = (centerY - transformRef.current.y) / transformRef.current.k;

    const newGroup = createGroup({
      x: adjustedX + Math.random() * 50 - 25,
      y: adjustedY + Math.random() * 50 - 25,
      title: 'New Group',
    });

    setState(prev => {
      const newState = { ...prev, groups: [...prev.groups, newGroup] };
      saveState(newState);
      return newState;
    });
  }, [dimensions, saveState]);

  // Auto-cluster nodes using D3 force simulation
  const handleAutoCluster = useCallback(() => {
    if (state.nodes.length === 0) return;

    // Create a copy of nodes for simulation
    const simulationNodes = state.nodes.map(node => ({
      ...node,
      fx: node.pinned ? node.x : undefined,
      fy: node.pinned ? node.y : undefined,
    }));

    // Create links from connections
    const links = state.connections.map(conn => ({
      source: conn.sourceId,
      target: conn.targetId,
    }));

    // Run force simulation
    const simulation = d3.forceSimulation(simulationNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(180)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(100))
      .stop();

    // Run simulation for a fixed number of ticks
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    // Update node positions
    setState(prev => {
      const newNodes = prev.nodes.map(node => {
        if (node.pinned) return node;
        const simNode = simulationNodes.find(n => n.id === node.id);
        if (simNode) {
          return {
            ...node,
            x: (simNode as any).x || node.x,
            y: (simNode as any).y || node.y,
          };
        }
        return node;
      });

      const newState = { ...prev, nodes: newNodes };
      saveState(newState);
      return newState;
    });
  }, [state.nodes, state.connections, dimensions, saveState]);

  // Barycenter sorting - reorders scene Y positions to minimize line crossings
  const handleBarycenterSort = useCallback(() => {
    if (state.nodes.length === 0) return;

    // Get character and scene nodes
    const characterNodes = state.nodes.filter(n => n.type === 'character');
    const sceneNodes = state.nodes.filter(n => n.type === 'scene' && !n.pinned);

    if (characterNodes.length === 0 || sceneNodes.length === 0) return;

    // Build character positions map
    const charYPositions = new Map(characterNodes.map(c => [c.id, c.y]));

    // Calculate barycenter for each scene (average Y of connected characters)
    const sceneBarycenters: Array<{ node: TapestryNode; barycenter: number }> = [];

    sceneNodes.forEach(scene => {
      // Find all characters connected to this scene
      const connectedCharIds = state.connections
        .filter(c => c.targetId === scene.id || c.sourceId === scene.id)
        .map(c => c.sourceId === scene.id ? c.targetId : c.sourceId)
        .filter(id => charYPositions.has(id));

      if (connectedCharIds.length === 0) {
        // No connections - keep original position
        sceneBarycenters.push({ node: scene, barycenter: scene.y });
      } else {
        // Calculate average Y of connected characters
        const avgY = connectedCharIds.reduce((sum, id) => sum + (charYPositions.get(id) || 0), 0) / connectedCharIds.length;
        sceneBarycenters.push({ node: scene, barycenter: avgY });
      }
    });

    // Sort scenes by barycenter
    sceneBarycenters.sort((a, b) => a.barycenter - b.barycenter);

    // Group scenes by their current groupId (act)
    const scenesByGroup = new Map<string | undefined, typeof sceneBarycenters>();
    sceneBarycenters.forEach(item => {
      const groupId = item.node.groupId;
      if (!scenesByGroup.has(groupId)) scenesByGroup.set(groupId, []);
      scenesByGroup.get(groupId)!.push(item);
    });

    // Re-position scenes within each group, maintaining their X positions
    const updatedNodes = new Map<string, { x: number; y: number }>();

    scenesByGroup.forEach((groupScenes, groupId) => {
      // Sort this group's scenes by barycenter
      groupScenes.sort((a, b) => a.barycenter - b.barycenter);

      // Find the Y range for this group
      const groupYs = groupScenes.map(s => s.node.y);
      const minY = Math.min(...groupYs);
      const sceneHeight = DEFAULT_NOTE_HEIGHT;
      const spacing = sceneHeight + 40;

      // Re-assign Y positions in barycenter order
      groupScenes.forEach((item, i) => {
        updatedNodes.set(item.node.id, {
          x: item.node.x, // Keep X position
          y: minY + i * spacing, // New Y based on barycenter order
        });
      });
    });

    // Apply updates
    setState(prev => {
      const newNodes = prev.nodes.map(node => {
        const update = updatedNodes.get(node.id);
        if (update) {
          return { ...node, x: update.x, y: update.y };
        }
        return node;
      });

      const newState = { ...prev, nodes: newNodes };
      saveState(newState);
      return newState;
    });
  }, [state.nodes, state.connections, saveState]);

  const handleToggleLines = useCallback(() => {
    setShowAllLines(prev => !prev);
  }, []);

  // Start connecting
  const handleStartConnect = useCallback(() => {
    if (selectedNode) {
      setIsConnecting(true);
      setConnectingFrom(selectedNode);
    }
  }, [selectedNode]);

  // Delete selected node
  const handleDeleteNote = useCallback(() => {
    if (!selectedNode) return;

    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== selectedNode),
        connections: prev.connections.filter(c => c.sourceId !== selectedNode && c.targetId !== selectedNode),
      };
      saveState(newState);
      return newState;
    });
    setSelectedNode(null);
  }, [selectedNode, saveState]);

  // Save edited node
  const handleSaveNote = useCallback((updatedNode: TapestryNode) => {
    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n),
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  // Delete node from dialog
  const handleDeleteNoteFromDialog = useCallback((nodeId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== nodeId),
        connections: prev.connections.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId),
      };
      saveState(newState);
      return newState;
    });
    setSelectedNode(null);
    setEditingNode(null);
  }, [saveState]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  // Reset layout to regenerate from scratch
  const handleResetLayout = useCallback(() => {
    const storageKey = getTapestryStorageKey(screenplayId);
    localStorage.removeItem(storageKey);
    setState(createEmptyTapestry());
    transformRef.current = d3.zoomIdentity;
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, [screenplayId]);

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <TapestryToolbar
          onAddNode={handleAddNode}
          onAddGroup={handleAddGroup}
          onStartConnect={handleStartConnect}
          onDeleteNode={handleDeleteNote}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onResetLayout={handleResetLayout}
          onAutoCluster={handleAutoCluster}
          onBarycenterSort={handleBarycenterSort}
          onToggleLines={handleToggleLines}
          showAllLines={showAllLines}
          hasSelectedNode={!!selectedNode}
          isConnecting={isConnecting}
          filters={filters}
          onFiltersChange={setFilters}
          availableCharacters={availableCharacters}
        />

        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full touch-none"
          style={{ touchAction: 'none' }}
          role="img"
          aria-label={`Tapestry board for ${screenplayTitle}`}
        >
          <title>Tapestry - {screenplayTitle}</title>
          {/* SVG filters for soft shadows (procreate style) */}
          <defs>
            <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
            </filter>
          </defs>
        </svg>

        {/* Paper texture overlay (procreate style) */}
        <PaperNoise opacity={0.025} intensity={0.15} />


        {/* Minimap for navigation */}
        {layout && (
          <Minimap
            layout={layout}
            bundles={edgeBundles}
            viewport={{
              x: transformRef.current.x,
              y: transformRef.current.y,
              width: dimensions.width,
              height: dimensions.height,
              scale: transformRef.current.k,
            }}
            onViewportChange={(x, y) => {
              if (svgRef.current && zoomRef.current) {
                const newTransform = d3.zoomIdentity.translate(x, y).scale(transformRef.current.k);
                d3.select(svgRef.current)
                  .transition()
                  .duration(300)
                  .call(zoomRef.current.transform, newTransform);
              }
            }}
          />
        )}

        {state.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-card/80 backdrop-blur rounded-lg border border-border/60 p-8">
              <p className="text-lg font-semibold text-foreground">Your tapestry is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add notes or scenes will auto-import from your screenplay
              </p>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">
            Click another node to connect, or click canvas to cancel
          </div>
        )}
      </div>

      {/* Node Editor Dialog */}
      <NoteEditorDialog
        note={editingNode}
        open={!!editingNode}
        onOpenChange={(open) => !open && setEditingNode(null)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNoteFromDialog}
      />

      {/* Character Profile Panel */}
      {profileCharacter && (
        <CharacterProfilePanel
          character={profileCharacter}
          connections={state.connections}
          allNodes={state.nodes}
          onClose={() => setProfileCharacter(null)}
          onUpdate={(updated) => {
            handleSaveNote(updated);
            setProfileCharacter(updated);
          }}
          onNavigateToScene={onSceneClick}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.nodeId
              ? [
                  {
                    label: 'Edit',
                    action: () => {
                      const node = state.nodes.find(n => n.id === contextMenu.nodeId);
                      if (node) setEditingNode(node);
                    },
                  },
                  {
                    label: 'Connect',
                    action: () => {
                      if (contextMenu.nodeId) {
                        setSelectedNode(contextMenu.nodeId);
                        setIsConnecting(true);
                        setConnectingFrom(contextMenu.nodeId);
                      }
                    },
                  },
                  { label: '', action: () => {}, separator: true },
                  {
                    label: 'Delete',
                    action: () => {
                      if (contextMenu.nodeId) {
                        const nodeId = contextMenu.nodeId;
                        setState(prev => {
                          const newState = {
                            ...prev,
                            nodes: prev.nodes.filter(n => n.id !== nodeId),
                            connections: prev.connections.filter(
                              c => c.sourceId !== nodeId && c.targetId !== nodeId
                            ),
                          };
                          saveState(newState);
                          return newState;
                        });
                        setSelectedNode(null);
                      }
                    },
                    destructive: true,
                  },
                ]
              : contextMenu.groupId
                ? [
                    {
                      label: 'Rename',
                      action: () => {
                        const group = state.groups.find(g => g.id === contextMenu.groupId);
                        if (group) {
                          const newTitle = window.prompt('Group title:', group.title);
                          if (newTitle && newTitle !== group.title) {
                            setState(prev => {
                              const newState = {
                                ...prev,
                                groups: prev.groups.map(g =>
                                  g.id === contextMenu.groupId ? { ...g, title: newTitle } : g
                                ),
                              };
                              saveState(newState);
                              return newState;
                            });
                          }
                        }
                      },
                    },
                    {
                      label: state.groups.find(g => g.id === contextMenu.groupId)?.collapsed
                        ? 'Expand'
                        : 'Collapse',
                      action: () => {
                        setState(prev => {
                          const newState = {
                            ...prev,
                            groups: prev.groups.map(g =>
                              g.id === contextMenu.groupId ? { ...g, collapsed: !g.collapsed } : g
                            ),
                          };
                          saveState(newState);
                          return newState;
                        });
                      },
                    },
                    { label: '', action: () => {}, separator: true },
                    {
                      label: 'Delete Group',
                      action: () => {
                        if (contextMenu.groupId) {
                          const groupId = contextMenu.groupId;
                          setState(prev => {
                            const newState = {
                              ...prev,
                              groups: prev.groups.filter(g => g.id !== groupId),
                              nodes: prev.nodes.map(n =>
                                n.groupId === groupId ? { ...n, groupId: undefined } : n
                              ),
                            };
                            saveState(newState);
                            return newState;
                          });
                        }
                      },
                      destructive: true,
                    },
                  ]
                : []
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// Helper: Wrap text
function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return lines;
}
