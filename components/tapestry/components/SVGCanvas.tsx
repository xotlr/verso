'use client';

/**
 * SVGCanvas - Main SVG container with defs and grid
 *
 * Provides:
 * - SVG container with proper viewBox
 * - Defs for patterns, gradients, markers
 * - Optional grid background
 * - Container resize handling
 */

import { memo, useEffect, useRef, type ReactNode } from 'react';
import { GRID_MAJOR_SPACING, GRID_MINOR_SPACING } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface SVGCanvasProps {
  /** Content to render inside the SVG */
  children: ReactNode;
  /** Reference to the SVG element */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Reference to the content group */
  contentRef: React.RefObject<SVGGElement | null>;
  /** Initial transform string */
  transform?: string;
  /** Whether to show grid */
  showGrid?: boolean;
  /** Grid opacity (0-1) */
  gridOpacity?: number;
  /** Callback when container resizes */
  onResize?: (width: number, height: number) => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const SVGCanvas = memo(function SVGCanvas({
  children,
  svgRef,
  contentRef,
  transform = 'translate(0, 0) scale(1)',
  showGrid = true,
  gridOpacity = 0.1,
  onResize,
  className = '',
}: SVGCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !onResize) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        onResize(width, height);
      }
    });

    observer.observe(containerRef.current);

    // Initial size
    const { width, height } = containerRef.current.getBoundingClientRect();
    onResize(width, height);

    return () => observer.disconnect();
  }, [onResize]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="tapestry-canvas"
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        {/* Defs for patterns and markers */}
        <defs>
          {/* Grid pattern */}
          <pattern
            id="tapestry-grid-minor"
            width={GRID_MINOR_SPACING}
            height={GRID_MINOR_SPACING}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={GRID_MINOR_SPACING / 2}
              cy={GRID_MINOR_SPACING / 2}
              r={0.5}
              fill="hsl(var(--foreground))"
              opacity={0.3}
            />
          </pattern>

          <pattern
            id="tapestry-grid-major"
            width={GRID_MAJOR_SPACING}
            height={GRID_MAJOR_SPACING}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={GRID_MAJOR_SPACING}
              height={GRID_MAJOR_SPACING}
              fill="url(#tapestry-grid-minor)"
            />
            <circle
              cx={0}
              cy={0}
              r={1}
              fill="hsl(var(--foreground))"
              opacity={0.5}
            />
          </pattern>

          {/* Arrow marker for directed connections */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill="currentColor"
            />
          </marker>

          {/* Selection highlight filter */}
          <filter id="selection-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="hsl(var(--primary))" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid background */}
        {showGrid && (
          <rect
            className="tapestry-grid"
            width="100%"
            height="100%"
            fill="url(#tapestry-grid-major)"
            opacity={gridOpacity}
          />
        )}

        {/* Transformable content group */}
        <g ref={contentRef} transform={transform}>
          {children}
        </g>
      </svg>
    </div>
  );
});

SVGCanvas.displayName = 'SVGCanvas';
