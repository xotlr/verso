'use client';

/**
 * TapestryWrapper - Bridge between old Tapestry API and new TapestryCanvas
 *
 * Uses the proper barycenter layout algorithm from lib/tapestry/layout.ts
 * to match the D3 version's grouping and edge-crossing minimization.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTapestryHistory } from '@/hooks/tapestry/use-tapestry-history';
import { createInitialLayout, recomputeLayout } from '@/hooks/tapestry/use-tapestry-init';
import {
  TapestryNode,
  TapestryConnection,
  TapestryGroup,
  TapestryState,
  TapestryNodeType,
  createNode,
  createEmptyTapestry,
  getTapestryStorageKey,
  migrateTapestryState,
} from '@/types/tapestry';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import { Scene, Location } from '@/types/screenplay';
import type { IndexCard } from '@/types/index-cards';
import type { CharacterInfo } from '@/hooks/editor/types';
import '@/styles/tapestry.css';

import type { HighlightState } from '@/lib/tapestry/types';
import { INITIAL_HIGHLIGHT_STATE } from '@/lib/tapestry/types';

import { TapestryCanvas, type TapestryCanvasHandle } from './TapestryCanvas';
import { SimpleToolbar } from './SimpleToolbar';
import { SimpleContextMenu } from './SimpleContextMenu';
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
// Main Component
// ============================================================================

export function Tapestry({
  screenplayId,
  screenplayTitle: _screenplayTitle,
  scenes = [],
  characters = [],
  locations: _locations = [],
  onSceneClick,
}: TapestryProps) {
  const canvasRef = useRef<TapestryCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);


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
    const { nodes, connections, groups } = createInitialLayout(scenes, characters, indexCards);

    if (nodes.length > 0) {
      const newState: TapestryState = {
        ...state,
        nodes,
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
    setState(recomputeLayout(state));
  }, [state, setState]);

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
