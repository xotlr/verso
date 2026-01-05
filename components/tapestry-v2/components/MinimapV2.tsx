'use client';

/**
 * MinimapV2 - Overview minimap for the Tapestry
 *
 * Shows:
 * - Scaled down view of all nodes
 * - Current viewport indicator
 * - Click to pan navigation
 */

import { memo, useCallback, useRef, useMemo } from 'react';
import type { TapestryNode, TapestryGroup } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';
import { getContentBounds, type Viewport } from '@/lib/tapestry/virtualization';
import type { Transform } from '../state/TapestryContext';

// ============================================================================
// Types
// ============================================================================

export interface MinimapV2Props {
  /** All nodes */
  nodes: TapestryNode[];
  /** All groups */
  groups: TapestryGroup[];
  /** Current viewport */
  viewport: Viewport;
  /** Current transform */
  transform: Transform;
  /** Container dimensions */
  containerSize: { width: number; height: number };
  /** Callback to pan to a position */
  onPanTo: (x: number, y: number) => void;
  /** Minimap width */
  width?: number;
  /** Minimap height */
  height?: number;
  /** Position */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 120;
const PADDING = 20;

// ============================================================================
// Component
// ============================================================================

export const MinimapV2 = memo(function MinimapV2({
  nodes,
  groups,
  viewport,
  transform,
  containerSize,
  onPanTo,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  position = 'bottom-right',
}: MinimapV2Props) {
  const minimapRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);

  // Calculate content bounds
  const contentBounds = useMemo(() => {
    const bounds = getContentBounds(nodes);

    // Expand to include groups
    let minX = bounds.minX;
    let minY = bounds.minY;
    let maxX = bounds.maxX;
    let maxY = bounds.maxY;

    for (const group of groups) {
      minX = Math.min(minX, group.x);
      minY = Math.min(minY, group.y);
      maxX = Math.max(maxX, group.x + group.width);
      maxY = Math.max(maxY, group.y + group.height);
    }

    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
    };
  }, [nodes, groups]);

  // Calculate scale to fit content in minimap
  const minimapScale = useMemo(() => {
    if (contentBounds.width === 0 || contentBounds.height === 0) {
      return 1;
    }
    const scaleX = (width - 8) / contentBounds.width;
    const scaleY = (height - 8) / contentBounds.height;
    return Math.min(scaleX, scaleY, 0.1); // Max 10% scale
  }, [contentBounds, width, height]);

  // Calculate viewport rect in minimap coordinates
  const viewportRect = useMemo(() => {
    const x = (viewport.x - contentBounds.minX) * minimapScale + 4;
    const y = (viewport.y - contentBounds.minY) * minimapScale + 4;
    const w = viewport.width * minimapScale;
    const h = viewport.height * minimapScale;
    return { x, y, width: w, height: h };
  }, [viewport, contentBounds, minimapScale]);

  // Convert minimap click to canvas coordinates
  const minimapToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const minimap = minimapRef.current;
      if (!minimap) return null;

      const rect = minimap.getBoundingClientRect();
      const mx = clientX - rect.left - 4;
      const my = clientY - rect.top - 4;

      const canvasX = mx / minimapScale + contentBounds.minX;
      const canvasY = my / minimapScale + contentBounds.minY;

      return { x: canvasX, y: canvasY };
    },
    [minimapScale, contentBounds]
  );

  // Handle click/drag to pan
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      isDraggingRef.current = true;

      const point = minimapToCanvas(event.clientX, event.clientY);
      if (point) {
        onPanTo(point.x, point.y);
      }

      (event.target as Element).setPointerCapture(event.pointerId);
    },
    [minimapToCanvas, onPanTo]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDraggingRef.current) return;

      const point = minimapToCanvas(event.clientX, event.clientY);
      if (point) {
        onPanTo(point.x, point.y);
      }
    },
    [minimapToCanvas, onPanTo]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (event.target as Element).releasePointerCapture(event.pointerId);
    } catch {
      // Ignore
    }
  }, []);

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
  };

  if (nodes.length === 0 && groups.length === 0) {
    return null;
  }

  return (
    <div
      className="tapestry-minimap absolute rounded-lg overflow-hidden"
      style={{
        width,
        height,
        backgroundColor: 'hsl(var(--card) / 0.9)',
        border: '1px solid hsl(var(--border))',
        ...positionStyles[position],
      }}
    >
      <svg
        ref={minimapRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: 'crosshair' }}
      >
        {/* Content scaled to fit */}
        <g transform={`translate(4, 4) scale(${minimapScale})`}>
          {/* Offset to content bounds */}
          <g transform={`translate(${-contentBounds.minX}, ${-contentBounds.minY})`}>
            {/* Groups */}
            {groups.map(group => (
              <rect
                key={group.id}
                x={group.x}
                y={group.y}
                width={group.width}
                height={group.height}
                fill={group.color}
                fillOpacity={0.2}
                rx={2}
              />
            ))}

            {/* Nodes */}
            {nodes.map(node => {
              const { width: nw, height: nh } = getNodeDimensions(node);
              return (
                <rect
                  key={node.id}
                  x={node.x}
                  y={node.y}
                  width={nw}
                  height={nh}
                  fill={node.color}
                  rx={1}
                />
              );
            })}
          </g>
        </g>

        {/* Viewport indicator */}
        <rect
          className="minimap-viewport"
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(viewportRect.width, 10)}
          height={Math.max(viewportRect.height, 10)}
          fill="hsl(var(--primary) / 0.1)"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
});

MinimapV2.displayName = 'MinimapV2';
