/**
 * D3 Setup Utilities for Tapestry
 *
 * Pure functions for creating D3 elements like grids, markers, and filters.
 * These are used by the tapestry renderer hook.
 */

import type { Selection } from 'd3-selection';
import { GRID_MINOR_SPACING } from '@/types/tapestry';

type SVGSelection = Selection<SVGSVGElement, unknown, null, undefined>;
type DefsSelection = Selection<SVGDefsElement, unknown, null, undefined>;

/**
 * Create the grid pattern for the tapestry background.
 * Shows lines when snap is enabled, dots when disabled.
 */
export function createGridPattern(
  defs: DefsSelection,
  snapToGrid: boolean
): void {
  const pattern = defs.append('pattern')
    .attr('id', 'gridPattern')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', GRID_MINOR_SPACING)
    .attr('height', GRID_MINOR_SPACING);

  if (snapToGrid) {
    // Vertical line
    pattern.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', GRID_MINOR_SPACING)
      .attr('stroke', 'hsl(var(--muted-foreground) / 0.15)')
      .attr('stroke-width', 0.5);
    // Horizontal line
    pattern.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', GRID_MINOR_SPACING)
      .attr('y2', 0)
      .attr('stroke', 'hsl(var(--muted-foreground) / 0.15)')
      .attr('stroke-width', 0.5);
  } else {
    // Subtle dot when snap is off
    pattern.append('circle')
      .attr('cx', GRID_MINOR_SPACING / 2)
      .attr('cy', GRID_MINOR_SPACING / 2)
      .attr('r', 0.5)
      .attr('fill', 'hsl(var(--muted-foreground) / 0.1)');
  }
}

/**
 * Create the arrow marker for directed connections.
 */
export function createArrowMarker(defs: DefsSelection): void {
  defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-4L8,0L0,4')
    .attr('fill', 'hsl(var(--primary))');
}

/**
 * Create shadow filters for nodes and groups.
 */
export function createShadowFilters(defs: DefsSelection): void {
  // Soft shadow for general use
  const softShadow = defs.append('filter')
    .attr('id', 'soft-shadow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  softShadow.append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 2)
    .attr('stdDeviation', 3)
    .attr('flood-color', 'rgba(0,0,0,0.1)');

  // Node shadow (slightly stronger)
  const nodeShadow = defs.append('filter')
    .attr('id', 'node-shadow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  nodeShadow.append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 2)
    .attr('stdDeviation', 4)
    .attr('flood-color', 'rgba(0,0,0,0.15)');

  // Group shadow
  const groupShadow = defs.append('filter')
    .attr('id', 'group-shadow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  groupShadow.append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 4)
    .attr('stdDeviation', 8)
    .attr('flood-color', 'rgba(0,0,0,0.12)');
}

/**
 * Create the canvas background with grid overlay.
 */
export function createCanvasBackground(
  svg: SVGSelection,
  width: number,
  height: number
): void {
  // Background
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'hsl(var(--muted) / 0.3)');

  // Grid overlay
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'url(#gridPattern)');
}

/**
 * Initialize SVG defs with all required patterns, markers, and filters.
 */
export function initializeSvgDefs(
  svg: SVGSelection,
  options: {
    snapToGrid: boolean;
    width: number;
    height: number;
  }
): Selection<SVGGElement, unknown, null, undefined> {
  const { snapToGrid, width, height } = options;

  // Clear previous content
  svg.selectAll('*').remove();
  svg.on('.zoom', null);

  // Create defs
  const defs = svg.append('defs');

  // Add all patterns, markers, and filters
  createGridPattern(defs, snapToGrid);
  createArrowMarker(defs);
  createShadowFilters(defs);

  // Add background
  createCanvasBackground(svg, width, height);

  // Create and return container group
  return svg.append('g').attr('class', 'tapestry-container');
}
