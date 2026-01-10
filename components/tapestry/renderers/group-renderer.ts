/**
 * Tapestry Group Rendering Utilities
 *
 * Pure functions for rendering groups (collapsible containers) in the tapestry.
 * Supports collapsed card stack view and expanded container view.
 */

import type { Selection } from 'd3-selection';
import type { TapestryGroup, TapestryNode } from '@/types/tapestry';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_GROUP_WIDTH,
  DEFAULT_GROUP_HEIGHT,
} from '@/types/tapestry';
import { sanitizeForD3Text } from '@/lib/utils';
import type { GroupBounds } from '@/lib/tapestry/bounds';

/** Linear interpolation helper */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Generate pseudo-random scatter offsets for card stack effect */
export function generateScatterOffsets(
  groupId: string,
  maxCards: number
): Array<{ x: number; y: number; rot: number }> {
  const seed = groupId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudoRandom = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280;

  return [
    { x: 10, y: 10, rot: 0 }, // Top card - stable
    { x: 10 + (pseudoRandom(1) * 16 - 8), y: 10 + (pseudoRandom(2) * 12 - 4), rot: pseudoRandom(3) * 12 - 6 },
    { x: 10 + (pseudoRandom(4) * 18 - 9), y: 10 + (pseudoRandom(5) * 14 - 5), rot: pseudoRandom(6) * 14 - 7 },
    { x: 10 + (pseudoRandom(7) * 20 - 10), y: 10 + (pseudoRandom(8) * 16 - 6), rot: pseudoRandom(9) * 16 - 8 },
    { x: 10 + (pseudoRandom(10) * 22 - 11), y: 10 + (pseudoRandom(11) * 18 - 7), rot: pseudoRandom(12) * 18 - 9 },
  ].slice(0, maxCards);
}

interface RenderGroupContainerOptions {
  groupG: Selection<SVGGElement, TapestryGroup, null, undefined>;
  group: TapestryGroup;
  displayWidth: number;
  displayHeight: number;
  progress: number; // 0 = expanded, 1 = collapsed
  getRadius: (base: number) => number;
}

/**
 * Renders the group container background
 */
export function renderGroupContainer({
  groupG,
  displayWidth,
  displayHeight,
  progress,
  getRadius,
}: RenderGroupContainerOptions): void {
  const dashArray = progress < 0.5 ? '8,4' : 'none';
  const containerFill = progress > 0.7 ? 'transparent' : 'hsl(var(--card))';

  groupG.append('rect')
    .attr('class', 'group-body')
    .attr('width', displayWidth)
    .attr('height', displayHeight)
    .attr('rx', getRadius(12))
    .attr('fill', containerFill)
    .attr('stroke', progress > 0.8 ? 'transparent' : 'hsl(var(--border))')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', dashArray)
    .attr('filter', progress > 0.8 ? 'none' : 'url(#soft-shadow)');
}

interface RenderGroupHeaderOptions {
  groupG: Selection<SVGGElement, TapestryGroup, null, undefined>;
  group: TapestryGroup;
  displayWidth: number;
  headerHeight: number;
  progress: number;
}

/**
 * Renders the group header (title bar) - visible only when expanded
 */
export function renderGroupHeader({
  groupG,
  group,
  displayWidth,
  headerHeight,
  progress,
}: RenderGroupHeaderOptions): void {
  const headerOpacity = Math.max(0, 1 - progress * 2);
  if (headerOpacity <= 0) return;

  // Header background
  groupG.append('rect')
    .attr('class', 'group-header')
    .attr('width', displayWidth)
    .attr('height', headerHeight)
    .attr('fill', 'hsl(var(--muted))')
    .attr('opacity', headerOpacity);

  // Header separator line
  groupG.append('line')
    .attr('x1', 0)
    .attr('y1', headerHeight)
    .attr('x2', displayWidth)
    .attr('y2', headerHeight)
    .attr('stroke', 'hsl(var(--border))')
    .attr('stroke-width', 1)
    .attr('opacity', headerOpacity);

  // Collapse toggle arrow
  groupG.append('text')
    .attr('class', 'collapse-toggle')
    .attr('x', 14)
    .attr('y', headerHeight / 2 + 5)
    .attr('font-size', '10px')
    .attr('fill', 'hsl(var(--foreground))')
    .attr('pointer-events', 'none')
    .attr('opacity', headerOpacity)
    .text('▼');

  // Title text
  groupG.append('text')
    .attr('x', 30)
    .attr('y', headerHeight / 2 + 5)
    .attr('font-size', '12px')
    .attr('font-weight', '500')
    .attr('fill', 'hsl(var(--foreground))')
    .attr('opacity', headerOpacity)
    .text(sanitizeForD3Text(group.title, 25));
}

interface RenderStackedCardOptions {
  groupG: Selection<SVGGElement, TapestryGroup, null, undefined>;
  node: TapestryNode;
  cardIndex: number;
  totalCards: number;
  group: TapestryGroup;
  progress: number;
  scatterOffsets: Array<{ x: number; y: number; rot: number }>;
  stackCardWidth: number;
  stackCardHeight: number;
  getRadius: (base: number) => number;
  onExpandClick: () => void;
}

/**
 * Renders a stacked card in collapsed/animating group
 */
