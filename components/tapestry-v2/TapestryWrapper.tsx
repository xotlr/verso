'use client';

/**
 * TapestryWrapper - Bridge between old Tapestry API and new TapestryCanvas
 *
 * Uses the proper barycenter layout algorithm from lib/tapestry/layout.ts
 * to match the D3 version's grouping and edge-crossing minimization.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTapestryHistory } from '@/hooks/tapestry/use-tapestry-history';
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
  NODE_TYPE_COLORS,
  NOTE_COLORS,
} from '@/types/tapestry';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import { Scene, Location } from '@/types/screenplay';
import type { IndexCard } from '@/components/index-cards';
import type { CharacterInfo } from '@/hooks/editor/types';
import { useSettings } from '@/contexts/settings-context';
import '@/styles/tapestry.css';

// Layout engine
import { computeLayout } from '@/lib/tapestry/layout';
import type { LayoutResult, HighlightState } from '@/lib/tapestry/types';
import { INITIAL_HIGHLIGHT_STATE } from '@/lib/tapestry/types';

import { TapestryCanvas, type TapestryCanvasHandle } from './TapestryCanvas';
import type { ContextMenuState } from './hooks/useContextMenu';

// ============================================================================
// Types
// ============================================================================

interface TapestryProps {
  screenplayId: string;
  screenplayTitle: string;
  scenes?: Scene[];
  characters?: CharacterInfo[];
  locations?: Location[];
  onSceneClick?: (sceneId: string) => void;
}

// ============================================================================
// Storage helpers
// ============================================================================

function getIndexCardsStorageKey(screenplayId: string): string {
  return `verso-cards-${screenplayId}`;
}

function loadIndexCards(screenplayId: string): IndexCard[] {
  const result = safeGetItem<IndexCard[]>(getIndexCardsStorageKey(screenplayId));
  if (result.success && result.data) {
    return result.data;
  }
  return [];
}

function loadTapestryState(screenplayId: string): TapestryState | null {
  const key = getTapestryStorageKey(screenplayId);
  const result = safeGetItem<TapestryState>(key);
  if (result.success && result.data) {
    return migrateTapestryState(result.data);
  }
  return null;
}

function saveTapestryState(screenplayId: string, state: TapestryState): void {
  const key = getTapestryStorageKey(screenplayId);
  safeSetItem(key, state);
}

// ============================================================================
// Act Grouping Helpers
// ============================================================================

/**
 * Determine which act a scene belongs to based on scene number.
 * Default 3-act structure:
 * - Act 1: Scenes 1-30
 * - Act 2: Scenes 31-90
 * - Act 3: Scenes 91+
 */
function getActNumber(sceneNumber: number): number {
  if (sceneNumber <= 30) return 1;
  if (sceneNumber <= 90) return 2;
  return 3;
}

/**
 * Get unique act numbers from scenes sorted in order
 */
function getActsFromScenes(scenes: Scene[]): number[] {
  const acts = new Set<number>();
  scenes.forEach(scene => {
    if (scene.number) {
      acts.add(getActNumber(scene.number));
    }
  });
  return Array.from(acts).sort((a, b) => a - b);
}

// ============================================================================
// Simple Context Menu Component
// ============================================================================

interface SimpleContextMenuProps {
  x: number;
  y: number;
  items: Array<{ label: string; action: () => void; destructive?: boolean }>;
  onClose: () => void;
}

