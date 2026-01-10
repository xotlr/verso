/**
 * Tapestry Navigation Hook
 *
 * Handles keyboard navigation (arrow nudge, tab cycle) for tapestry nodes.
 */

import { useCallback } from 'react';
import {
  TapestryState,
  GRID_MINOR_SPACING,
} from '@/types/tapestry';

interface UseTapestryNavigationOptions {
  state: TapestryState;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
  selectedNodes: Set<string>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  snapToGrid: boolean;
}

export function useTapestryNavigation({
  state,
  setState,
  saveState,
  selectedNodes,
  setSelectedNodes,
  snapToGrid,
}: UseTapestryNavigationOptions) {
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
  }, [selectedNodes, saveState, setState, snapToGrid, snapToGridValue]);

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

    const nextNodeId = sortedNodes[nextIndex].id;
    setSelectedNodes(new Set([nextNodeId]));

    // Move focus to the selected node for keyboard accessibility
    requestAnimationFrame(() => {
      const nodeEl = document.querySelector(`[data-node-id="${nextNodeId}"]`) as HTMLElement | null;
      if (nodeEl) {
        nodeEl.focus();
      }
    });
  }, [state.nodes, selectedNodes, setSelectedNodes]);

  return {
    handleNudgeSelected,
    handleCycleSelection,
    snapToGridValue,
  };
}
