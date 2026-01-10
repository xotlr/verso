/**
 * Tapestry Connection Rendering Utilities
 *
 * Pure functions for rendering connections between nodes in the tapestry.
 * Supports both standard bezier connections and bundled edge rendering.
 */

import type { Selection } from 'd3-selection';
import { select } from 'd3-selection';
import type { TapestryConnection } from '@/types/tapestry';
import { getNodeDimensions, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '@/types/tapestry';
import type { TapestryLookups } from '@/lib/tapestry/lookups';

/** Calculate bezier curve path for a connection */
export function calculateConnectionPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  const dx = Math.abs(targetX - sourceX);
  const controlOffset = Math.max(40, dx * 0.3);
  return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
}

interface ConnectionEndpoints {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

/**
 * Calculate connection endpoints, accounting for collapsed groups
 */
export function getConnectionEndpoints(
  conn: TapestryConnection,
  lookups: TapestryLookups,
  collapsedStackWidth: number = DEFAULT_NOTE_WIDTH + 30,
  collapsedStackHeight: number = DEFAULT_NOTE_HEIGHT + 30
): ConnectionEndpoints | null {
  const sourceNode = lookups.nodeById.get(conn.sourceId);
  const targetNode = lookups.nodeById.get(conn.targetId);
  if (!sourceNode || !targetNode) return null;

  const sourceGroup = sourceNode.groupId ? lookups.groupById.get(sourceNode.groupId) : undefined;
  const targetGroup = targetNode.groupId ? lookups.groupById.get(targetNode.groupId) : undefined;

  const sourceDims = getNodeDimensions(sourceNode);
  const targetDims = getNodeDimensions(targetNode);

  let sourceX: number, sourceY: number, targetX: number, targetY: number;

  // Source endpoint
  if (sourceGroup?.collapsed) {
    sourceX = sourceGroup.x + collapsedStackWidth;
    sourceY = sourceGroup.y + collapsedStackHeight / 2;
  } else {
    sourceX = sourceNode.x + sourceDims.width;
    sourceY = sourceNode.y + sourceDims.height / 2;
  }

  // Target endpoint
  if (targetGroup?.collapsed) {
    targetX = targetGroup.x;
    targetY = targetGroup.y + collapsedStackHeight / 2;
  } else {
    targetX = targetNode.x;
    targetY = targetNode.y + targetDims.height / 2;
  }

  return { sourceX, sourceY, targetX, targetY };
}

interface RenderConnectionOptions {
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>;
  conn: TapestryConnection;
  endpoints: ConnectionEndpoints;
  isHighlighted: boolean;
  showAllLines: boolean;
  connectionVisible: boolean;
  onDelete: () => void;
  onEditLabel: (x: number, y: number) => void;
}

/**
 * Renders a single connection with hover effects and click handling
 */
export function renderConnection({
  connectionsGroup,
  conn,
  endpoints,
  isHighlighted,
  showAllLines,
  connectionVisible,
  onDelete,
  onEditLabel,
}: RenderConnectionOptions): Selection<SVGGElement, unknown, null, undefined> {
  const { sourceX, sourceY, targetX, targetY } = endpoints;
  const pathD = calculateConnectionPath(sourceX, sourceY, targetX, targetY);

  // Monochromatic color scheme
  const mutedColor = 'hsl(var(--muted-foreground))';
  const highlightColor = 'hsl(var(--primary))';

  // Determine visibility
  const shouldShow = showAllLines || isHighlighted;
  let connOpacity = 0;
  if (shouldShow && connectionVisible) {
    connOpacity = isHighlighted ? 1 : (showAllLines ? 0.25 : 0);
  } else if (!connectionVisible) {
    connOpacity = 0.05;
  }

  const connGroup = connectionsGroup.append('g')
    .attr('class', 'connection')
    .attr('data-conn-id', conn.id)
    .attr('cursor', 'pointer')
    .attr('opacity', connOpacity)
    .on('click', onDelete);

  const pathId = `path-${conn.id}`;

  // Background path for depth
  connGroup.append('path')
    .attr('d', pathD)
    .attr('stroke', mutedColor)
    .attr('stroke-width', isHighlighted ? 3 : 2)
    .attr('stroke-linecap', 'round')
    .attr('fill', 'none')
    .attr('opacity', isHighlighted ? 0.4 : 0.15);

  // Main connection path
  const mainPath = connGroup.append('path')
    .attr('id', pathId)
    .attr('class', `connection-path ${isHighlighted ? 'highlighted' : ''}`)
    .attr('d', pathD)
    .attr('stroke', isHighlighted ? highlightColor : mutedColor)
    .attr('stroke-width', isHighlighted ? 2 : 1.5)
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', isHighlighted ? 'none' : '8 4')
    .attr('fill', 'none')
    .style('--connection-accent-color', highlightColor)
    .attr('marker-end', conn.directed ? 'url(#arrow)' : null);

  // Hover effects
  mainPath
    .on('mouseenter', function() {
      select(this)
        .attr('stroke', highlightColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', 'none');
      if (this.parentNode) select(this.parentNode as Element).attr('opacity', 1);
    })
    .on('mouseleave', function() {
      select(this)
        .attr('stroke', isHighlighted ? highlightColor : mutedColor)
        .attr('stroke-width', isHighlighted ? 2 : 1.5)
        .attr('stroke-dasharray', isHighlighted ? 'none' : '8 4');
      if (this.parentNode) select(this.parentNode as Element).attr('opacity', connOpacity);
    });

  // Midpoint for label
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Hit area for label editing
  connGroup.append('rect')
    .attr('class', 'connection-label-hitarea')
    .attr('x', midX - 50)
    .attr('y', midY - 15)
    .attr('width', 100)
    .attr('height', 30)
    .attr('fill', 'transparent')
    .attr('cursor', 'pointer')
    .on('dblclick', (event: MouseEvent) => {
      event.stopPropagation();
      onEditLabel(midX, midY);
    });

  // Connection label
  connGroup.append('text')
    .attr('class', 'connection-label-handwritten')
    .attr('dy', -8)
    .attr('font-family', 'var(--font-caveat), cursive')
    .attr('font-size', '13px')
    .attr('fill', conn.label ? 'hsl(var(--foreground) / 0.7)' : 'hsl(var(--muted-foreground) / 0.4)')
    .style('pointer-events', 'none')
    .append('textPath')
    .attr('href', `#${pathId}`)
    .attr('startOffset', '50%')
    .attr('text-anchor', 'middle')
    .text(conn.label || '···');

  return connGroup;
}

/**
 * Update a connection path during drag (for real-time feedback)
 */
export function updateConnectionPath(
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>,
  connId: string,
  newPathD: string
): void {
  connectionsGroup.selectAll(`[data-conn-id="${connId}"] path`).attr('d', newPathD);
}