function SimpleContextMenu({ x, y, items, onClose }: SimpleContextMenuProps) {
  return (
    <div
      className="fixed bg-popover border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
            item.destructive ? 'text-destructive' : 'text-foreground'
          }`}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Simple Toolbar Component
// ============================================================================

interface SimpleToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitToContent: () => void;
  onAutoCluster: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function SimpleToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToContent,
  onAutoCluster,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: SimpleToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-sm">
      <button
        className="p-2 hover:bg-accent rounded disabled:opacity-50"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        className="p-2 hover:bg-accent rounded disabled:opacity-50"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        className="p-2 hover:bg-accent rounded"
        onClick={onZoomIn}
        title="Zoom In"
      >
        +
      </button>
      <button
        className="p-2 hover:bg-accent rounded"
        onClick={onZoomOut}
        title="Zoom Out"
      >
        −
      </button>
      <button
        className="p-2 hover:bg-accent rounded text-xs"
        onClick={onResetView}
        title="Reset View"
      >
        1:1
      </button>
      <button
        className="p-2 hover:bg-accent rounded text-xs"
        onClick={onFitToContent}
        title="Fit to Content"
      >
        Fit
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        className="p-2 hover:bg-accent rounded text-xs"
        onClick={onAutoCluster}
        title="Auto Layout"
      >
        Auto
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Tapestry({
  screenplayId,
  screenplayTitle,
  scenes = [],
  characters = [],
  locations = [],
  onSceneClick,
}: TapestryProps) {
  const canvasRef = useRef<TapestryCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Settings for theme
  const { settings } = useSettings();

  // State management with undo/redo
  const {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetState,
  } = useTapestryHistory(createEmptyTapestry());

  // Highlight state for showing connections
  const [highlightState, setHighlightState] = useState<HighlightState>(INITIAL_HIGHLIGHT_STATE);

  // UI State
  const [initialized, setInitialized] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    const saved = loadTapestryState(screenplayId);
    if (saved && saved.nodes.length > 0) {
      resetState(saved);
      setInitialized(true);
    }
  }, [screenplayId, resetState]);

  // Initialize from scenes/characters using proper layout
  useEffect(() => {
    if (initialized || state.nodes.length > 0) return;
    if (scenes.length === 0 && characters.length === 0) return;

    const indexCards = loadIndexCards(screenplayId);
    const cardMap = new Map(indexCards.map(c => [c.sceneId, c]));

    // Create nodes without positions first
    const nodes: TapestryNode[] = [];
    const connections: TapestryConnection[] = [];

    // Create character nodes
    characters.forEach((char) => {
      nodes.push(createNode({
        type: 'character',
        x: 0, // Will be set by layout
        y: 0,
        title: char.name,
        content: `${char.dialogueCount} dialogue${char.dialogueCount !== 1 ? 's' : ''}`,
        characterId: char.id,
        dialogueCount: char.dialogueCount,
        sceneAppearances: scenes
          .filter(s => s.characters?.includes(char.name))
          .map(s => s.id),
      }));
    });

    // Create scene nodes
    scenes.forEach((scene, i) => {
      const card = cardMap.get(scene.id);
      nodes.push(createNode({
        type: 'scene',
        x: 0,
        y: 0,
        title: `Scene ${scene.number}`,
        content: card?.summary || scene.heading,
        sceneId: scene.id,
        sceneNumber: scene.number,
        timeOfDay: scene.timeOfDay,
        color: card?.color || NODE_TYPE_COLORS.scene,
      }));
    });

    // Create character-scene connections
    const charNodeMap = new Map(
      nodes.filter(n => n.type === 'character').map(n => [n.title, n])
    );
    const sceneNodeMap = new Map(
      nodes.filter(n => n.type === 'scene').map(n => [n.sceneId, n])
    );

    scenes.forEach(scene => {
      const sceneNode = sceneNodeMap.get(scene.id);
      if (!sceneNode) return;

      scene.characters?.forEach(charName => {
        const charNode = charNodeMap.get(charName);
        if (charNode) {
          connections.push(createConnection(
            charNode.id,
            sceneNode.id,
            'appears_in'
          ));
        }
      });
    });

    // Use the proper layout algorithm
    const layout = computeLayout({
      nodes,
      connections,
      config: {
        paddingLeft: 20,
        paddingTop: 40,
        sidebarWidth: 180,
        gutterWidth: 100,
        entityNodeHeight: 60,
        entitySpacing: 16,
        sceneNodeWidth: 160,
        sceneNodeHeight: 100,
        sceneHorizontalSpacing: 20,
        sceneVerticalSpacing: 20,
        actLaneWidth: 200,
        actGap: 40,
        maxScenesPerColumn: 8,
      },
    });

    // Apply layout positions to nodes
    const positionedNodes = nodes.map(node => {
      if (node.type === 'character') {
        const entity = layout.sidebar.characters.find(e => e.nodeId === node.id);
        if (entity) {
          return { ...node, x: 20, y: entity.y };
        }
      } else if (node.type === 'location') {
        const entity = layout.sidebar.locations.find(e => e.nodeId === node.id);
        if (entity) {
          return { ...node, x: 20, y: entity.y };
        }
      } else if (node.type === 'scene') {
        const scenePos = layout.scenes.get(node.id);
        if (scenePos) {
          return { ...node, x: scenePos.x, y: scenePos.y };
        }
      }
      return node;
    });

    // === CREATE ACT GROUPS ===
    // Group scenes by act number (only if multiple acts)
    const groups: TapestryGroup[] = [];
    const acts = getActsFromScenes(scenes);

    if (acts.length > 1) {
      // Track bounds for each act
      const actBounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
      const actGroupIds = new Map<number, string>();

      // Calculate bounds for each act
      positionedNodes.forEach(node => {
        if (node.type === 'scene' && node.sceneNumber) {
          const actNum = getActNumber(node.sceneNumber);
          const bounds = actBounds.get(actNum);
          const nodeWidth = 160;
          const nodeHeight = 100;

          if (!bounds) {
            actBounds.set(actNum, {
              minX: node.x,
              minY: node.y,
              maxX: node.x + nodeWidth,
              maxY: node.y + nodeHeight,
            });
          } else {
            bounds.minX = Math.min(bounds.minX, node.x);
            bounds.minY = Math.min(bounds.minY, node.y);
            bounds.maxX = Math.max(bounds.maxX, node.x + nodeWidth);
            bounds.maxY = Math.max(bounds.maxY, node.y + nodeHeight);
          }
        }
      });

      // Create groups for each act
      const padding = 20;
      actBounds.forEach((bounds, actNum) => {
        const group = createGroup({
          x: bounds.minX - padding,
          y: bounds.minY - 40, // Room for header
          width: bounds.maxX - bounds.minX + padding * 2,
          height: bounds.maxY - bounds.minY + padding + 40,
          title: `Act ${actNum}`,
          color: NOTE_COLORS[(actNum - 1) % NOTE_COLORS.length],
          collapsed: true, // Start collapsed
        });
        actGroupIds.set(actNum, group.id);
        groups.push(group);
      });

      // Assign groupId to scene nodes
      positionedNodes.forEach(node => {
        if (node.type === 'scene' && node.sceneNumber) {
          const actNum = getActNumber(node.sceneNumber);
          const groupId = actGroupIds.get(actNum);
          if (groupId) {
            node.groupId = groupId;
          }
        }
      });
    }

    if (positionedNodes.length > 0) {
      const newState: TapestryState = {
        ...state,
        nodes: positionedNodes,
        connections,
        groups,
      };
      setState(newState);
      setInitialized(true);
    }
  }, [initialized, state, setState, screenplayId, scenes, characters]);

  // Save state changes
  useEffect(() => {
    if (initialized) {
      saveTapestryState(screenplayId, state);
    }
  }, [screenplayId, state, initialized]);

  // Handlers
  const handleNodesChange = useCallback((nodes: TapestryNode[]) => {
    setState((prev: TapestryState): TapestryState => ({ ...prev, nodes }));
  }, [setState]);

  const handleConnectionsChange = useCallback((connections: TapestryConnection[]) => {
    setState((prev: TapestryState): TapestryState => ({ ...prev, connections }));
  }, [setState]);

  const handleGroupsChange = useCallback((groups: TapestryGroup[]) => {
    setState((prev: TapestryState): TapestryState => ({ ...prev, groups }));
  }, [setState]);

  // Handle node selection - toggle highlight to show connections
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      setHighlightState(INITIAL_HIGHLIGHT_STATE);
      return;
    }

    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Toggle lock state - if already locked on this node, unlock
    if (highlightState.lockedCharacterId === nodeId || highlightState.lockedSceneId === nodeId) {
      setHighlightState(INITIAL_HIGHLIGHT_STATE);
    } else if (node.type === 'character') {
      setHighlightState({
        ...INITIAL_HIGHLIGHT_STATE,
        lockedCharacterId: nodeId,
      });
    } else if (node.type === 'scene') {
      setHighlightState({
        ...INITIAL_HIGHLIGHT_STATE,
        lockedSceneId: nodeId,
      });
    }
  }, [state.nodes, highlightState]);

  const handleNodeEdit = useCallback((nodeId: string) => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (node && node.type === 'scene' && node.sceneId) {
      onSceneClick?.(node.sceneId);
    }
  }, [state.nodes, onSceneClick]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setState((prev: TapestryState): TapestryState => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      connections: prev.connections.filter(
        c => c.sourceId !== nodeId && c.targetId !== nodeId
      ),
    }));
  }, [setState]);

  const handleNodesDelete = useCallback((nodeIds: string[]) => {
    const idSet = new Set(nodeIds);
    setState((prev: TapestryState): TapestryState => ({
      ...prev,
      nodes: prev.nodes.filter(n => !idSet.has(n.id)),
      connections: prev.connections.filter(
        c => !idSet.has(c.sourceId) && !idSet.has(c.targetId)
      ),
    }));
  }, [setState]);

  const handleOpenProfile = useCallback((nodeId: string) => {
    const node = state.nodes.find(n => n.id === nodeId);
    if (node?.type === 'character') {
      // Show connections by locking highlight
      setHighlightState({
        ...INITIAL_HIGHLIGHT_STATE,
        lockedCharacterId: nodeId,
      });
    }
  }, [state.nodes]);

  const handleAddNode = useCallback((type: TapestryNodeType, position: { x: number; y: number }) => {
    const newNode = createNode({
      type,
      x: position.x,
      y: position.y,
      title: type === 'note' ? 'New Note' : `New ${type}`,
      content: '',
    });
    setState((prev: TapestryState): TapestryState => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
  }, [setState]);

  const handleConnectionLabelEdit = useCallback((connectionId: string, label: string) => {
    setState((prev: TapestryState): TapestryState => ({
      ...prev,
      connections: prev.connections.map(c =>
        c.id === connectionId ? { ...c, label } : c
      ),
    }));
  }, [setState]);

  // Context menu renderer
  const renderContextMenu = useCallback((menuState: ContextMenuState, onClose: () => void) => {
    const items: Array<{ label: string; action: () => void; destructive?: boolean }> = [];

    if (menuState.nodeId) {
      const node = state.nodes.find(n => n.id === menuState.nodeId);
      if (node) {
        if (node.type === 'scene' && node.sceneId) {
          items.push({
            label: 'Go to Scene',
            action: () => onSceneClick?.(node.sceneId!),
          });
        }
        items.push({
          label: 'Show Connections',
          action: () => handleNodeSelect(menuState.nodeId!),
        });
        items.push({
          label: 'Delete',
          action: () => handleNodeDelete(menuState.nodeId!),
          destructive: true,
        });
      }
    } else {
      items.push(
        {
          label: 'Add Note',
          action: () => handleAddNode('note', { x: menuState.x, y: menuState.y }),
        },
        {
          label: 'Add Item',
          action: () => handleAddNode('item', { x: menuState.x, y: menuState.y }),
        }
      );
    }

    if (items.length === 0) return null;

    return (
      <SimpleContextMenu
        x={menuState.x}
        y={menuState.y}
        items={items}
        onClose={onClose}
      />
    );
  }, [state.nodes, handleNodeDelete, handleAddNode, handleNodeSelect, onSceneClick]);

  // Toolbar actions
  const handleZoomIn = useCallback(() => canvasRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => canvasRef.current?.zoomOut(), []);
  const handleResetView = useCallback(() => canvasRef.current?.resetView(), []);
  const handleFitToContent = useCallback(() => canvasRef.current?.fitToContent(), []);

  // Re-run layout algorithm with grouping
  const handleAutoCluster = useCallback(() => {
    if (state.nodes.length === 0) return;

    const layout = computeLayout({
      nodes: state.nodes,
      connections: state.connections,
    });

    const positionedNodes = state.nodes.map(node => {
      if (node.type === 'character') {
        const entity = layout.sidebar.characters.find(e => e.nodeId === node.id);
        if (entity) {
          return { ...node, x: 20, y: entity.y, groupId: undefined };
        }
      } else if (node.type === 'location') {
        const entity = layout.sidebar.locations.find(e => e.nodeId === node.id);
        if (entity) {
          return { ...node, x: 20, y: entity.y, groupId: undefined };
        }
      } else if (node.type === 'scene') {
        const scenePos = layout.scenes.get(node.id);
        if (scenePos) {
          return { ...node, x: scenePos.x, y: scenePos.y, groupId: undefined };
        }
      }
      return node;
    });

    // Re-create Act groups
    const groups: TapestryGroup[] = [];
    const sceneNodes = positionedNodes.filter(n => n.type === 'scene' && n.sceneNumber);
    const acts = new Set<number>();
    sceneNodes.forEach(n => acts.add(getActNumber(n.sceneNumber!)));
    const sortedActs = Array.from(acts).sort((a, b) => a - b);

    if (sortedActs.length > 1) {
      const actBounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
      const actGroupIds = new Map<number, string>();

      sceneNodes.forEach(node => {
        const actNum = getActNumber(node.sceneNumber!);
        const bounds = actBounds.get(actNum);
        const nodeWidth = 160;
        const nodeHeight = 100;

        if (!bounds) {
          actBounds.set(actNum, {
            minX: node.x,
            minY: node.y,
            maxX: node.x + nodeWidth,
            maxY: node.y + nodeHeight,
          });
        } else {
          bounds.minX = Math.min(bounds.minX, node.x);
          bounds.minY = Math.min(bounds.minY, node.y);
          bounds.maxX = Math.max(bounds.maxX, node.x + nodeWidth);
          bounds.maxY = Math.max(bounds.maxY, node.y + nodeHeight);
        }
      });

      const padding = 20;
      actBounds.forEach((bounds, actNum) => {
        const group = createGroup({
          x: bounds.minX - padding,
          y: bounds.minY - 40,
          width: bounds.maxX - bounds.minX + padding * 2,
          height: bounds.maxY - bounds.minY + padding + 40,
          title: `Act ${actNum}`,
          color: NOTE_COLORS[(actNum - 1) % NOTE_COLORS.length],
          collapsed: true, // Start collapsed
        });
        actGroupIds.set(actNum, group.id);
        groups.push(group);
      });

      positionedNodes.forEach(node => {
        if (node.type === 'scene' && node.sceneNumber) {
          const actNum = getActNumber(node.sceneNumber);
          node.groupId = actGroupIds.get(actNum);
        }
      });
    }

    setState((prev: TapestryState): TapestryState => ({
      ...prev,
      nodes: positionedNodes,
      groups,
    }));
  }, [state.nodes, state.connections, setState]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Toolbar */}
      <SimpleToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFitToContent={handleFitToContent}
        onAutoCluster={handleAutoCluster}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Click anywhere to clear highlight */}
      {(highlightState.lockedCharacterId || highlightState.lockedSceneId) && (
        <div className="absolute top-4 right-4 z-10">
          <button
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90"
            onClick={() => setHighlightState(INITIAL_HIGHLIGHT_STATE)}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Main Canvas */}
      <TapestryCanvas
        ref={canvasRef}
        nodes={state.nodes}
        connections={state.connections}
        groups={state.groups}
        showGrid={true}
        showMinimap={true}
        onNodesChange={handleNodesChange}
        onConnectionsChange={handleConnectionsChange}
        onGroupsChange={handleGroupsChange}
        onNodeSelect={handleNodeSelect}
        onNodeEdit={handleNodeEdit}
        onNodeDelete={handleNodeDelete}
        onNodesDelete={handleNodesDelete}
        onOpenProfile={handleOpenProfile}
        onAddNode={handleAddNode}
        onConnectionLabelEdit={handleConnectionLabelEdit}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        renderContextMenu={renderContextMenu}
        highlightState={highlightState}
        onHighlightChange={setHighlightState}
      />
    </div>
  );
}

export default Tapestry;
