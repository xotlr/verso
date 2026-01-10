'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { TapestryNode, TapestryConnection } from '@/types/tapestry';

export interface MarqueeState {
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

export interface HighlightState {
  hoveredCharacterId: string | null;
  hoveredSceneId: string | null;
  lockedCharacterId: string | null;
  lockedSceneId: string | null;
}

export const INITIAL_HIGHLIGHT_STATE: HighlightState = {
  hoveredCharacterId: null,
  hoveredSceneId: null,
  lockedCharacterId: null,
  lockedSceneId: null,
};

interface UseTapestrySelectionOptions {
  nodes: TapestryNode[];
  connections: TapestryConnection[];
}

/**
 * Hook for managing tapestry selection state.
 * Handles node selection, connection mode, marquee selection, and highlighting.
 */
export function useTapestrySelection({ nodes, connections }: UseTapestrySelectionOptions) {
  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Connection mode state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const marqueeRef = useRef<MarqueeState>({ start: null, end: null });

  // Highlight state for edge bundling interactions
  const [highlightState, setHighlightState] = useState<HighlightState>(INITIAL_HIGHLIGHT_STATE);

  // Calculate highlighted connections and nodes based on selection
  const { highlightedConnections, highlightedNodeIds } = useMemo(() => {
    if (selectedNodes.size === 0) {
      return { highlightedConnections: new Set<string>(), highlightedNodeIds: new Set<string>() };
    }

    const connIds = new Set<string>();
    const nodeIds = new Set<string>(selectedNodes);

    connections.forEach(conn => {
      if (selectedNodes.has(conn.sourceId) || selectedNodes.has(conn.targetId)) {
        connIds.add(conn.id);
        nodeIds.add(conn.sourceId);
        nodeIds.add(conn.targetId);
      }
    });

    return { highlightedConnections: connIds, highlightedNodeIds: nodeIds };
  }, [selectedNodes, connections]);

  // Check if any highlight is active
  const hasAnyHighlight = !!(
    highlightState.hoveredCharacterId ||
    highlightState.hoveredSceneId ||
    highlightState.lockedCharacterId ||
    highlightState.lockedSceneId
  );

  // Selection handlers
  const selectNode = useCallback((nodeId: string, addToSelection = false) => {
    setSelectedNodes(prev => {
      if (addToSelection) {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      }
      return new Set([nodeId]);
    });
  }, []);

  const selectNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodes(new Set(nodeIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set());
    setIsConnecting(false);
    setConnectingFrom(null);
  }, []);

  // Connection mode handlers
  const startConnecting = useCallback((fromNodeId: string) => {
    setIsConnecting(true);
    setConnectingFrom(fromNodeId);
    setSelectedNodes(new Set([fromNodeId]));
  }, []);

  const cancelConnecting = useCallback(() => {
    setIsConnecting(false);
    setConnectingFrom(null);
  }, []);

  // Marquee selection handlers
  const startMarquee = useCallback((x: number, y: number) => {
    marqueeRef.current = { start: { x, y }, end: { x, y } };
    setIsMarqueeSelecting(true);
    setMarqueeStart({ x, y });
    setMarqueeEnd({ x, y });
  }, []);

  const updateMarquee = useCallback((x: number, y: number) => {
    if (!marqueeRef.current.start) return;
    marqueeRef.current.end = { x, y };
    setMarqueeEnd({ x, y });
  }, []);

  const endMarquee = useCallback((selectNodesInMarquee: (start: { x: number; y: number }, end: { x: number; y: number }) => string[]) => {
    const start = marqueeRef.current.start;
    const end = marqueeRef.current.end;

    if (!start || !end) {
      // No marquee - clear selection
      clearSelection();
    } else {
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);

      if (w < 5 && h < 5) {
        // Treat as simple click - clear selection
        clearSelection();
      } else {
        // Select nodes within marquee
        const selectedIds = selectNodesInMarquee(start, end);
        setSelectedNodes(new Set(selectedIds));
      }
    }

    // Clear marquee state
    marqueeRef.current = { start: null, end: null };
    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeEnd(null);
  }, [clearSelection]);

  // Highlight handlers (for entity sidebar interactions)
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

  const handleSceneHover = useCallback((nodeId: string | null) => {
    setHighlightState(prev => ({
      ...prev,
      hoveredSceneId: nodeId,
    }));
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightState(INITIAL_HIGHLIGHT_STATE);
  }, []);

  // Cycle through node selection with Tab
  const cycleSelection = useCallback((direction: 1 | -1) => {
    if (nodes.length === 0) return;

    // Sort nodes by position (top-left to bottom-right)
    const sortedNodes = [...nodes].sort((a, b) => {
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

    const nextNodeId = sortedNodes[nextIndex].id;
    setSelectedNodes(new Set([nextNodeId]));

    // Return the node ID for focus management
    return nextNodeId;
  }, [nodes, selectedNodes]);

  return {
    // Selection state
    selectedNodes,
    setSelectedNodes,
    selectNode,
    selectNodes,
    clearSelection,

    // Connection mode
    isConnecting,
    connectingFrom,
    startConnecting,
    cancelConnecting,
    setIsConnecting,
    setConnectingFrom,

    // Marquee selection
    isMarqueeSelecting,
    setIsMarqueeSelecting,
    marqueeStart,
    setMarqueeStart,
    marqueeEnd,
    setMarqueeEnd,
    marqueeRef,
    startMarquee,
    updateMarquee,
    endMarquee,

    // Highlighting
    highlightState,
    setHighlightState,
    highlightedConnections,
    highlightedNodeIds,
    hasAnyHighlight,
    handleEntityHover,
    handleEntityClick,
    handleSceneHover,
    clearHighlights,

    // Navigation
    cycleSelection,
  };
}
