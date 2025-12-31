'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTapestryHistory } from '@/hooks/tapestry/use-tapestry-history';
import * as d3 from 'd3';
import { ZoomBehavior, ZoomTransform, zoomIdentity } from 'd3-zoom';
import {
  TapestryNode,
  TapestryConnection,
  TapestryGroup,
  TapestryState,
  TapestryNodeType,
  ConnectionType,
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
  GRID_MAJOR_SPACING,
  GRID_MINOR_SPACING,
  NODE_TYPE_COLORS,
  NOTE_COLORS,
  CONNECTION_COLORS,
  STATUS_COLORS,
  TIME_ICONS,
  CONNECTION_TYPE_LABELS,
} from '@/types/tapestry';
import { normalizeTimeOfDay } from '@/lib/prosemirror/utils/time-detection';
import '@/styles/tapestry.css';
import { TapestryToolbar } from './tapestry-toolbar';
import { NoteEditorDialog } from './note-editor-dialog';
import { createDefaultFilters, type TapestryFilters } from './filter-panel';
import { ContextMenu, type ContextMenuItem } from './context-menu';
import { Input } from '@/components/ui/input';
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

// Check if a node intersects with marquee selection rectangle
function isNodeInMarquee(
  node: TapestryNode,
  start: { x: number; y: number } | null,
  end: { x: number; y: number } | null
): boolean {
  if (!start || !end) return false;

  const dims = getNodeDimensions(node);
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  // AABB intersection check
  return node.x < maxX && node.x + dims.width > minX &&
         node.y < maxY && node.y + dims.height > minY;
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

  // Use history hook for undo/redo support
  const {
    state,
    setState,
    undo,
    redo,
    resetState,
    canUndo,
    canRedo,
  } = useTapestryHistory(createEmptyTapestry());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
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

  // Toggle for showing all connection lines (off by default)
  const [showAllLines, setShowAllLines] = useState(false);

  // Clipboard for copy/paste operations
  const [clipboard, setClipboard] = useState<TapestryNode[]>([]);

  // Connection label editing state
  const [editingConnection, setEditingConnection] = useState<{
    id: string;
    x: number;
    y: number;
    label: string;
    type: ConnectionType;
  } | null>(null);

  // Reset trigger to force layout regeneration
  const [resetTrigger, setResetTrigger] = useState(0);

  // Snap-to-grid toggle
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const marqueeRef = useRef<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ start: null, end: null });

  // Spring physics system for paper stack effect
  interface CardPhysicsState {
    x: number; y: number; rot: number;      // Current position
    vx: number; vy: number; vrot: number;   // Velocity
    tx: number; ty: number; trot: number;   // Target (rest position)
  }

  interface GroupPhysicsState {
    cards: CardPhysicsState[];
    isDragging: boolean;
    dragVelocity: { x: number; y: number };
  }

  const physicsRef = useRef<Map<string, GroupPhysicsState>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Spring physics constants
  const SPRING_CONFIG = {
    stiffness: 180,      // Spring force (higher = snappier)
    damping: 12,         // Friction (higher = less oscillation)
    mass: 1,             // Card mass
    precision: 0.01,     // Stop threshold for velocity
  };

  // Calculate highlighted connections and nodes based on selection (persistent until clicked again)
  const { highlightedConnections, highlightedNodeIds } = useMemo(() => {
    if (selectedNodes.size === 0) {
      return { highlightedConnections: new Set<string>(), highlightedNodeIds: new Set<string>() };
    }

    const connIds = new Set<string>();
    const nodeIds = new Set<string>(selectedNodes);

    state.connections.forEach(conn => {
      if (selectedNodes.has(conn.sourceId) || selectedNodes.has(conn.targetId)) {
        connIds.add(conn.id);
        nodeIds.add(conn.sourceId);
        nodeIds.add(conn.targetId);
      }
    });

    return { highlightedConnections: connIds, highlightedNodeIds: nodeIds };
  }, [selectedNodes, state.connections]);

  // Get available characters for filter panel
  const availableCharacters = characters.map(c => c.name);

  // Always compute layout for minimap (but bundled edges are optional)
  const layout = useMemo<LayoutResult | null>(() => {
    if (state.nodes.length === 0) return null;
    return computeLayout({
      nodes: state.nodes,
      connections: state.connections,
    });
  }, [state.nodes, state.connections]);

  // Create edge bundles for hierarchical bundling (only when new layout mode is enabled)
  const edgeBundles = useMemo<EdgeBundle[]>(() => {
    if (!useNewLayout || !layout) return [];
    return createEdgeBundles(layout, state.connections);
  }, [useNewLayout, layout, state.connections]);

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
  const snapToGridRef = useRef(snapToGrid);

  // Keep snap ref in sync with state
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Load state from localStorage with migration (doesn't push to history)
  useEffect(() => {
    const storageKey = getTapestryStorageKey(screenplayId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate legacy data if needed
        const migrated = migrateTapestryState(parsed);
        resetState(migrated); // Use resetState to avoid pushing to history
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
  }, [screenplayId, resetState]);

  // Auto-sync scenes, characters, and locations with enriched data
  useEffect(() => {
    if (scenes.length === 0 && characters.length === 0 && locations.length === 0) return;

    // Load index card data for enrichment
    const indexCards = loadIndexCards(screenplayId);
    const cardsBySceneId = new Map(indexCards.map(c => [c.sceneId, c]));

    // When resetTrigger changes, ignore existing positions (fresh layout)
    const forceNewLayout = resetTrigger > 0;

    setState(prev => {
      // Get existing linked nodes by type (empty maps if forcing new layout)
      const existingSceneNodes = forceNewLayout ? new Map() : new Map(
        prev.nodes.filter(n => n.sceneId).map(n => [n.sceneId, n])
      );
      const existingCharacterNodes = forceNewLayout ? new Map() : new Map(
        prev.nodes.filter(n => n.characterId).map(n => [n.characterId, n])
      );

      const updatedNodes: TapestryNode[] = [];
      const newGroups: TapestryGroup[] = forceNewLayout ? [] : [...prev.groups];

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
  }, [scenes, characters, locations, screenplayId, resetTrigger]);

  // Save state to localStorage
  const saveState = useCallback((newState: TapestryState) => {
    const storageKey = getTapestryStorageKey(screenplayId);
    localStorage.setItem(storageKey, JSON.stringify(newState));
  }, [screenplayId]);

  // Physics update loop - runs via requestAnimationFrame for smooth spring animation
  const updatePhysics = useCallback(() => {
    const dt = 1 / 60; // Fixed timestep (60fps)
    let needsUpdate = false;

    physicsRef.current.forEach((groupState, groupId) => {
      const groupEl = d3.select(`[data-group-id="${groupId}"]`);
      if (groupEl.empty()) return;

      const numCards = groupState.cards.length;

      groupState.cards.forEach((card, i) => {
        // Top card (last in array) stays stable - it follows the group directly
        if (i === numCards - 1) return;

        // Calculate depth - cards further back have more inertia
        const depth = numCards - 1 - i;

        // Apply drag velocity as dynamic target offset
        const dragOffset = groupState.isDragging ? {
          x: -groupState.dragVelocity.x * depth * 2.0,
          y: -groupState.dragVelocity.y * depth * 2.0,
          rot: (groupState.dragVelocity.x * 0.8 - groupState.dragVelocity.y * 0.3) * depth,
        } : { x: 0, y: 0, rot: 0 };

        const targetX = card.tx + dragOffset.x;
        const targetY = card.ty + dragOffset.y;
        const targetRot = card.trot + dragOffset.rot;

        // Spring physics: F = -k(x - target) - b*velocity
        const fx = -SPRING_CONFIG.stiffness * (card.x - targetX) - SPRING_CONFIG.damping * card.vx;
        const fy = -SPRING_CONFIG.stiffness * (card.y - targetY) - SPRING_CONFIG.damping * card.vy;
        const frot = -SPRING_CONFIG.stiffness * (card.rot - targetRot) - SPRING_CONFIG.damping * card.vrot;

        // Update velocity: v += (F/m) * dt
        card.vx += (fx / SPRING_CONFIG.mass) * dt;
        card.vy += (fy / SPRING_CONFIG.mass) * dt;
        card.vrot += (frot / SPRING_CONFIG.mass) * dt;

        // Update position: x += v * dt
        card.x += card.vx * dt;
        card.y += card.vy * dt;
        card.rot += card.vrot * dt;

        // Check if still moving significantly
        const isMoving = Math.abs(card.vx) > SPRING_CONFIG.precision ||
                        Math.abs(card.vy) > SPRING_CONFIG.precision ||
                        Math.abs(card.vrot) > SPRING_CONFIG.precision * 10;

        if (isMoving) {
          needsUpdate = true;
        }

        // Update DOM - find card by index in DOM order
        const cardEls = groupEl.selectAll('.stacked-card');
        const cardEl = d3.select(cardEls.nodes()[i] as Element);
        if (!cardEl.empty()) {
          cardEl.attr('transform',
            `translate(${card.x}, ${card.y}) rotate(${card.rot}, ${DEFAULT_NOTE_WIDTH / 2}, ${DEFAULT_NOTE_HEIGHT / 2})`
          );
        }
      });

      // Decay drag velocity when not dragging (creates drift effect)
      if (!groupState.isDragging) {
        groupState.dragVelocity.x *= 0.92;
        groupState.dragVelocity.y *= 0.92;
        if (Math.abs(groupState.dragVelocity.x) > 0.05 || Math.abs(groupState.dragVelocity.y) > 0.05) {
          needsUpdate = true;
        }
      }
    });

    // Continue loop if physics still active
    if (needsUpdate) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    } else {
      animationFrameRef.current = null;
    }
  }, []);

  // Start the physics loop if not already running
  const startPhysicsLoop = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }
  }, [updatePhysics]);

  // Easing function for smooth collapse/expand
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // Animate collapse/expand transition
  const animateCollapse = useCallback((groupId: string, toCollapsed: boolean) => {
    const duration = 350; // ms
    const startTime = performance.now();
    const startProgress = toCollapsed ? 0 : 1;
    const endProgress = toCollapsed ? 1 : 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const progress = startProgress + (endProgress - startProgress) * eased;

      // Update group's collapseProgress during animation
      setState(prev => ({
        ...prev,
        groups: prev.groups.map(g =>
          g.id === groupId ? { ...g, collapseProgress: progress } : g
        ),
      }));

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - set final collapsed state and clear progress
        setState(prev => {
          const newState = {
            ...prev,
            groups: prev.groups.map(g =>
              g.id === groupId ? { ...g, collapsed: toCollapsed, collapseProgress: undefined } : g
            ),
          };
          saveState(newState);
          return newState;
        });
      }
    };

    requestAnimationFrame(animate);
  }, [setState, saveState]);

  // Cleanup physics loop on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
    // Right-click drag for panning, scroll wheel for zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .touchable(() => true)
      .filter((event) => {
        // Allow touch events
        if (event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend') {
          return true;
        }
        // Allow scroll wheel for zooming
        if (event.type === 'wheel') {
          return true;
        }
        // Allow right-click drag for panning (button 2)
        if (event.type === 'mousedown' || event.type === 'mousemove' || event.type === 'mouseup') {
          return event.button === 2;
        }
        return false;
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
      .clickDistance(5)
      .container(function() {
        return container.node() as SVGGElement;
      })
      .subject(function(_, d) {
        return { x: d.x, y: d.y };
      })
      .on('start', function(event, d) {
        event.sourceEvent?.stopPropagation();
        d3.select(this).raise().attr('opacity', 0.9).classed('dragging', true);

        // Initialize spring physics for collapsed groups
        const physics = physicsRef.current.get(d.id);
        if (physics) {
          physics.isDragging = true;
          physics.dragVelocity = { x: 0, y: 0 };
          startPhysicsLoop();
        }
      })
      .on('drag', function(event, d) {
        const dx = event.x - d.x;
        const dy = event.y - d.y;
        d.x = event.x;
        d.y = event.y;
        d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);

        // Update physics drag velocity (spring physics loop handles card transforms)
        const physics = physicsRef.current.get(d.id);
        if (physics) {
          physics.dragVelocity.x = physics.dragVelocity.x * 0.7 + dx * 0.3;
          physics.dragVelocity.y = physics.dragVelocity.y * 0.7 + dy * 0.3;
        }

        // Move child nodes visually during drag
        state.nodes.filter(n => n.groupId === d.id).forEach(node => {
          node.x += dx;
          node.y += dy;
          // Update the visual position of the node
          nodesGroup.select(`[data-node-id="${node.id}"]`)
            .attr('transform', `translate(${node.x}, ${node.y})`);
        });

        // Update connection paths for nodes in this group (especially for collapsed groups)
        const childNodeIds = new Set(
          state.nodes.filter(n => n.groupId === d.id).map(n => n.id)
        );

        state.connections.forEach(conn => {
          // Skip if neither end is in this group
          if (!childNodeIds.has(conn.sourceId) && !childNodeIds.has(conn.targetId)) return;

          const sourceNode = state.nodes.find(n => n.id === conn.sourceId);
          const targetNode = state.nodes.find(n => n.id === conn.targetId);
          if (!sourceNode || !targetNode) return;

          // Calculate endpoints (redirect to group center if in collapsed group)
          const collapsedStackWidth = DEFAULT_NOTE_WIDTH + 30;
          const collapsedStackHeight = DEFAULT_NOTE_HEIGHT + 30;

          let sourceX: number, sourceY: number, targetX: number, targetY: number;

          // Source endpoint
          const sourceGroup = sourceNode.groupId ? state.groups.find(g => g.id === sourceNode.groupId) : null;
          if (sourceGroup?.collapsed) {
            sourceX = sourceGroup.x + collapsedStackWidth;
            sourceY = sourceGroup.y + collapsedStackHeight / 2;
          } else {
            sourceX = sourceNode.x + (sourceNode.width || DEFAULT_NOTE_WIDTH);
            sourceY = sourceNode.y + (sourceNode.height || DEFAULT_NOTE_HEIGHT) / 2;
          }

          // Target endpoint
          const targetGroup = targetNode.groupId ? state.groups.find(g => g.id === targetNode.groupId) : null;
          if (targetGroup?.collapsed) {
            targetX = targetGroup.x;
            targetY = targetGroup.y + collapsedStackHeight / 2;
          } else {
            targetX = targetNode.x;
            targetY = targetNode.y + (targetNode.height || DEFAULT_NOTE_HEIGHT) / 2;
          }

          // Generate curved path
          const midX = (sourceX + targetX) / 2;
          const pathD = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

          // Update the path element
          connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
        });
      })
      .on('end', function(_, d) {
        d3.select(this).attr('opacity', 1).classed('dragging', false);

        // Stop dragging but keep physics running for drift/settle effect
        const physics = physicsRef.current.get(d.id);
        if (physics) {
          physics.isDragging = false;
          startPhysicsLoop(); // Continue for settle animation
        }

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
      const isAnimating = group.collapseProgress !== undefined;
      // Progress: 0 = fully expanded, 1 = fully collapsed
      const progress = group.collapseProgress ?? (isCollapsed ? 1 : 0);

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

      // Collapsed mode: card stack matching node size, Expanded: full container
      const stackCardWidth = DEFAULT_NOTE_WIDTH;
      const stackCardHeight = DEFAULT_NOTE_HEIGHT;
      const maxStackCards = Math.min(childNodes.length, 5);

      // Scattered offsets for messy stack look (seeded by group id for more randomness)
      const seed = group.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const pseudoRandom = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280;
      const scatterOffsets = [
        { x: 10, y: 10, rot: 0 }, // Top card - stable position
        { x: 10 + (pseudoRandom(1) * 16 - 8), y: 10 + (pseudoRandom(2) * 12 - 4), rot: pseudoRandom(3) * 12 - 6 },
        { x: 10 + (pseudoRandom(4) * 18 - 9), y: 10 + (pseudoRandom(5) * 14 - 5), rot: pseudoRandom(6) * 14 - 7 },
        { x: 10 + (pseudoRandom(7) * 20 - 10), y: 10 + (pseudoRandom(8) * 16 - 6), rot: pseudoRandom(9) * 16 - 8 },
        { x: 10 + (pseudoRandom(10) * 22 - 11), y: 10 + (pseudoRandom(11) * 18 - 7), rot: pseudoRandom(12) * 18 - 9 },
      ];

      const collapsedWidth = stackCardWidth + 30;
      const collapsedHeight = stackCardHeight + 30;

      // Linear interpolation helper
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      // Interpolate dimensions during animation: progress 0 = expanded, 1 = collapsed
      const displayWidth = lerp(dynamicWidth, collapsedWidth, progress);
      const displayHeight = lerp(dynamicHeight, collapsedHeight, progress);

      const groupG = groupsGroup.append('g')
        .datum(group)
        .attr('class', 'tapestry-group')
        .attr('data-group-id', group.id)
        .attr('transform', `translate(${group.x}, ${group.y})`)
        .attr('cursor', 'grab')
        .call(groupDrag);

      const childCount = childNodes.length;

      // Initialize spring physics state for collapsed/animating groups
      if (isCollapsed || isAnimating) {
        const cardPhysicsStates: CardPhysicsState[] = [];
        for (let cardIdx = 0; cardIdx < maxStackCards; cardIdx++) {
          const scatter = scatterOffsets[maxStackCards - 1 - cardIdx] || { x: 10, y: 10, rot: 0 };
          cardPhysicsStates.push({
            x: scatter.x, y: scatter.y, rot: scatter.rot,
            vx: 0, vy: 0, vrot: 0,
            tx: scatter.x, ty: scatter.y, trot: scatter.rot,
          });
        }
        physicsRef.current.set(group.id, {
          cards: cardPhysicsStates,
          isDragging: false,
          dragVelocity: { x: 0, y: 0 },
        });
      }

      // ============================================================================
      // UNIFIED RENDERING: Container, Cards, and Controls
      // progress: 0 = fully expanded, 1 = fully collapsed
      // ============================================================================

      // Container background - transitions from dashed (expanded) to solid (collapsed)
      const dashArray = progress < 0.5 ? '8,4' : 'none';
      const containerFill = progress > 0.7 ? 'transparent' : `hsl(var(--muted) / ${lerp(0.2, 0, progress)})`;

      groupG.append('rect')
        .attr('class', 'group-body')
        .attr('width', displayWidth)
        .attr('height', displayHeight)
        .attr('rx', 12)
        .attr('fill', containerFill)
        .attr('stroke', progress > 0.8 ? 'transparent' : 'hsl(var(--border))')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', dashArray)
        .attr('filter', progress > 0.8 ? 'none' : 'url(#soft-shadow)');

      // Header bar - fades out as we collapse (only visible when mostly expanded)
      const headerOpacity = Math.max(0, 1 - progress * 2);
      if (headerOpacity > 0) {
        groupG.append('rect')
          .attr('class', 'group-header')
          .attr('width', displayWidth)
          .attr('height', groupHeaderHeight)
          .attr('fill', 'hsl(var(--muted) / 0.4)')
          .attr('opacity', headerOpacity);

        groupG.append('line')
          .attr('x1', 0)
          .attr('y1', groupHeaderHeight)
          .attr('x2', displayWidth)
          .attr('y2', groupHeaderHeight)
          .attr('stroke', 'hsl(var(--border))')
          .attr('stroke-width', 1)
          .attr('opacity', headerOpacity);

        // Toggle arrow (expanded state: ▼)
        groupG.append('text')
          .attr('class', 'collapse-toggle')
          .attr('x', 14)
          .attr('y', groupHeaderHeight / 2 + 5)
          .attr('font-size', '10px')
          .attr('fill', 'hsl(var(--muted-foreground))')
          .attr('pointer-events', 'none')
          .attr('opacity', headerOpacity)
          .text('▼');

        // Title text in header
        groupG.append('text')
          .attr('x', 30)
          .attr('y', groupHeaderHeight / 2 + 5)
          .attr('font-size', '12px')
          .attr('font-weight', '500')
          .attr('fill', 'hsl(var(--foreground))')
          .attr('opacity', headerOpacity)
          .text(sanitizeForD3Text(group.title, 25));
      }

      // ============================================================================
      // RENDER CHILD NODES AS CARDS AT INTERPOLATED POSITIONS
      // When collapsed or animating, render cards that transition between positions
      // ============================================================================

      if (isAnimating || isCollapsed) {
        const cardsToRender = Math.min(childNodes.length, maxStackCards);

        // Render cards back to front (so front card is on top)
        for (let i = cardsToRender - 1; i >= 0; i--) {
          const node = childNodes[i];
          const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
          const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;

          // Expanded position (relative to group origin)
          const expandedX = node.x - group.x;
          const expandedY = node.y - group.y;
          const expandedRot = 0;

          // Collapsed position (in stack)
          const stackPos = scatterOffsets[i] || { x: 10 + i * 4, y: 10 + i * 4, rot: i * 3 };

          // Interpolated position, size, and rotation
          const cardX = lerp(expandedX, stackPos.x, progress);
          const cardY = lerp(expandedY, stackPos.y, progress);
          const cardRot = lerp(expandedRot, stackPos.rot, progress);
          const cardWidth = lerp(nodeWidth, stackCardWidth, progress);
          const cardHeight = lerp(nodeHeight, stackCardHeight, progress);

          const cardG = groupG.append('g')
            .attr('class', 'stacked-card')
            .attr('data-base-x', stackPos.x)
            .attr('data-base-y', stackPos.y)
            .attr('data-base-rot', stackPos.rot)
            .attr('transform', `translate(${cardX}, ${cardY}) rotate(${cardRot}, ${cardWidth / 2}, ${cardHeight / 2})`);

          // Card background
          cardG.append('rect')
            .attr('width', cardWidth)
            .attr('height', cardHeight)
            .attr('rx', 8)
            .attr('fill', i === 0 ? 'hsl(var(--card))' : 'hsl(var(--muted))')
            .attr('stroke', 'hsl(var(--border))')
            .attr('stroke-width', 1)
            .attr('filter', 'url(#soft-shadow)');

          // Node content (fades out as we collapse, except for top card summary)
          const contentOpacity = Math.max(0, 1 - progress * 1.5);
          if (contentOpacity > 0 && i < 3) {
            // Show simplified node header/title during transition
            cardG.append('text')
              .attr('x', 12)
              .attr('y', 20)
              .attr('font-size', '11px')
              .attr('font-weight', '500')
              .attr('fill', 'hsl(var(--foreground))')
              .attr('opacity', contentOpacity)
              .text(sanitizeForD3Text(node.title || node.content?.slice(0, 20) || '...', 25));
          }

          // Top card controls (expand toggle, count) - fade in as we collapse
          if (i === 0) {
            const controlsOpacity = Math.max(0, (progress - 0.5) * 2);
            if (controlsOpacity > 0) {
              // Expand toggle
              const toggleG = cardG.append('g')
                .attr('class', 'collapse-toggle')
                .attr('cursor', 'pointer')
                .attr('opacity', controlsOpacity)
                .style('pointer-events', 'all')
                .on('click', (event) => {
                  event.stopPropagation();
                  animateCollapse(group.id, false);
                });

              toggleG.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 80)
                .attr('height', 32)
                .attr('fill', 'transparent');

              toggleG.append('text')
                .attr('x', 12)
                .attr('y', 21)
                .attr('font-size', '10px')
                .attr('fill', 'hsl(var(--muted-foreground))')
                .text('▶');

              // Group title on top card
              cardG.append('text')
                .attr('x', 28)
                .attr('y', 21)
                .attr('font-size', '12px')
                .attr('font-weight', '500')
                .attr('fill', 'hsl(var(--foreground))')
                .attr('opacity', controlsOpacity)
                .text(sanitizeForD3Text(group.title, 20));

              // Item count badge
              cardG.append('text')
                .attr('x', stackCardWidth - 12)
                .attr('y', 21)
                .attr('font-size', '10px')
                .attr('text-anchor', 'end')
                .attr('fill', 'hsl(var(--muted-foreground))')
                .attr('opacity', controlsOpacity)
                .text(`${childCount}`);

              // Preview content (only when fully collapsed)
              if (progress > 0.9) {
                if (childNodes.length > 0) {
                  const firstNode = childNodes[0];
                  cardG.append('text')
                    .attr('x', 12)
                    .attr('y', 55)
                    .attr('font-size', '13px')
                    .attr('fill', 'hsl(var(--foreground) / 0.8)')
                    .text(sanitizeForD3Text(firstNode.title || firstNode.content?.slice(0, 25) || '...', 22));

                  if (childNodes.length > 1) {
                    cardG.append('text')
                      .attr('x', 12)
                      .attr('y', 75)
                      .attr('font-size', '11px')
                      .attr('fill', 'hsl(var(--muted-foreground))')
                      .text(`+${childNodes.length - 1} more items`);
                  }
                }
              }
            }
          }
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
          // Check if source/target are in collapsed groups
          const sourceNode = state.nodes.find(n => n.id === bundle.sourceEntityId);
          const targetNode = state.nodes.find(n => n.id === edge.targetNodeId);

          const sourceGroup = sourceNode?.groupId ? state.groups.find(g => g.id === sourceNode.groupId) : null;
          const targetGroup = targetNode?.groupId ? state.groups.find(g => g.id === targetNode.groupId) : null;
          const sourceInCollapsed = sourceGroup?.collapsed;
          const targetInCollapsed = targetGroup?.collapsed;

          // Skip if both ends are in collapsed groups
          if (sourceInCollapsed && targetInCollapsed) return;

          // Generate bundled path
          const pathD = generateBundledEdgePath(bundle, edge, layout);

          // Check highlight from BOTH node selection and sidebar
          const isHighlightedByNodeSelection = highlightedConnections.has(edge.connectionId);
          const isHighlightedBySidebar = highlightedEdges.has(edge.connectionId);
          const isHighlighted = isHighlightedByNodeSelection || isHighlightedBySidebar;
          const hasAnyHighlightActive = hasAnyHighlight || selectedNodes.size > 0;

          // Calculate opacity based on highlight state - hide if either end is in collapsed group
          const isPartiallyCollapsed = sourceInCollapsed || targetInCollapsed;
          const edgeOpacity = isPartiallyCollapsed ? 0.3 : (isHighlighted ? 1 : (hasAnyHighlightActive ? 0.1 : EDGE_OPACITY.default));

          // Check if edge should be filtered out
          const sourceMatches = sourceNode ? nodeMatchesFilters(sourceNode) : true;
          const targetMatches = targetNode ? nodeMatchesFilters(targetNode) : true;
          const connectionVisible = sourceMatches && targetMatches;

          const pathId = `bundled-path-${edge.connectionId}`;

          const edgeGroup = bundleGroup.append('g')
            .attr('class', 'bundled-edge')
            .attr('cursor', 'pointer')
            .attr('opacity', connectionVisible ? edgeOpacity : 0.05);

          // Monochromatic color scheme
          const lineColor = 'hsl(var(--muted-foreground))';
          const highlightColor = 'hsl(var(--primary))';

          // Background path for depth
          edgeGroup.append('path')
            .attr('d', pathD)
            .attr('stroke', lineColor)
            .attr('stroke-width', Math.max(1, edge.thickness * 0.5) + 1)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
            .attr('opacity', 0.1);

          // Main path - monochromatic
          const mainPath = edgeGroup.append('path')
            .attr('id', pathId)
            .attr('class', `connection-path ${isHighlighted ? 'highlighted' : ''}`)
            .attr('d', pathD)
            .attr('stroke', isHighlighted ? highlightColor : lineColor)
            .attr('stroke-width', Math.max(1, edge.thickness * 0.5))
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
            .style('--connection-accent-color', highlightColor);

          // Hover interactions (only when no node/sidebar is highlighting)
          edgeGroup
            .on('mouseenter', function() {
              if (!hasAnyHighlightActive) {
                d3.select(this).attr('opacity', 1);
                mainPath.attr('stroke', highlightColor);
              }
            })
            .on('mouseleave', function() {
              if (!hasAnyHighlightActive) {
                d3.select(this).attr('opacity', EDGE_OPACITY.default);
                mainPath.attr('stroke', lineColor);
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

        // Check if nodes are in collapsed groups - skip connections to hidden nodes
        const sourceGroup = sourceNode.groupId ? state.groups.find(g => g.id === sourceNode.groupId) : null;
        const targetGroup = targetNode.groupId ? state.groups.find(g => g.id === targetNode.groupId) : null;
        const sourceInCollapsed = sourceGroup?.collapsed;
        const targetInCollapsed = targetGroup?.collapsed;

        // Skip if both ends are in collapsed groups, or redirect to group position
        if (sourceInCollapsed && targetInCollapsed) return;

        // Check if both endpoints match the filter
        const sourceMatches = nodeMatchesFilters(sourceNode);
        const targetMatches = nodeMatchesFilters(targetNode);
        const connectionVisible = sourceMatches && targetMatches;

        // Use proper dimensions for each node type
        const sourceDims = getNodeDimensions(sourceNode);
        const targetDims = getNodeDimensions(targetNode);

        // If a node is in collapsed group, redirect connection to the group
        const collapsedStackWidth = DEFAULT_NOTE_WIDTH + 30;
        const collapsedStackHeight = DEFAULT_NOTE_HEIGHT + 30;

        let sourceX: number, sourceY: number, targetX: number, targetY: number;

        if (sourceInCollapsed && sourceGroup) {
          // Redirect to collapsed group
          sourceX = sourceGroup.x + collapsedStackWidth;
          sourceY = sourceGroup.y + collapsedStackHeight / 2;
        } else {
          sourceX = sourceNode.x + sourceDims.width;
          sourceY = sourceNode.y + sourceDims.height / 2;
        }

        if (targetInCollapsed && targetGroup) {
          // Redirect to collapsed group
          targetX = targetGroup.x;
          targetY = targetGroup.y + collapsedStackHeight / 2;
        } else {
          targetX = targetNode.x;
          targetY = targetNode.y + targetDims.height / 2;
        }

        // Taut thread curve - smooth bezier
        const dx = Math.abs(targetX - sourceX);
        const controlOffset = Math.max(40, dx * 0.3);
        const pathD = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

        // Monochromatic color scheme
        const mutedColor = 'hsl(var(--muted-foreground))';
        const highlightColor = 'hsl(var(--primary))';

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

        // Background path (subtle, for visual depth)
        const pathId = `path-${conn.id}`;
        connGroup.append('path')
          .attr('d', pathD)
          .attr('stroke', mutedColor)
          .attr('stroke-width', isHighlightedConn ? 3 : 2)
          .attr('stroke-linecap', 'round')
          .attr('fill', 'none')
          .attr('opacity', isHighlightedConn ? 0.3 : 0.08);

        // Main connection path - thread/string texture effect
        const mainPath = connGroup.append('path')
          .attr('id', pathId)
          .attr('class', `connection-path ${isHighlightedConn ? 'highlighted' : ''}`)
          .attr('d', pathD)
          .attr('stroke', isHighlightedConn ? highlightColor : mutedColor)
          .attr('stroke-width', isHighlightedConn ? 2 : 1.5)
          .attr('stroke-linecap', 'round')
          .attr('stroke-dasharray', isHighlightedConn ? 'none' : '8 4') // Thread texture when not highlighted
          .attr('fill', 'none')
          .style('--connection-accent-color', highlightColor)
          .attr('marker-end', conn.directed ? 'url(#arrow)' : null);

        // Hover: switch to primary color and solid line
        mainPath
          .on('mouseenter', function() {
            d3.select(this)
              .attr('stroke', highlightColor)
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', 'none');
            if (this.parentNode) d3.select(this.parentNode as Element).attr('opacity', 1);
          })
          .on('mouseleave', function() {
            d3.select(this)
              .attr('stroke', isHighlightedConn ? highlightColor : mutedColor)
              .attr('stroke-width', isHighlightedConn ? 2 : 1.5)
              .attr('stroke-dasharray', isHighlightedConn ? 'none' : '8 4');
            if (this.parentNode) d3.select(this.parentNode as Element).attr('opacity', connOpacity);
          });

        // Clickable area for label editing (always present for double-click)
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;

        // Invisible hit area for double-click to edit
        connGroup.append('rect')
          .attr('class', 'connection-label-hitarea')
          .attr('x', midX - 50)
          .attr('y', midY - 15)
          .attr('width', 100)
          .attr('height', 30)
          .attr('fill', 'transparent')
          .attr('cursor', 'pointer')
          .on('dblclick', (event: MouseEvent) => {
            event.stopPropagation();
            // Get screen coordinates for the popover
            const svgRect = svgRef.current?.getBoundingClientRect();
            if (svgRect) {
              const screenX = midX * transformRef.current.k + transformRef.current.x + svgRect.left;
              const screenY = midY * transformRef.current.k + transformRef.current.y + svgRect.top;
              setEditingConnection({
                id: conn.id,
                x: screenX,
                y: screenY,
                label: conn.label || '',
                type: conn.type,
              });
            }
          });

        // Connection label on path (handwritten style)
        connGroup.append('text')
          .attr('class', 'connection-label-handwritten')
          .attr('dy', -8)
          .attr('font-family', "'Caveat', cursive")
          .attr('font-size', '13px')
          .attr('fill', conn.label ? 'hsl(var(--foreground) / 0.7)' : 'hsl(var(--muted-foreground) / 0.4)')
          .style('pointer-events', 'none')
          .append('textPath')
          .attr('href', `#${pathId}`)
          .attr('startOffset', '50%')
          .attr('text-anchor', 'middle')
          .text(conn.label || '···');
      });
    }

    // Draw nodes
    const nodesGroup = container.append('g').attr('class', 'nodes');

    // Create drag behavior with touch support
    // clickDistance(5) ensures clicks register even with slight mouse movement
    const drag = d3.drag<SVGGElement, TapestryNode>()
      .touchable(() => true)
      .clickDistance(5)
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

        // Apply snap-to-grid if enabled
        const snapValue = (v: number) => snapToGridRef.current
          ? Math.round(v / GRID_MINOR_SPACING) * GRID_MINOR_SPACING
          : v;
        const finalX = snapValue(d.x);
        const finalY = snapValue(d.y);

        setState(prev => {
          const currentNode = prev.nodes.find(n => n.id === d.id);
          const oldGroupId = currentNode?.groupId;

          const newState = {
            ...prev,
            nodes: prev.nodes.map(n => n.id === d.id
              ? { ...n, x: finalX, y: finalY, groupId: newGroupId }
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
      // Skip nodes in collapsed groups OR groups that are animating collapse/expand
      if (node.groupId) {
        const parentGroup = state.groups.find(g => g.id === node.groupId);
        if (parentGroup?.collapsed || parentGroup?.collapseProgress !== undefined) return;
      }

      const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
      const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;
      const nodeType = node.type || 'note';
      const matchesFilter = nodeMatchesFilters(node);


      // Monochromatic styling - uses primary color for selection/hover
      const mutedHeaderColor = 'hsl(var(--muted))';
      const isSelected = selectedNodes.has(node.id);

      // Determine if this node is highlighted from selection
      const isNodeHighlighted = highlightedNodeIds.has(node.id);
      const hasActiveSelection = selectedNodes.size > 0;

      const nodeGroup = nodesGroup.append('g')
        .datum(node)
        .attr('class', `node tapestry-node ${nodeType}-node ${nodeType === 'character' ? 'polaroid-node' : ''} ${isSelected ? 'selected' : ''} ${isNodeHighlighted ? 'highlighted' : ''}`)
        .attr('data-node-id', node.id)
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .attr('cursor', 'grab')
        .attr('opacity', matchesFilter ? (hasActiveSelection && !isNodeHighlighted ? 0.3 : 1) : 0.2)
        .call(drag);

      // ========== POLAROID STYLE FOR CHARACTER NODES ==========
      if (nodeType === 'character') {
        const polaroidWidth = DEFAULT_CHARACTER_WIDTH;
        const polaroidHeight = DEFAULT_CHARACTER_HEIGHT;
        const portraitHeight = polaroidHeight - 45; // Space for name and stats (scaled)
        const borderPadding = 6;

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
          .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 2 : 1)
          .attr('filter', 'url(#node-shadow)');

        // Portrait area (themed background with initials)
        nodeGroup.append('rect')
          .attr('class', 'polaroid-portrait')
          .attr('x', borderPadding)
          .attr('y', borderPadding)
          .attr('width', polaroidWidth - borderPadding * 2)
          .attr('height', portraitHeight)
          .attr('rx', 2)
          .attr('fill', 'hsl(var(--muted))');

        // Initials in portrait
        nodeGroup.append('text')
          .attr('x', polaroidWidth / 2)
          .attr('y', borderPadding + portraitHeight / 2 + 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '24px')
          .attr('font-weight', '700')
          .attr('fill', 'hsl(var(--muted-foreground))')
          .attr('opacity', 0.9)
          .text(initials);

        // Character name (handwritten style)
        nodeGroup.append('text')
          .attr('class', 'polaroid-name node-title')
          .attr('x', polaroidWidth / 2)
          .attr('y', portraitHeight + borderPadding + 18)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'Caveat', cursive")
          .attr('font-size', '14px')
          .attr('font-weight', '600')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(node.title || 'Untitled', 12));

        // Stats line (dialogue count)
        const dialogueText = `${node.dialogueCount || 0} lines`;
        nodeGroup.append('text')
          .attr('class', 'polaroid-stats')
          .attr('x', polaroidWidth / 2)
          .attr('y', portraitHeight + borderPadding + 30)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'Caveat', cursive")
          .attr('font-size', '10px')
          .attr('fill', 'hsl(var(--muted-foreground))')
          .text(dialogueText);

        // Thumbtack pin indicator if pinned (polaroid character nodes)
        if (node.pinned) {
          const pinGroup = nodeGroup.append('g')
            .attr('class', 'node-thumbtack')
            .attr('transform', `translate(${polaroidWidth / 2}, -4)`);

          // Thumbtack head (circular)
          pinGroup.append('circle')
            .attr('r', 6)
            .attr('fill', 'hsl(var(--destructive))')
            .attr('stroke', 'hsl(var(--background))')
            .attr('stroke-width', 1.5);

          // Thumbtack point (triangle pointing down)
          pinGroup.append('path')
            .attr('d', 'M-2.5,5 L2.5,5 L0,11 Z')
            .attr('fill', 'hsl(var(--muted-foreground))');

          // Highlight dot on head
          pinGroup.append('circle')
            .attr('cx', -1.5)
            .attr('cy', -1.5)
            .attr('r', 1.5)
            .attr('fill', 'hsl(var(--destructive-foreground) / 0.5)');
        }

        // Connection pins (compact for smaller polaroid)
        nodeGroup.append('circle')
          .attr('class', 'node-pin')
          .attr('cx', 0)
          .attr('cy', polaroidHeight / 2)
          .attr('r', 4)
          .attr('fill', 'hsl(var(--primary))')
          .attr('stroke', 'hsl(var(--background))')
          .attr('stroke-width', 1.5);

        nodeGroup.append('circle')
          .attr('class', 'node-pin')
          .attr('cx', polaroidWidth)
          .attr('cy', polaroidHeight / 2)
          .attr('r', 4)
          .attr('fill', 'hsl(var(--primary))')
          .attr('stroke', 'hsl(var(--background))')
          .attr('stroke-width', 1.5);

        // Hover handled by CSS via .polaroid-node class

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
          .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 2 : 1)
          .attr('filter', 'url(#node-shadow)');

      // Header bar - monochromatic by default, primary when selected
      nodeGroup.append('rect')
        .attr('class', 'node-header')
        .attr('width', nodeWidth)
        .attr('height', headerHeight)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', isSelected ? 'hsl(var(--primary))' : mutedHeaderColor);

      // Square off bottom corners of header
      nodeGroup.append('rect')
        .attr('class', 'node-header-bottom')
        .attr('y', 8)
        .attr('width', nodeWidth)
        .attr('height', headerHeight - 8)
        .attr('fill', isSelected ? 'hsl(var(--primary))' : mutedHeaderColor);

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
          if (!selectedNodes.has(node.id)) {
            d3.select(this).select('.node-header').attr('fill', 'hsl(var(--primary))');
            d3.select(this).select('.node-header-bottom').attr('fill', 'hsl(var(--primary))');
            d3.select(this).select('.node-type-icon').attr('fill', 'white');
            d3.select(this).select('.node-title').attr('fill', 'white');
            d3.select(this).select('.time-icon').attr('fill', 'white');
            d3.select(this).select('.node-bg').attr('stroke', 'hsl(var(--primary))');
          }
        })
        .on('mouseleave', function() {
          if (!selectedNodes.has(node.id)) {
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

      // Thumbtack pin indicator if pinned (standard nodes)
      if (node.pinned) {
        const pinGroup = nodeGroup.append('g')
          .attr('class', 'node-thumbtack')
          .attr('transform', `translate(${nodeWidth / 2}, -4)`);

        // Thumbtack head (circular)
        pinGroup.append('circle')
          .attr('r', 7)
          .attr('fill', 'hsl(var(--destructive))')
          .attr('stroke', 'hsl(var(--background))')
          .attr('stroke-width', 1.5);

        // Thumbtack point (triangle pointing down)
        pinGroup.append('path')
          .attr('d', 'M-3,6 L3,6 L0,14 Z')
          .attr('fill', 'hsl(var(--muted-foreground))');

        // Highlight dot on head
        pinGroup.append('circle')
          .attr('cx', -2)
          .attr('cy', -2)
          .attr('r', 2)
          .attr('fill', 'hsl(var(--destructive-foreground) / 0.5)');
      }

      // Larger pins for thread-like connections (6px radius) - non-character nodes
      // Input pin (left side)
      nodeGroup.append('circle')
        .attr('class', 'node-pin')
        .attr('cx', 0)
        .attr('cy', nodeHeight / 2)
        .attr('r', 6)
        .attr('fill', 'hsl(var(--primary))')
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', 2);

      // Output pin (right side)
      nodeGroup.append('circle')
        .attr('class', 'node-pin')
        .attr('cx', nodeWidth)
        .attr('cy', nodeHeight / 2)
        .attr('r', 6)
        .attr('fill', 'hsl(var(--primary))')
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
          // Shift+click adds to selection, regular click replaces selection
          if (event.shiftKey) {
            // Toggle this node in selection
            setSelectedNodes(prev => {
              const newSet = new Set(prev);
              if (newSet.has(node.id)) {
                newSet.delete(node.id);
              } else {
                newSet.add(node.id);
              }
              return newSet;
            });
            // Don't change profile panel on shift+click
          } else {
            // Regular click - toggle single selection
            if (selectedNodes.has(node.id) && selectedNodes.size === 1) {
              setSelectedNodes(new Set());
              setProfileCharacter(null);
            } else {
              setSelectedNodes(new Set([node.id]));
              // Open profile panel for character nodes
              if (node.type === 'character') {
                setProfileCharacter(node);
              } else {
                setProfileCharacter(null);
              }
            }
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

        // Preserve multi-selection if clicked node is part of it
        const isPartOfSelection = selectedNodes.has(node.id) && selectedNodes.size > 1;

        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id,
        });

        // Only change selection if clicked node wasn't already part of multi-selection
        if (!isPartOfSelection) {
          setSelectedNodes(new Set([node.id]));
        }
      });
    });

    // Group controls overlay (rendered ON TOP of nodes for interactivity)
    const groupControlsOverlay = container.append('g').attr('class', 'group-controls-overlay');

    state.groups.forEach(group => {
      const isCollapsed = group.collapsed || false;
      const isAnimating = group.collapseProgress !== undefined;

      // Skip overlay for collapsed or animating groups - the card has its own controls
      if (isCollapsed || isAnimating) return;

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

      // Drag handle covering the header - fully transparent
      const dragHandle = controlsG.append('rect')
        .attr('class', 'group-drag-handle')
        .attr('width', displayWidth)
        .attr('height', 32)
        .attr('fill', 'transparent')
        .attr('stroke', 'none')
        .attr('cursor', 'grab')
        .style('pointer-events', 'all');

      // Store positions for this group's drag
      let dragStartX = groupX;
      let dragStartY = groupY;

      const groupDragBehavior = d3.drag<SVGRectElement, unknown>()
        .container(function() { return container.node() as SVGGElement; })
        .clickDistance(5)
        .on('start', function(event) {
          event.sourceEvent?.stopPropagation();
          d3.select(this).attr('cursor', 'grabbing');
          const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
          groupEl.raise().attr('opacity', 0.85).classed('dragging', true);
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
          groupEl.attr('opacity', 1).classed('dragging', false);

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

      // Collapse toggle overlay
      controlsG.append('text')
        .attr('class', 'collapse-toggle-overlay')
        .attr('x', 14)
        .attr('y', 32 / 2 + 5)
        .attr('font-size', '10px')
        .attr('fill', 'hsl(var(--muted-foreground))')
        .attr('cursor', 'pointer')
        .attr('pointer-events', 'all')
        .text('▼')
        .on('click', (event) => {
          event.stopPropagation();
          // Animate collapse (expanded -> collapsed)
          animateCollapse(group.id, true);
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

    // Marquee selection handlers
    svg.on('mousedown', (event) => {
      // Only left button, and only if not clicking on a node/group element
      if (event.button !== 0) return;
      const target = event.target as SVGElement;
      // Check if we're clicking on the canvas background (not a node)
      if (target.tagName === 'rect' && !target.closest('.tapestry-node') && !target.closest('.tapestry-group')) {
        event.preventDefault();
        const [mx, my] = d3.pointer(event, container.node());
        marqueeRef.current = { start: { x: mx, y: my }, end: { x: mx, y: my } };
        setIsMarqueeSelecting(true);
        setMarqueeStart({ x: mx, y: my });
        setMarqueeEnd({ x: mx, y: my });
      }
    });

    svg.on('mousemove', (event) => {
      if (!marqueeRef.current.start) return;
      const [mx, my] = d3.pointer(event, container.node());
      marqueeRef.current.end = { x: mx, y: my };
      setMarqueeEnd({ x: mx, y: my });

      // Update marquee rectangle
      const start = marqueeRef.current.start;
      const end = marqueeRef.current.end;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);

      let marqueeRect = container.select<SVGRectElement>('.marquee-rect');
      if (marqueeRect.empty()) {
        marqueeRect = container.append('rect')
          .attr('class', 'marquee-rect')
          .attr('fill', 'hsl(var(--primary) / 0.1)')
          .attr('stroke', 'hsl(var(--primary))')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4')
          .attr('pointer-events', 'none');
      }
      marqueeRect
        .attr('x', x)
        .attr('y', y)
        .attr('width', w)
        .attr('height', h);
    });

    svg.on('mouseup', (event) => {
      if (!marqueeRef.current.start) return;

      const start = marqueeRef.current.start;
      const end = marqueeRef.current.end;

      // If marquee is too small, treat as click (clear selection)
      const w = Math.abs((end?.x ?? start.x) - start.x);
      const h = Math.abs((end?.y ?? start.y) - start.y);

      if (w < 5 && h < 5) {
        // Treat as simple click - clear selection
        if (isConnecting) {
          setIsConnecting(false);
          setConnectingFrom(null);
        }
        setSelectedNodes(new Set());
        setContextMenu(null);
      } else {
        // Select all nodes within marquee bounds
        const selected = new Set<string>();
        state.nodes.forEach(node => {
          if (isNodeInMarquee(node, start, end)) {
            selected.add(node.id);
          }
        });
        setSelectedNodes(selected);
      }

      // Clear marquee state
      marqueeRef.current = { start: null, end: null };
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      container.select('.marquee-rect').remove();
    });

    // Right-click on canvas - prevent default to allow panning
    svg.on('contextmenu', (event) => {
      event.preventDefault();
      setContextMenu(null);
    });

    return () => {
      svg.on('.zoom', null);
      svg.on('mousedown', null);
      svg.on('mousemove', null);
      svg.on('mouseup', null);
      svg.on('contextmenu', null);
      svg.selectAll('*').remove();
    };
  }, [state.nodes, state.connections, state.groups, dimensions, isConnecting, connectingFrom, selectedNodes, saveState, onSceneClick, nodeMatchesFilters, layout, edgeBundles, highlightedEdges, hasAnyHighlight, showAllLines, highlightedConnections, highlightedNodeIds]);

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
    setSelectedNodes(new Set([newNode.id]));
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

  // Group selected nodes together
  const handleGroupSelected = useCallback(() => {
    if (selectedNodes.size < 2) return;

    // Get the selected nodes
    const nodesToGroup = state.nodes.filter(n => selectedNodes.has(n.id));
    if (nodesToGroup.length < 2) return;

    // Calculate bounding box of selected nodes
    const minX = Math.min(...nodesToGroup.map(n => n.x));
    const minY = Math.min(...nodesToGroup.map(n => n.y));

    // Create a new group at the bounding box position
    const newGroup = createGroup({
      x: minX - 20,
      y: minY - 42,
      title: 'New Group',
    });

    // Assign selected nodes to the new group
    setState(prev => {
      const newState = {
        ...prev,
        groups: [...prev.groups, newGroup],
        nodes: prev.nodes.map(n =>
          selectedNodes.has(n.id) ? { ...n, groupId: newGroup.id } : n
        ),
      };
      saveState(newState);
      return newState;
    });

    // Clear selection after grouping
    setSelectedNodes(new Set());
  }, [selectedNodes, state.nodes, saveState]);

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

  // Save connection label
  const handleSaveConnectionLabel = useCallback((connectionId: string, label: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        connections: prev.connections.map(c =>
          c.id === connectionId ? { ...c, label: label.trim() || undefined } : c
        ),
      };
      saveState(newState);
      return newState;
    });
    setEditingConnection(null);
  }, [saveState]);

  // Save connection type
  const handleSaveConnectionType = useCallback((connectionId: string, type: ConnectionType) => {
    setState(prev => {
      const newState = {
        ...prev,
        connections: prev.connections.map(c =>
          c.id === connectionId ? { ...c, type } : c
        ),
      };
      saveState(newState);
      return newState;
    });
    // Update the editing state to reflect the new type
    setEditingConnection(prev => prev ? { ...prev, type } : null);
  }, [saveState]);

  // Start connecting (uses first selected node)
  const handleStartConnect = useCallback(() => {
    if (selectedNodes.size > 0) {
      const firstSelected = Array.from(selectedNodes)[0];
      setIsConnecting(true);
      setConnectingFrom(firstSelected);
    }
  }, [selectedNodes]);

  // Delete selected nodes
  const handleDeleteNote = useCallback(() => {
    if (selectedNodes.size === 0) return;

    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.filter(n => !selectedNodes.has(n.id)),
        connections: prev.connections.filter(c => !selectedNodes.has(c.sourceId) && !selectedNodes.has(c.targetId)),
      };
      saveState(newState);
      return newState;
    });
    setSelectedNodes(new Set());
  }, [selectedNodes, saveState]);

  // Copy selected nodes to clipboard
  const handleCopyNodes = useCallback(() => {
    const nodesToCopy = state.nodes.filter(n => selectedNodes.has(n.id));
    if (nodesToCopy.length > 0) {
      setClipboard(nodesToCopy);
    }
  }, [state.nodes, selectedNodes]);

  // Paste nodes from clipboard
  const handlePasteNodes = useCallback(() => {
    if (clipboard.length === 0) return;

    // Calculate bounding box of copied nodes
    const minX = Math.min(...clipboard.map(n => n.x));
    const minY = Math.min(...clipboard.map(n => n.y));

    // Paste at viewport center with relative positioning preserved
    const centerX = (dimensions.width / 2 - transformRef.current.x) / transformRef.current.k;
    const centerY = (dimensions.height / 2 - transformRef.current.y) / transformRef.current.k;

    const newNodes = clipboard.map(node => createNode({
      ...node,
      x: centerX + (node.x - minX),
      y: centerY + (node.y - minY),
      groupId: undefined, // Don't preserve group membership
    }));

    setState(prev => {
      const newState = { ...prev, nodes: [...prev.nodes, ...newNodes] };
      saveState(newState);
      return newState;
    });
    setSelectedNodes(new Set(newNodes.map(n => n.id)));
  }, [clipboard, dimensions, saveState]);

  // Duplicate selected nodes
  const handleDuplicateSelected = useCallback(() => {
    const nodesToDupe = state.nodes.filter(n => selectedNodes.has(n.id));
    if (nodesToDupe.length === 0) return;

    const newNodes = nodesToDupe.map(node => createNode({
      ...node,
      x: node.x + GRID_MAJOR_SPACING,
      y: node.y + GRID_MAJOR_SPACING,
      groupId: undefined, // Don't preserve group membership
    }));

    setState(prev => {
      const newState = { ...prev, nodes: [...prev.nodes, ...newNodes] };
      saveState(newState);
      return newState;
    });
    setSelectedNodes(new Set(newNodes.map(n => n.id)));
  }, [state.nodes, selectedNodes, saveState]);

  // Snap value to grid
  const snapToGridValue = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_MINOR_SPACING) * GRID_MINOR_SPACING;
  }, [snapToGrid]);

  // Nudge selected nodes by arrow keys
  const handleNudgeSelected = useCallback((dx: number, dy: number) => {
    if (selectedNodes.size === 0) return;

    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.map(n =>
          selectedNodes.has(n.id)
            ? { ...n, x: snapToGrid ? snapToGridValue(n.x + dx) : n.x + dx, y: snapToGrid ? snapToGridValue(n.y + dy) : n.y + dy }
            : n
        ),
      };
      saveState(newState);
      return newState;
    });
  }, [selectedNodes, saveState, snapToGrid, snapToGridValue]);

  // Cycle through node selection with Tab
  const handleCycleSelection = useCallback((direction: 1 | -1) => {
    if (state.nodes.length === 0) return;

    // Sort nodes by position (top-left to bottom-right)
    const sortedNodes = [...state.nodes].sort((a, b) => {
      const rowA = Math.floor(a.y / 100);
      const rowB = Math.floor(b.y / 100);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

    const currentId = selectedNodes.size === 1 ? Array.from(selectedNodes)[0] : null;
    const currentIndex = currentId ? sortedNodes.findIndex(n => n.id === currentId) : -1;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = sortedNodes.length - 1;
    if (nextIndex >= sortedNodes.length) nextIndex = 0;

    setSelectedNodes(new Set([sortedNodes[nextIndex].id]));
  }, [state.nodes, selectedNodes]);

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
    setSelectedNodes(new Set());
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

    // Clear state first, then trigger regeneration
    resetState(createEmptyTapestry());
    setResetTrigger(prev => prev + 1);

    // Reset zoom to default
    transformRef.current = d3.zoomIdentity;
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, [screenplayId, resetState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if tapestry container is focused or no specific element is focused
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement ||
                             activeEl instanceof HTMLTextAreaElement ||
                             activeEl?.getAttribute('contenteditable') === 'true';
      if (isInputFocused) return;

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete/Backspace - delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.size > 0) {
        e.preventDefault();
        handleDeleteNote();
        return;
      }

      // Escape - clear selection and cancel connecting mode
      if (e.key === 'Escape') {
        setSelectedNodes(new Set());
        setIsConnecting(false);
        setContextMenu(null);
        return;
      }

      // Cmd/Ctrl+D - duplicate selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Cmd/Ctrl+C - copy selected nodes to clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNodes.size > 0) {
        e.preventDefault();
        handleCopyNodes();
        return;
      }

      // Cmd/Ctrl+V - paste nodes from clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePasteNodes();
        return;
      }

      // Arrow keys - nudge selected nodes (Shift for larger nudge)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNodes.size > 0) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? GRID_MAJOR_SPACING : GRID_MINOR_SPACING;
        const dx = e.key === 'ArrowRight' ? nudgeAmount : e.key === 'ArrowLeft' ? -nudgeAmount : 0;
        const dy = e.key === 'ArrowDown' ? nudgeAmount : e.key === 'ArrowUp' ? -nudgeAmount : 0;
        handleNudgeSelected(dx, dy);
        return;
      }

      // Tab - cycle through nodes (Shift+Tab for reverse)
      if (e.key === 'Tab') {
        e.preventDefault();
        handleCycleSelection(e.shiftKey ? -1 : 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNodes, handleDeleteNote, handleCopyNodes, handlePasteNodes, handleDuplicateSelected, handleNudgeSelected, handleCycleSelection]);

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
          onToggleLines={handleToggleLines}
          onToggleSnap={() => setSnapToGrid(prev => !prev)}
          snapToGrid={snapToGrid}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          showAllLines={showAllLines}
          hasSelectedNode={selectedNodes.size > 0}
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

        {/* Character Profile Panel - inside container for proper clipping */}
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
      </div>

      {/* Node Editor Dialog */}
      <NoteEditorDialog
        note={editingNode}
        open={!!editingNode}
        onOpenChange={(open) => !open && setEditingNode(null)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNoteFromDialog}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.nodeId
              ? [
                  // Group Selected option (only when multiple nodes selected)
                  ...(selectedNodes.size >= 2
                    ? [
                        {
                          label: `Group Selected (${selectedNodes.size})`,
                          action: () => {
                            handleGroupSelected();
                          },
                        },
                        { label: '', action: () => {}, separator: true },
                      ]
                    : []),
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
                        setSelectedNodes(new Set([contextMenu.nodeId]));
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
                        setSelectedNodes(new Set());
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
                        if (contextMenu.groupId) {
                          const grp = state.groups.find(g => g.id === contextMenu.groupId);
                          animateCollapse(contextMenu.groupId, !grp?.collapsed);
                        }
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

      {/* Connection Label Editor */}
      {editingConnection && (
        <div
          className="fixed z-50 pointer-events-auto"
          style={{
            left: editingConnection.x - 100,
            top: editingConnection.y - 20,
          }}
        >
          <div className="bg-popover border border-border rounded-xl shadow-lg p-2 pointer-events-auto space-y-2">
            {/* Connection Type Selector */}
            <select
              value={editingConnection.type}
              onChange={(e) => handleSaveConnectionType(editingConnection.id, e.target.value as ConnectionType)}
              className="h-8 w-full text-sm bg-background border border-border/50 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(CONNECTION_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>

            {/* Label Input */}
            <Input
              autoFocus
              defaultValue={editingConnection.label}
              placeholder="Add label..."
              className="h-8 w-48 text-sm bg-background border-border/50 rounded-lg font-['Caveat'] text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveConnectionLabel(editingConnection.id, (e.target as HTMLInputElement).value);
                } else if (e.key === 'Escape') {
                  setEditingConnection(null);
                }
              }}
              onBlur={(e) => {
                handleSaveConnectionLabel(editingConnection.id, e.target.value);
              }}
            />
            <p className="text-[10px] text-muted-foreground px-1">
              Enter to save · Esc to cancel
            </p>
          </div>
        </div>
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
