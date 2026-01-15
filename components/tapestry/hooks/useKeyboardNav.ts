'use client';

/**
 * useKeyboardNav - Keyboard navigation and shortcuts
 *
 * Supports:
 * - Tab/Shift+Tab to cycle through nodes
 * - Arrow keys to move selection
 * - Delete/Backspace to delete
 * - Escape to deselect
 * - Ctrl+A to select all
 * - +/- for zoom
 */

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { TapestryNode } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface UseKeyboardNavOptions {
  /** Reference to the container element */
  containerRef: RefObject<SVGSVGElement | null>;
  /** All nodes (for navigation) */
  nodes: TapestryNode[];
  /** Currently selected node IDs */
  selectedNodeIds: Set<string>;
  /** Callback to select nodes */
  onSelectNodes: (nodeIds: string[]) => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to delete selected nodes */
  onDeleteSelected?: () => void;
  /** Callback to edit a node */
  onEditNode?: (nodeId: string) => void;
  /** Callback to zoom in */
  onZoomIn?: () => void;
  /** Callback to zoom out */
  onZoomOut?: () => void;
  /** Callback to reset view */
  onResetView?: () => void;
  /** Callback to undo */
  onUndo?: () => void;
  /** Callback to redo */
  onRedo?: () => void;
  /** Whether keyboard nav is enabled */
  enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useKeyboardNav({
  containerRef,
  nodes,
  selectedNodeIds,
  onSelectNodes,
  onClearSelection,
  onDeleteSelected,
  onEditNode,
  onZoomIn,
  onZoomOut,
  onResetView,
  onUndo,
  onRedo,
  enabled = true,
}: UseKeyboardNavOptions): void {
  const focusedIndexRef = useRef(0);

  // Get sorted nodes for consistent navigation order
  const getSortedNodes = useCallback(() => {
    return [...nodes].sort((a, b) => {
      // Sort by y first, then by x (reading order)
      if (Math.abs(a.y - b.y) > 50) return a.y - b.y;
      return a.x - b.x;
    });
  }, [nodes]);

  // Focus a node element
  const focusNode = useCallback((nodeId: string) => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as SVGGElement | null;
    if (el) {
      el.focus();
    }
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle if typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const sortedNodes = getSortedNodes();
      if (sortedNodes.length === 0) return;

      switch (event.key) {
        case 'Tab': {
          event.preventDefault();

          // Get current index
          const currentSelected = Array.from(selectedNodeIds)[0];
          let currentIndex = sortedNodes.findIndex(n => n.id === currentSelected);
          if (currentIndex === -1) currentIndex = focusedIndexRef.current;

          // Move to next/previous
          let nextIndex: number;
          if (event.shiftKey) {
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) nextIndex = sortedNodes.length - 1;
          } else {
            nextIndex = currentIndex + 1;
            if (nextIndex >= sortedNodes.length) nextIndex = 0;
          }

          focusedIndexRef.current = nextIndex;
          const nextNode = sortedNodes[nextIndex];
          onSelectNodes([nextNode.id]);
          focusNode(nextNode.id);
          break;
        }

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          event.preventDefault();

          if (selectedNodeIds.size === 0) {
            // Select first node
            const firstNode = sortedNodes[0];
            onSelectNodes([firstNode.id]);
            focusNode(firstNode.id);
            break;
          }

          // Find node in the direction
          const currentId = Array.from(selectedNodeIds)[0];
          const currentNode = nodes.find(n => n.id === currentId);
          if (!currentNode) break;

          let bestNode: TapestryNode | null = null;
          let bestDistance = Infinity;

          for (const node of nodes) {
            if (node.id === currentId) continue;

            const dx = node.x - currentNode.x;
            const dy = node.y - currentNode.y;

            // Check if node is in the right direction
            let isValid = false;
            switch (event.key) {
              case 'ArrowUp':
                isValid = dy < -20;
                break;
              case 'ArrowDown':
                isValid = dy > 20;
                break;
              case 'ArrowLeft':
                isValid = dx < -20;
                break;
              case 'ArrowRight':
                isValid = dx > 20;
                break;
            }

            if (isValid) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < bestDistance) {
                bestDistance = distance;
                bestNode = node;
              }
            }
          }

          if (bestNode) {
            onSelectNodes([bestNode.id]);
            focusNode(bestNode.id);
          }
          break;
        }

        case 'Delete':
        case 'Backspace': {
          if (selectedNodeIds.size > 0) {
            event.preventDefault();
            onDeleteSelected?.();
          }
          break;
        }

        case 'Escape': {
          event.preventDefault();
          onClearSelection();
          break;
        }

        case 'a':
        case 'A': {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            onSelectNodes(nodes.map(n => n.id));
          }
          break;
        }

        case 'e':
        case 'E': {
          if (!event.metaKey && !event.ctrlKey && selectedNodeIds.size === 1) {
            event.preventDefault();
            const nodeId = Array.from(selectedNodeIds)[0];
            onEditNode?.(nodeId);
          }
          break;
        }

        case '=':
        case '+': {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            onZoomIn?.();
          }
          break;
        }

        case '-':
        case '_': {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            onZoomOut?.();
          }
          break;
        }

        case '0': {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            onResetView?.();
          }
          break;
        }

        case 'z':
        case 'Z': {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            if (event.shiftKey) {
              // Ctrl/Cmd+Shift+Z = Redo
              onRedo?.();
            } else {
              // Ctrl/Cmd+Z = Undo
              onUndo?.();
            }
          }
          break;
        }

        case 'y':
        case 'Y': {
          if (event.metaKey || event.ctrlKey) {
            // Ctrl/Cmd+Y = Redo (Windows convention)
            event.preventDefault();
            onRedo?.();
          }
          break;
        }

        case 'Enter':
        case ' ': {
          // These are handled by the node itself
          break;
        }
      }
    },
    [
      enabled,
      nodes,
      selectedNodeIds,
      getSortedNodes,
      focusNode,
      onSelectNodes,
      onClearSelection,
      onDeleteSelected,
      onEditNode,
      onZoomIn,
      onZoomOut,
      onResetView,
      onUndo,
      onRedo,
    ]
  );

  // Attach event listener to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Listen on document since SVG elements don't receive keyboard events well
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, enabled, handleKeyDown]);
}
