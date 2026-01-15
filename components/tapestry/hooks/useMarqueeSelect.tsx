'use client';

/**
 * useMarqueeSelect - Rectangle selection for nodes
 *
 * Click and drag on canvas background to draw selection rectangle.
 * All nodes within the rectangle get selected.
 */

import { useCallback, useRef, useState, useEffect, type RefObject } from 'react';
import type { Transform } from '../state/TapestryContext';
import type { TapestryNode } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseMarqueeSelectOptions {
  /** Reference to the SVG container */
  containerRef: RefObject<SVGSVGElement | null>;
  /** Current transform */
  transformRef: RefObject<Transform>;
  /** All nodes to check for selection */
  nodes: TapestryNode[];
  /** Callback when selection changes */
  onSelectionChange: (nodeIds: string[], additive: boolean) => void;
  /** Whether marquee selection is enabled */
  enabled?: boolean;
}

export interface UseMarqueeSelectReturn {
  /** Current marquee rectangle (null if not selecting) */
  marqueeRect: MarqueeRect | null;
  /** Whether marquee selection is active */
  isSelecting: boolean;
}

// ============================================================================
// Utilities
// ============================================================================

function screenToCanvas(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  transform: Transform
): { x: number; y: number } {
  const x = (screenX - containerRect.left - transform.x) / transform.scale;
  const y = (screenY - containerRect.top - transform.y) / transform.scale;
  return { x, y };
}

function rectContainsNode(rect: MarqueeRect, node: TapestryNode): boolean {
  const { width, height } = getNodeDimensions(node);

  // Node bounds
  const nodeLeft = node.x;
  const nodeRight = node.x + width;
  const nodeTop = node.y;
  const nodeBottom = node.y + height;

  // Marquee bounds (handle negative width/height)
  const left = rect.width >= 0 ? rect.x : rect.x + rect.width;
  const right = rect.width >= 0 ? rect.x + rect.width : rect.x;
  const top = rect.height >= 0 ? rect.y : rect.y + rect.height;
  const bottom = rect.height >= 0 ? rect.y + rect.height : rect.y;

  // Check intersection
  return nodeRight > left && nodeLeft < right && nodeBottom > top && nodeTop < bottom;
}

// ============================================================================
// Hook
// ============================================================================

export function useMarqueeSelect({
  containerRef,
  transformRef,
  nodes,
  onSelectionChange,
  enabled = true,
}: UseMarqueeSelectOptions): UseMarqueeSelectReturn {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const isShiftRef = useRef(false);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      // Only left-click on canvas background
      if (event.button !== 0) return;

      // Check if clicking on canvas, not on a node
      const target = event.target as Element;
      if (
        target.closest('.tapestry-node') ||
        target.closest('.tapestry-group') ||
        target.closest('.connection')
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const transform = transformRef.current;

      const canvasPoint = screenToCanvas(event.clientX, event.clientY, rect, transform);

      startPointRef.current = canvasPoint;
      isShiftRef.current = event.shiftKey;
      setIsSelecting(true);

      container.setPointerCapture(event.pointerId);
    },
    [enabled, containerRef, transformRef]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isSelecting || !startPointRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const transform = transformRef.current;

      const currentPoint = screenToCanvas(event.clientX, event.clientY, rect, transform);
      const start = startPointRef.current;

      setMarqueeRect({
        x: start.x,
        y: start.y,
        width: currentPoint.x - start.x,
        height: currentPoint.y - start.y,
      });
    },
    [isSelecting, containerRef, transformRef]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!isSelecting) return;

      const container = containerRef.current;
      if (container) {
        try {
          container.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore
        }
      }

      // Find nodes within marquee
      if (marqueeRect) {
        const selectedIds = nodes
          .filter(node => rectContainsNode(marqueeRect, node))
          .map(node => node.id);

        if (selectedIds.length > 0 || !isShiftRef.current) {
          onSelectionChange(selectedIds, isShiftRef.current);
        }
      }

      // Reset state
      startPointRef.current = null;
      isShiftRef.current = false;
      setMarqueeRect(null);
      setIsSelecting(false);
    },
    [isSelecting, marqueeRect, nodes, onSelectionChange, containerRef]
  );

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [containerRef, enabled, handlePointerDown, handlePointerMove, handlePointerUp]);

  return { marqueeRect, isSelecting };
}

// ============================================================================
// Marquee Rectangle Component
// ============================================================================

export interface MarqueeOverlayProps {
  rect: MarqueeRect | null;
}

export function MarqueeOverlay({ rect }: MarqueeOverlayProps) {
  if (!rect) return null;

  // Normalize rect (handle negative dimensions)
  const x = rect.width >= 0 ? rect.x : rect.x + rect.width;
  const y = rect.height >= 0 ? rect.y : rect.y + rect.height;
  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  return (
    <rect
      className="marquee-selection"
      x={x}
      y={y}
      width={width}
      height={height}
      fill="hsl(var(--primary) / 0.1)"
      stroke="hsl(var(--primary))"
      strokeWidth={1}
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  );
}