export function renderStackedCard({
  groupG,
  node,
  cardIndex,
  totalCards,
  group,
  progress,
  scatterOffsets,
  stackCardWidth,
  stackCardHeight,
  getRadius,
  onExpandClick,
}: RenderStackedCardOptions): void {
  const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
  const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;

  // Expanded position (relative to group)
  const expandedX = node.x - group.x;
  const expandedY = node.y - group.y;
  const expandedRot = 0;

  // Collapsed position (in stack)
  const stackPos = scatterOffsets[cardIndex] || { x: 10 + cardIndex * 4, y: 10 + cardIndex * 4, rot: cardIndex * 3 };

  // Interpolated values
  const cardX = lerp(expandedX, stackPos.x, progress);
  const cardY = lerp(expandedY, stackPos.y, progress);
  const cardRot = lerp(expandedRot, stackPos.rot, progress);
  const cardWidth = lerp(nodeWidth, stackCardWidth, progress);
  const cardHeight = lerp(nodeHeight, stackCardHeight, progress);

  const cardG = groupG.append('g')
    .attr('class', 'stacked-card')
    .attr('data-base-x', stackPos.x)
    .attr('data-base-y', stackPos.y)
    .attr('data-base-rot', stackPos.rot)
    .attr('transform', `translate(${cardX}, ${cardY}) rotate(${cardRot}, ${cardWidth / 2}, ${cardHeight / 2})`);

  // Card background
  cardG.append('rect')
    .attr('width', cardWidth)
    .attr('height', cardHeight)
    .attr('rx', getRadius(8))
    .attr('fill', cardIndex === 0 ? 'hsl(var(--card))' : 'hsl(var(--muted))')
    .attr('stroke', 'hsl(var(--border))')
    .attr('stroke-width', 1)
    .attr('filter', 'url(#soft-shadow)');

  // Content (fades out during collapse)
  const contentOpacity = Math.max(0, 1 - progress * 1.5);
  if (contentOpacity > 0 && cardIndex < 3) {
    cardG.append('text')
      .attr('x', 12)
      .attr('y', 20)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('opacity', contentOpacity)
      .text(sanitizeForD3Text(node.title || node.content?.slice(0, 20) || '...', 25));
  }

  // Top card controls (only on first card, visible when collapsed)
  if (cardIndex === 0) {
    const controlsOpacity = Math.max(0, (progress - 0.5) * 2);
    if (controlsOpacity > 0) {
      // Expand toggle
      const toggleG = cardG.append('g')
        .attr('class', 'collapse-toggle')
        .attr('cursor', 'pointer')
        .attr('opacity', controlsOpacity)
        .style('pointer-events', 'all')
        .on('click', (event: Event) => {
          event.stopPropagation();
          onExpandClick();
        });

      toggleG.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 80)
        .attr('height', 32)
        .attr('fill', 'transparent');

      toggleG.append('text')
        .attr('x', 12)
        .attr('y', 21)
        .attr('font-size', '10px')
        .attr('fill', 'hsl(var(--foreground))')
        .text('▶');

      // Group title
      cardG.append('text')
        .attr('x', 28)
        .attr('y', 21)
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', 'hsl(var(--foreground))')
        .attr('opacity', controlsOpacity)
        .text(sanitizeForD3Text(group.title, 20));

      // Item count
      cardG.append('text')
        .attr('x', stackCardWidth - 12)
        .attr('y', 21)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('fill', 'hsl(var(--foreground))')
        .attr('opacity', controlsOpacity)
        .text(`${totalCards}`);

      // Preview content (fully collapsed only)
      if (progress > 0.9) {
        cardG.append('text')
          .attr('x', 12)
          .attr('y', 55)
          .attr('font-size', '13px')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(node.title || node.content?.slice(0, 25) || '...', 22));

        if (totalCards > 1) {
          cardG.append('text')
            .attr('x', 12)
            .attr('y', 75)
            .attr('font-size', '11px')
            .attr('fill', 'hsl(var(--foreground))')
            .text(`+${totalCards - 1} more items`);
        }
      }
    }
  }
}

interface CalculateGroupDimensionsOptions {
  group: TapestryGroup;
  bounds: GroupBounds | undefined;
  childNodes: TapestryNode[];
  progress: number;
}

interface GroupDimensions {
  dynamicWidth: number;
  dynamicHeight: number;
  displayWidth: number;
  displayHeight: number;
  collapsedWidth: number;
  collapsedHeight: number;
}

/**
 * Calculate group dimensions based on collapse state
 */
export function calculateGroupDimensions({
  group,
  bounds,
  progress,
}: CalculateGroupDimensionsOptions): GroupDimensions {
  const stackCardWidth = DEFAULT_NOTE_WIDTH;
  const stackCardHeight = DEFAULT_NOTE_HEIGHT;
  const collapsedWidth = stackCardWidth + 30;
  const collapsedHeight = stackCardHeight + 30;

  let dynamicWidth = group.width || DEFAULT_GROUP_WIDTH;
  let dynamicHeight = group.height || DEFAULT_GROUP_HEIGHT;

  if (bounds && bounds.nodeCount > 0) {
    dynamicWidth = bounds.width;
    dynamicHeight = bounds.height;
  }

  const displayWidth = lerp(dynamicWidth, collapsedWidth, progress);
  const displayHeight = lerp(dynamicHeight, collapsedHeight, progress);

  return {
    dynamicWidth,
    dynamicHeight,
    displayWidth,
    displayHeight,
    collapsedWidth,
    collapsedHeight,
  };
}
