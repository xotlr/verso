/**
 * Tapestry Clipboard Hook
 *
 * Handles clipboard operations (copy, paste, duplicate) for tapestry nodes.
 */

import { useState, useCallback } from 'react';
import type { ZoomTransform } from 'd3-zoom';
import {
  TapestryNode,
  TapestryState,
  createNode,
  GRID_MAJOR_SPACING,
} from '@/types/tapestry';

interface UseTapestryClipboardOptions {
  state: TapestryState;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
  selectedNodes: Set<string>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  dimensions: { width: number; height: number };
  transformRef: React.MutableRefObject<ZoomTransform>;
}

export function useTapestryClipboard({
  state,
  setState,
  saveState,
  selectedNodes,
  setSelectedNodes,
  dimensions,
  transformRef,
}: UseTapestryClipboardOptions) {
  const [clipboard, setClipboard] = useState<TapestryNode[]>([]);

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
  }, [clipboard, dimensions, saveState, setState, setSelectedNodes, transformRef]);

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
  }, [state.nodes, selectedNodes, saveState, setState, setSelectedNodes]);

  return {
    clipboard,
    handleCopyNodes,
    handlePasteNodes,
    handleDuplicateSelected,
  };
}
