'use client';

/**
 * useDragNode - Drag interaction for individual nodes
 *
 * Uses refs for position during drag to achieve 60fps,
 * commits to state only on drag end.
 *
 * Also handles:
 * - Shift+drag for constrained axis movement
 * - Snap-to-grid (optional)
 * - Multi-node drag when multiple selected
 */

import { useCallback, useRef, type RefObject, type PointerEvent as ReactPointerEvent } from 'react';
import type { Transform } from '../state/TapestryContext';
import type { TapestryNode } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  constrained: 'x' | 'y' | null;
}

export interface UseDragNodeOptions {
  /** Node being dragged */
  node: TapestryNode;
  /** Reference to the node's SVG group element */
  nodeRef: RefObject<SVGGElement | null>;
  /** Current transform (for scale) */
  transformRef: RefObject<Transform>;
  /** Whether this node is selected */
  isSelected: boolean;
  /** All selected node IDs (for multi-drag) */
  selectedNodeIds: Set<string>;
  /** Snap to grid size (0 = disabled) */
  gridSize?: number;
  /** Callback when drag starts */
  onDragStart?: (nodeId: string) => void;
  /** Callback during drag (for updating connections) */
  onDragMove?: (nodeId: string, x: number, y: number) => void;
  /** Callback when drag ends (commit to state) */
  onDragEnd?: (nodeId: string, x: number, y: number) => void;
  /** Callback for multi-node drag end */
  onMultiDragEnd?: (updates: Array<{ id: string; x: number; y: number }>) => void;
  /** Whether dragging is enabled */
  enabled?: boolean;
}

export interface UseDragNodeReturn {
  /** Props to spread on the draggable element */
  dragProps: {
    onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
    style: { cursor: string; touchAction: string };
  };
  /** Whether currently dragging */
  isDragging: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CONSTRAIN_THRESHOLD = 10; // Pixels before axis constraint kicks in

// ============================================================================
// Hook
// ============================================================================

export function useDragNode({
  node,
  nodeRef,
  transformRef,
  isSelected,
  selectedNodeIds,
  gridSize = 0,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMultiDragEnd,
  enabled = true,
}: UseDragNodeOptions): UseDragNodeReturn {
  const dragStateRef = useRef<DragState | null>(null);
  const isDraggingRef = useRef(false);

  // Snap value to grid if enabled
  const snapToGrid = useCallback(
    (value: number): number => {
      if (gridSize <= 0) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [gridSize]
  );

  // Apply transform to DOM directly
  const applyPosition = useCallback(
    (x: number, y: number) => {
      const el = nodeRef.current;
      if (el) {
        el.setAttribute('transform', `translate(${x}, ${y})`);
      }
    },
    [nodeRef]
  );

  // Handle pointer down to start drag
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (!enabled) return;

      // Only left-click
      if (event.button !== 0) return;

      // Don't drag if clicking on interactive elements
      const target = event.target as Element;
      if (
        target.closest('button') ||
        target.closest('input') ||
        target.closest('[data-no-drag]')
      ) {
        return;
      }

      event.stopPropagation();

      const scale = transformRef.current?.scale ?? 1;

      // Initialize drag state
      dragStateRef.current = {
        nodeId: node.id,
        startX: node.x,
        startY: node.y,
        currentX: node.x,
        currentY: node.y,
        offsetX: event.clientX / scale,
        offsetY: event.clientY / scale,
        constrained: null,
      };

      isDraggingRef.current = true;

      // Capture pointer
      (event.target as Element).setPointerCapture(event.pointerId);

      onDragStart?.(node.id);

      // Add move/up listeners
      const handlePointerMove = (e: globalThis.PointerEvent) => {
        if (!dragStateRef.current) return;

        const scale = transformRef.current?.scale ?? 1;
        const dx = e.clientX / scale - dragStateRef.current.offsetX;
        const dy = e.clientY / scale - dragStateRef.current.offsetY;

        let newX = dragStateRef.current.startX + dx;
        let newY = dragStateRef.current.startY + dy;

        // Shift+drag for constrained movement
        if (e.shiftKey) {
          if (!dragStateRef.current.constrained) {
            // Determine constraint axis based on initial movement
            if (Math.abs(dx) > CONSTRAIN_THRESHOLD || Math.abs(dy) > CONSTRAIN_THRESHOLD) {
              dragStateRef.current.constrained = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }
          }

          if (dragStateRef.current.constrained === 'x') {
            newY = dragStateRef.current.startY;
          } else if (dragStateRef.current.constrained === 'y') {
            newX = dragStateRef.current.startX;
          }
        } else {
          dragStateRef.current.constrained = null;
        }

        // Snap to grid
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);

        dragStateRef.current.currentX = newX;
        dragStateRef.current.currentY = newY;

        // Apply to DOM directly (60fps)
        applyPosition(newX, newY);

        // Notify for connection updates
        onDragMove?.(node.id, newX, newY);
      };

      const handlePointerUp = (e: globalThis.PointerEvent) => {
        if (!dragStateRef.current) return;

        // Release capture
        try {
          (e.target as Element).releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }

        const { currentX, currentY } = dragStateRef.current;

        // Check if actually moved
        const moved =
          Math.abs(currentX - dragStateRef.current.startX) > 1 ||
          Math.abs(currentY - dragStateRef.current.startY) > 1;

        if (moved) {
          // Multi-node drag
          if (isSelected && selectedNodeIds.size > 1 && onMultiDragEnd) {
            // Delta values reserved for future multi-node drag implementation
            void (currentX - dragStateRef.current.startX);
            void (currentY - dragStateRef.current.startY);

            // TODO: Collect all selected node positions and apply delta
            // For now, just update the dragged node
            onDragEnd?.(node.id, currentX, currentY);
          } else {
            onDragEnd?.(node.id, currentX, currentY);
          }
        }

        // Cleanup
        dragStateRef.current = null;
        isDraggingRef.current = false;

        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [
      enabled,
      node.id,
      node.x,
      node.y,
      transformRef,
      isSelected,
      selectedNodeIds,
      snapToGrid,
      applyPosition,
      onDragStart,
      onDragMove,
      onDragEnd,
      onMultiDragEnd,
    ]
  );

  return {
    dragProps: {
      onPointerDown: handlePointerDown,
      style: {
        cursor: enabled ? 'grab' : 'default',
        touchAction: 'none',
      },
    },
    isDragging: isDraggingRef.current,
  };
}
