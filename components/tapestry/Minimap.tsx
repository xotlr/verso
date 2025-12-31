'use client';

import { useCallback, useRef } from 'react';
import type { LayoutResult, EdgeBundle } from '@/lib/tapestry/types';

interface MinimapProps {
  layout: LayoutResult;
  bundles: EdgeBundle[];
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  onViewportChange: (x: number, y: number) => void;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 8;

/**
 * Minimap component for the Tapestry visualization.
 * Shows a bird's eye view of the entire canvas with a draggable viewport indicator.
 */
export function Minimap({
  layout,
  bundles,
  viewport,
  onViewportChange,
}: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Calculate scale to fit content in minimap
  const contentWidth = layout.bounds.width;
  const contentHeight = layout.bounds.height;
  const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / contentWidth;
  const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = {
    x: MINIMAP_PADDING + (-viewport.x / viewport.scale) * scale,
    y: MINIMAP_PADDING + (-viewport.y / viewport.scale) * scale,
    width: (viewport.width / viewport.scale) * scale,
    height: (viewport.height / viewport.scale) * scale,
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - MINIMAP_PADDING;
      const y = e.clientY - rect.top - MINIMAP_PADDING;

      // Convert minimap coordinates to canvas coordinates
      const canvasX = -(x / scale) * viewport.scale;
      const canvasY = -(y / scale) * viewport.scale;

      onViewportChange(canvasX, canvasY);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [scale, viewport.scale, onViewportChange]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - MINIMAP_PADDING;
    const y = e.clientY - rect.top - MINIMAP_PADDING;

    // Center viewport on clicked position
    const canvasX = -(x / scale - viewport.width / viewport.scale / 2) * viewport.scale;
    const canvasY = -(y / scale - viewport.height / viewport.scale / 2) * viewport.scale;

    onViewportChange(canvasX, canvasY);
  }, [scale, viewport, onViewportChange]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 right-4 bg-card/90 backdrop-blur rounded-lg border border-border shadow-lg overflow-hidden cursor-pointer z-20"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onClick={handleClick}
    >
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="pointer-events-none"
      >
        {/* Background */}
        <rect
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          fill="hsl(var(--muted) / 0.3)"
        />

        {/* Content group with scale transform */}
        <g transform={`translate(${MINIMAP_PADDING}, ${MINIMAP_PADDING}) scale(${scale})`}>
          {/* Sidebar entities */}
          {layout.sidebar.characters.map(entity => (
            <rect
              key={entity.id}
              x={layout.config.paddingLeft}
              y={entity.y}
              width={layout.config.sidebarWidth - 10}
              height={entity.height}
              rx={2}
              fill={entity.color}
              opacity={0.6}
            />
          ))}
          {layout.sidebar.locations.map(entity => (
            <rect
              key={entity.id}
              x={layout.config.paddingLeft}
              y={entity.y}
              width={layout.config.sidebarWidth - 10}
              height={entity.height}
              rx={2}
              fill={entity.color}
              opacity={0.6}
            />
          ))}

          {/* Scene nodes */}
          {Array.from(layout.scenes.values()).map(scene => (
            <rect
              key={scene.nodeId}
              x={scene.x}
              y={scene.y}
              width={scene.width}
              height={scene.height}
              rx={3}
              fill="hsl(var(--primary))"
              opacity={0.5}
            />
          ))}

          {/* Edge bundles (simplified) */}
          {bundles.map(bundle => (
            <g key={bundle.id}>
              {/* Spine line */}
              <line
                x1={layout.config.paddingLeft + layout.config.sidebarWidth}
                y1={bundle.sourceY}
                x2={bundle.spineX}
                y2={bundle.sourceY}
                stroke={bundle.color}
                strokeWidth={1 / scale}
                opacity={0.3}
              />
              <line
                x1={bundle.spineX}
                y1={bundle.minTargetY}
                x2={bundle.spineX}
                y2={bundle.maxTargetY}
                stroke={bundle.color}
                strokeWidth={1 / scale}
                opacity={0.3}
              />
            </g>
          ))}
        </g>

        {/* Viewport indicator */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(viewportRect.width, 10)}
          height={Math.max(viewportRect.height, 10)}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          rx={2}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          style={{ pointerEvents: 'auto' }}
        />
      </svg>

      {/* Label */}
      <div className="absolute bottom-1 left-2 text-[9px] text-muted-foreground uppercase tracking-wider">
        Overview
      </div>
    </div>
  );
}
