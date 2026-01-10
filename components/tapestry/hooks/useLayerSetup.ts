'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ZoomBehavior, ZoomTransform } from 'd3-zoom';
import { GRID_MINOR_SPACING } from '@/types/tapestry';
import type { TapestryLayers } from './types';

export interface LayerSetupOptions {
  dimensions: { width: number; height: number };
  snapToGrid: boolean;
  initialTransform: ZoomTransform;
}

export interface LayerSetupReturn {
  svgRef: React.RefObject<SVGSVGElement | null>;
  layers: TapestryLayers;
  zoomRef: React.MutableRefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
  transformRef: React.MutableRefObject<ZoomTransform>;
  isReady: boolean;
}

/**
 * Hook that sets up and manages the SVG layer structure.
 * Returns stable refs to layer groups that can be used by render effects.
 *
 * This runs on:
 * - Mount
 * - Dimensions change
 * - Snap to grid toggle
 */
export function useLayerSetup(options: LayerSetupOptions): LayerSetupReturn {
  const { dimensions, snapToGrid, initialTransform } = options;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(initialTransform);
  const layersRef = useRef<TapestryLayers>({
    container: null,
    groupsGroup: null,
    connectionsGroup: null,
    nodesGroup: null,
    groupControlsOverlay: null,
  });
  const isReadyRef = useRef(false);

  // Setup SVG structure
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const { width, height } = dimensions;

    // Clear previous structure
    svg.selectAll('*').remove();
    svg.on('.zoom', null);
    isReadyRef.current = false;

    // === DEFS ===
    const defs = svg.append('defs');

    // Node shadow
    const nodeShadow = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    nodeShadow.append('feDropShadow')
      .attr('dx', 0).attr('dy', 1)
      .attr('stdDeviation', 2)
      .attr('flood-opacity', 0.15);

    // Soft shadow for groups
    const softShadow = defs.append('filter')
      .attr('id', 'soft-shadow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    softShadow.append('feDropShadow')
      .attr('dx', 0).attr('dy', 2)
      .attr('stdDeviation', 4)
      .attr('flood-opacity', 0.1);

    // Grid pattern
    const pattern = defs.append('pattern')
      .attr('id', 'gridPattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', GRID_MINOR_SPACING)
      .attr('height', GRID_MINOR_SPACING);

    if (snapToGrid) {
      pattern.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', GRID_MINOR_SPACING)
        .attr('stroke', 'hsl(var(--muted-foreground) / 0.15)')
        .attr('stroke-width', 0.5);
      pattern.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', GRID_MINOR_SPACING).attr('y2', 0)
        .attr('stroke', 'hsl(var(--muted-foreground) / 0.15)')
        .attr('stroke-width', 0.5);
    } else {
      pattern.append('circle')
        .attr('cx', GRID_MINOR_SPACING / 2)
        .attr('cy', GRID_MINOR_SPACING / 2)
        .attr('r', 0.5)
        .attr('fill', 'hsl(var(--muted-foreground) / 0.1)');
    }

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'hsl(var(--primary))');

    // === BACKGROUND ===
    svg.append('rect')
      .attr('class', 'tapestry-bg')
      .attr('width', width).attr('height', height)
      .attr('fill', 'hsl(var(--muted) / 0.3)');

    svg.append('rect')
      .attr('class', 'tapestry-grid')
      .attr('width', width).attr('height', height)
      .attr('fill', 'url(#gridPattern)');

    // === CONTAINER & LAYERS ===
    const container = svg.append('g').attr('class', 'tapestry-container');
    const groupsGroup = container.append('g').attr('class', 'groups');
    const connectionsGroup = container.append('g').attr('class', 'connections');
    const nodesGroup = container.append('g').attr('class', 'nodes');
    const groupControlsOverlay = container.append('g').attr('class', 'group-controls-overlay');

    // === ZOOM ===
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .touchable(() => true)
      .filter((event) => {
        if (['touchstart', 'touchmove', 'touchend'].includes(event.type)) return true;
        if (event.type === 'wheel') return true;
        if (['mousedown', 'mousemove', 'mouseup'].includes(event.type)) {
          return event.button === 2; // Right-click for pan
        }
        return false;
      })
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        transformRef.current = event.transform;
      });

    svg.call(zoom);
    svg.call(zoom.transform, transformRef.current);
    zoomRef.current = zoom;

    // Store layer refs
    layersRef.current = {
      container,
      groupsGroup,
      connectionsGroup,
      nodesGroup,
      groupControlsOverlay,
    };
    isReadyRef.current = true;

    return () => {
      svg.on('.zoom', null);
      isReadyRef.current = false;
    };
  }, [dimensions, snapToGrid]);

  return {
    svgRef,
    layers: layersRef.current,
    zoomRef,
    transformRef,
    isReady: isReadyRef.current,
  };
}
