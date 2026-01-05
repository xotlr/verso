'use client';

/**
 * useDragGroup - Drag interaction for groups and their children
 *
 * When dragging a group:
 * - The group background moves
 * - All child nodes move with it
 * - Connections update in real-time
 */

import { useCallback, useRef, type RefObject, type PointerEvent as ReactPointerEvent } from 'react';
import type { Transform } from '../state/TapestryContext';
import type { TapestryGroup, TapestryNode } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

interface GroupDragState {
  groupId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  childNodeIds: string[];
  childStartPositions: Map<string, { x: number; y: number }>;
}

export interface UseDragGroupOptions {
  /** Group being dragged */
  group: TapestryGroup;
  /** Reference to the group's SVG element */
  groupRef: RefObject<SVGGElement | null>;
  /** Current transform (for scale) */
  transformRef: RefObject<Transform>;
  /** All nodes (to find children) */
  nodes: TapestryNode[];
  /** Callback when drag starts */
  onDragStart?: (groupId: string) => void;
  /** Callback during drag (for updating UI) */
  onDragMove?: (groupId: string, dx: number, dy: number) => void;
  /** Callback when drag ends */
  onDragEnd?: (
    groupId: string,
    groupPosition: { x: number; y: number },
    childUpdates: Array<{ id: string; x: number; y: number }>
  ) => void;
  /** Whether dragging is enabled */
  enabled?: boolean;
}

export interface UseDragGroupReturn {
  /** Props to spread on the draggable header */
  dragProps: {
    onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
    style: { cursor: string; touchAction: string };
  };
  /** Whether currently dragging */
  isDragging: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useDragGroup({
  group,
  groupRef,
  transformRef,
  nodes,
  onDragStart,
  onDragMove,
  onDragEnd,
  enabled = true,
}: UseDragGroupOptions): UseDragGroupReturn {
  const dragStateRef = useRef<GroupDragState | null>(null);
  const isDraggingRef = useRef(false);

  // Find child nodes of this group
  const getChildNodes = useCallback(() => {
    return nodes.filter(node => node.groupId === group.id);
  }, [nodes, group.id]);

  // Apply position to group element
  const applyGroupPosition = useCallback(
    (x: number, y: number) => {
      const el = groupRef.current;
      if (el) {
        el.setAttribute('transform', `translate(${x}, ${y})`);
      }
    },
    [groupRef]
  );

  // Apply position to a child node (by querying DOM)
  const applyChildPosition = useCallback((nodeId: string, x: number, y: number) => {
    const el = document.querySelector(`[data-node-id="${nodeId}"]`) as SVGGElement | null;
    if (el) {
      el.setAttribute('transform', `translate(${x}, ${y})`);
    }
  }, []);

  // Handle pointer down to start drag
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGElement>) => {
      if (!enabled) return;
      if (event.button !== 0) return;

      event.stopPropagation();

      const scale = transformRef.current?.scale ?? 1;
      const childNodes = getChildNodes();

      // Store initial positions of all children
      const childStartPositions = new Map<string, { x: number; y: number }>();
      childNodes.forEach(node => {
        childStartPositions.set(node.id, { x: node.x, y: node.y });
      });

      dragStateRef.current = {
        groupId: group.id,
        startX: group.x,
        startY: group.y,
        currentX: group.x,
        currentY: group.y,
        offsetX: event.clientX / scale,
        offsetY: event.clientY / scale,
        childNodeIds: childNodes.map(n => n.id),
        childStartPositions,
      };

      isDraggingRef.current = true;
      (event.target as Element).setPointerCapture(event.pointerId);

      onDragStart?.(group.id);

      const handlePointerMove = (e: globalThis.PointerEvent) => {
        if (!dragStateRef.current) return;

        const scale = transformRef.current?.scale ?? 1;
        const dx = e.clientX / scale - dragStateRef.current.offsetX;
        const dy = e.clientY / scale - dragStateRef.current.offsetY;

        const newX = dragStateRef.current.startX + dx;
        const newY = dragStateRef.current.startY + dy;

        dragStateRef.current.currentX = newX;
        dragStateRef.current.currentY = newY;

        // Move the group
        applyGroupPosition(newX, newY);

        // Move all child nodes
        dragStateRef.current.childStartPositions.forEach((startPos, nodeId) => {
          applyChildPosition(nodeId, startPos.x + dx, startPos.y + dy);
        });

        onDragMove?.(group.id, dx, dy);
      };

      const handlePointerUp = (e: globalThis.PointerEvent) => {
        if (!dragStateRef.current) return;

        try {
          (e.target as Element).releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }

        const { currentX, currentY, startX, startY, childStartPositions } = dragStateRef.current;
        const dx = currentX - startX;
        const dy = currentY - startY;

        // Build child updates
        const childUpdates: Array<{ id: string; x: number; y: number }> = [];
        childStartPositions.forEach((startPos, nodeId) => {
          childUpdates.push({
            id: nodeId,
            x: startPos.x + dx,
            y: startPos.y + dy,
          });
        });

        onDragEnd?.(group.id, { x: currentX, y: currentY }, childUpdates);

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
      group.id,
      group.x,
      group.y,
      transformRef,
      getChildNodes,
      applyGroupPosition,
      applyChildPosition,
      onDragStart,
      onDragMove,
      onDragEnd,
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
