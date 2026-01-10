/**
 * Tapestry Node Rendering Utilities
 *
 * Pure functions for rendering different node types in the tapestry visualization.
 * These functions handle D3 selection manipulation and return the created elements.
 *
 * Visual rendering is separated from event handling - the main component
 * attaches click/hover handlers after calling these render functions.
 */

import type { Selection } from 'd3-selection';
import { select } from 'd3-selection';
import type { TapestryNode, TapestryNodeType } from '@/types/tapestry';
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_CHARACTER_WIDTH,
  DEFAULT_CHARACTER_HEIGHT,
  STATUS_COLORS,
  TIME_ICONS,
} from '@/types/tapestry';
import { sanitizeForD3Text, getInitials } from '@/lib/utils';
import { normalizeTimeOfDay } from '@/lib/prosemirror/utils/time-detection';
import { wrapText } from '../hooks/renderUtils';

/** Node type icons for compact display */
export const NODE_TYPE_ICONS: Record<TapestryNodeType, string> = {
  scene: 'S',
  character: 'C',
  item: 'I',
  location: 'L',
  note: 'N',
};

/** Time of day icons */
export const TIME_OF_DAY_ICONS: Record<string, string> = {
  day: '☀',
  night: '🌙',
  dawn: '🌅',
  dusk: '🌆',
  continuous: '→',
  later: '⏱',
  morning: '🌤',
  afternoon: '☀',
  evening: '🌆',
};

interface RenderPinsOptions {
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>;
  nodeWidth: number;
  nodeHeight: number;
  pinSize: number;
  cornerRadius: number;
}

/**
 * Renders connection pins on a node (left and right edges)
 */
export function renderConnectionPins({
  nodeGroup,
  nodeWidth,
  nodeHeight,
  pinSize,
  cornerRadius,
}: RenderPinsOptions): void {
  const halfSize = pinSize / 2;

  // Left pin (input)
  nodeGroup.append('rect')
    .attr('class', 'node-pin')
    .attr('x', -halfSize)
    .attr('y', nodeHeight / 2 - halfSize)
    .attr('width', pinSize)
    .attr('height', pinSize)
    .attr('rx', cornerRadius)
    .attr('fill', 'hsl(var(--primary))');

  // Right pin (output)
  nodeGroup.append('rect')
    .attr('class', 'node-pin')
    .attr('x', nodeWidth - halfSize)
    .attr('y', nodeHeight / 2 - halfSize)
    .attr('width', pinSize)
    .attr('height', pinSize)
    .attr('rx', cornerRadius)
    .attr('fill', 'hsl(var(--primary))');
}

interface RenderCharacterNodeOptions {
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>;
  node: TapestryNode;
  isSelected: boolean;
  getRadius: (base: number) => number;
}

/**
 * Renders a character node in polaroid style.
 * Matches the inline rendering in tapestry.tsx for visual consistency.
 */
export function renderCharacterNode({
  nodeGroup,
  node,
  isSelected,
  getRadius,
}: RenderCharacterNodeOptions): void {
  const polaroidWidth = DEFAULT_CHARACTER_WIDTH;
  const polaroidHeight = DEFAULT_CHARACTER_HEIGHT;
  const portraitHeight = polaroidHeight - 45; // Space for name and stats
  const borderPadding = 6;

  // Get initials for avatar
  const initials = getInitials(node.title);

  // Polaroid frame - uses card background for theme compatibility
  nodeGroup.append('rect')
    .attr('class', 'polaroid-frame node-bg')
    .attr('width', polaroidWidth)
    .attr('height', polaroidHeight)
    .attr('rx', getRadius(6))
    .attr('fill', 'hsl(var(--card))')
    .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
    .attr('stroke-width', isSelected ? 2 : 1)
    .attr('filter', 'url(#node-shadow)');

  // Portrait area (themed background with initials)
  nodeGroup.append('rect')
    .attr('class', 'polaroid-portrait')
    .attr('x', borderPadding)
    .attr('y', borderPadding)
    .attr('width', polaroidWidth - borderPadding * 2)
    .attr('height', portraitHeight)
    .attr('rx', getRadius(2))
    .attr('fill', 'hsl(var(--muted))');

  // Initials in portrait
  nodeGroup.append('text')
    .attr('x', polaroidWidth / 2)
    .attr('y', borderPadding + portraitHeight / 2 + 8)
    .attr('text-anchor', 'middle')
    .attr('font-size', '24px')
    .attr('font-weight', '700')
    .attr('fill', 'hsl(var(--muted-foreground))')
    .attr('opacity', 0.9)
    .text(initials);

  // Character name (uses header font from theme)
  nodeGroup.append('text')
    .attr('class', 'polaroid-name node-title')
    .attr('x', polaroidWidth / 2)
    .attr('y', portraitHeight + borderPadding + 18)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'var(--font-heading), serif')
    .attr('font-size', '14px')
    .attr('font-weight', '600')
    .attr('fill', 'hsl(var(--foreground))')
    .text(sanitizeForD3Text(node.title || 'Untitled', 12));

  // Stats line (dialogue count - uses handwritten style)
  const dialogueText = `${node.dialogueCount || 0} lines`;
  nodeGroup.append('text')
    .attr('class', 'polaroid-stats')
    .attr('x', polaroidWidth / 2)
    .attr('y', portraitHeight + borderPadding + 30)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'var(--font-caveat), cursive')
    .attr('font-size', '10px')
    .attr('fill', 'hsl(var(--muted-foreground))')
    .text(dialogueText);

  // Thumbtack pin indicator if pinned
  if (node.pinned) {
    renderThumbTack(nodeGroup, polaroidWidth / 2, -4, getRadius);
  }

  // Connection pins (compact for smaller polaroid)
  const pinSize = 8;
  renderConnectionPins({
    nodeGroup,
    nodeWidth: polaroidWidth,
    nodeHeight: polaroidHeight,
    pinSize,
    cornerRadius: Math.min(getRadius(pinSize / 2), pinSize / 2),
  });
}

/**
 * Renders a thumbtack/pin indicator for pinned nodes.
 */
export function renderThumbTack(
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>,
  x: number,
  y: number,
  getRadius: (base: number) => number,
  large = false
): void {
  const pinGroup = nodeGroup.append('g')
    .attr('class', 'node-thumbtack')
    .attr('transform', `translate(${x}, ${y})`);

  const headRadius = large ? 7 : 6;
  const pointPath = large ? 'M-3,6 L3,6 L0,14 Z' : 'M-2.5,5 L2.5,5 L0,11 Z';
  const highlightRadius = large ? 2 : 1.5;
  const highlightOffset = large ? -2 : -1.5;

  // Thumbtack head (circular)
  pinGroup.append('circle')
    .attr('r', headRadius)
    .attr('fill', 'hsl(var(--destructive))')
    .attr('stroke', 'hsl(var(--background))')
    .attr('stroke-width', 1.5);

  // Thumbtack point (triangle pointing down)
  pinGroup.append('path')
    .attr('d', pointPath)
    .attr('fill', 'hsl(var(--muted-foreground))');

  // Highlight dot on head
  pinGroup.append('circle')
    .attr('cx', highlightOffset)
    .attr('cy', highlightOffset)
    .attr('r', highlightRadius)
    .attr('fill', 'hsl(var(--destructive-foreground) / 0.5)');
}

interface RenderStandardNodeOptions {
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>;
  node: TapestryNode;
  nodeType: TapestryNodeType;
  nodeWidth: number;
  nodeHeight: number;
  isSelected: boolean;
  getRadius: (base: number) => number;
  mutedHeaderColor: string;
  /** Scene status for status badge */
  sceneStatus?: string;
  /** Scene location name for display */
  locationName?: string;
}

/**
 * Renders a standard node (scene, note, location, item) with header bar.
 * Supports monochromatic styling with hover state managed separately.
 */
export function renderStandardNode({
  nodeGroup,
  node,
  nodeType,
  nodeWidth,
  nodeHeight,
  isSelected,
  getRadius,
  mutedHeaderColor,
  sceneStatus,
  locationName,
}: RenderStandardNodeOptions): void {
  const headerHeight = 24;

  // Node background with soft shadow
  nodeGroup.append('rect')
    .attr('class', 'node-bg')
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('rx', getRadius(8))
    .attr('fill', 'hsl(var(--card))')
    .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
    .attr('stroke-width', isSelected ? 2 : 1)
    .attr('filter', 'url(#node-shadow)');

  // Header bar - monochromatic by default, primary when selected
  nodeGroup.append('rect')
    .attr('class', 'node-header')
    .attr('width', nodeWidth)
    .attr('height', headerHeight)
    .attr('rx', getRadius(8))
    .attr('ry', getRadius(8))
    .attr('fill', isSelected ? 'hsl(var(--primary))' : mutedHeaderColor);

  // Square off bottom corners of header
  nodeGroup.append('rect')
    .attr('class', 'node-header-bottom')
    .attr('y', 8)
    .attr('width', nodeWidth)
    .attr('height', headerHeight - 8)
    .attr('fill', isSelected ? 'hsl(var(--primary))' : mutedHeaderColor);

  // Type icon in header
  nodeGroup.append('text')
    .attr('class', 'node-type-icon')
    .attr('x', 8)
    .attr('y', headerHeight / 2 + 4)
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .attr('fill', isSelected ? 'white' : 'hsl(var(--muted-foreground))')
    .text(NODE_TYPE_ICONS[nodeType]);

  // Title in header (shorter for scenes to make room for time icon)
  const titleMaxChars = nodeType === 'scene' && node.timeOfDay ? 18 : 22;
  nodeGroup.append('text')
    .attr('class', 'node-title')
    .attr('x', 22)
    .attr('y', headerHeight / 2 + 4)
    .attr('font-size', '11px')
    .attr('font-weight', '600')
    .attr('fill', isSelected ? 'white' : 'hsl(var(--foreground))')
    .text(sanitizeForD3Text(node.title || 'Untitled', titleMaxChars));

  // Time of day icon for scene nodes (in header, right side)
  if (nodeType === 'scene' && node.timeOfDay) {
    const normalizedTime = normalizeTimeOfDay(node.timeOfDay);
    const timeIcon = TIME_ICONS[normalizedTime] || TIME_ICONS.DAY;
    nodeGroup.append('text')
      .attr('class', 'time-icon')
      .attr('x', nodeWidth - 18)
      .attr('y', headerHeight / 2 + 4)
      .attr('font-size', '11px')
      .attr('fill', isSelected ? 'white' : 'hsl(var(--muted-foreground))')
      .text(timeIcon);
  }

  // Content area (3 lines max for cleaner look)
  const contentLines = wrapText(node.content || '', 28);
  contentLines.slice(0, 3).forEach((line, i) => {
    nodeGroup.append('text')
      .attr('x', 10)
      .attr('y', headerHeight + 16 + i * 14)
      .attr('font-size', '10px')
      .attr('fill', 'hsl(var(--card-foreground) / 0.8)')
      .text(sanitizeForD3Text(line, 30));
  });

  // Status badge for scene nodes (bottom of card)
  if (nodeType === 'scene' && sceneStatus) {
    const statusColor = STATUS_COLORS[sceneStatus] || STATUS_COLORS.draft;
    const statusLabel = sceneStatus.charAt(0).toUpperCase() + sceneStatus.slice(1);

    // Status badge (pill shape)
    const badgeWidth = 48;
    const badgeHeight = 14;
    const badgeG = nodeGroup.append('g')
      .attr('transform', `translate(8, ${nodeHeight - badgeHeight - 6})`);

    badgeG.append('rect')
      .attr('width', badgeWidth)
      .attr('height', badgeHeight)
      .attr('rx', getRadius(badgeHeight / 2))
      .attr('fill', `${statusColor}20`)
      .attr('stroke', statusColor)
      .attr('stroke-width', 1);

    badgeG.append('text')
      .attr('x', badgeWidth / 2)
      .attr('y', badgeHeight / 2 + 3)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', '500')
      .attr('fill', statusColor)
      .text(statusLabel);

    // Location label (right side)
    if (locationName) {
      const displayName = locationName.length > 12
        ? locationName.slice(0, 11) + '…'
        : locationName;
      nodeGroup.append('text')
        .attr('x', nodeWidth - 10)
        .attr('y', nodeHeight - 10)
        .attr('text-anchor', 'end')
        .attr('font-size', '8px')
        .attr('fill', 'hsl(var(--muted-foreground))')
        .text(displayName);
    }
  }

  // Thumbtack pin indicator if pinned
  if (node.pinned) {
    renderThumbTack(nodeGroup, nodeWidth / 2, -4, getRadius, true);
  }

  // Connection pins (shape scales with theme radius)
  const pinSize = 12;
  renderConnectionPins({
    nodeGroup,
    nodeWidth,
    nodeHeight,
    pinSize,
    cornerRadius: Math.min(getRadius(pinSize / 2), pinSize / 2),
  });
}

/**
 * Sets up hover behavior for monochromatic nodes.
 * Changes header color from muted to primary on hover.
 */
export function setupNodeHoverBehavior(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeGroup: Selection<SVGGElement, any, any, any>,
  nodeId: string,
  selectedNodes: Set<string>,
  mutedHeaderColor: string
): void {
  nodeGroup
    .on('mouseenter', function() {
      if (!selectedNodes.has(nodeId)) {
        select(this).select('.node-header').attr('fill', 'hsl(var(--primary))');
        select(this).select('.node-header-bottom').attr('fill', 'hsl(var(--primary))');
        select(this).select('.node-type-icon').attr('fill', 'white');
        select(this).select('.node-title').attr('fill', 'white');
        select(this).select('.time-icon').attr('fill', 'white');
        select(this).select('.node-bg').attr('stroke', 'hsl(var(--primary))');
      }
    })
    .on('mouseleave', function() {
      if (!selectedNodes.has(nodeId)) {
        select(this).select('.node-header').attr('fill', mutedHeaderColor);
        select(this).select('.node-header-bottom').attr('fill', mutedHeaderColor);
        select(this).select('.node-type-icon').attr('fill', 'hsl(var(--muted-foreground))');
        select(this).select('.node-title').attr('fill', 'hsl(var(--foreground))');
        select(this).select('.time-icon').attr('fill', 'hsl(var(--muted-foreground))');
        select(this).select('.node-bg').attr('stroke', 'hsl(var(--border))');
      }
    });
}

interface RenderNoteNodeOptions {
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>;
  node: TapestryNode;
  isSelected: boolean;
  getRadius: (base: number) => number;
}

/**
 * Renders a generic note node (sticky note style)
 */
export function renderNoteNode({
  nodeGroup,
  node,
  isSelected,
  getRadius,
}: RenderNoteNodeOptions): void {
  const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
  const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;

  // Note background with slight rotation for organic feel
  nodeGroup.append('rect')
    .attr('class', 'note-body')
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('rx', getRadius(4))
    .attr('fill', node.color || 'hsl(var(--card))')
    .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
    .attr('stroke-width', isSelected ? 2.5 : 1)
    .attr('filter', 'url(#soft-shadow)');

  // Note content
  const content = node.content || node.title || '';
  const lines = content.split('\n').slice(0, 4); // Max 4 lines

  lines.forEach((line, i) => {
    nodeGroup.append('text')
      .attr('x', 12)
      .attr('y', 24 + i * 18)
      .attr('font-size', '12px')
      .attr('fill', 'hsl(var(--foreground))')
      .text(sanitizeForD3Text(line, 30));
  });

  // Add connection pins
  renderConnectionPins({
    nodeGroup,
    nodeWidth,
    nodeHeight,
    pinSize: 8,
    cornerRadius: getRadius(4),
  });
}

interface RenderLocationNodeOptions {
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>;
  node: TapestryNode;
  isSelected: boolean;
  getRadius: (base: number) => number;
}

/**
 * Renders a location node
 */
export function renderLocationNode({
  nodeGroup,
  node,
  isSelected,
  getRadius,
}: RenderLocationNodeOptions): void {
  const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
  const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;

  // Location card background
  nodeGroup.append('rect')
    .attr('class', 'location-body')
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('rx', getRadius(8))
    .attr('fill', 'hsl(var(--card))')
    .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
    .attr('stroke-width', isSelected ? 2.5 : 1)
    .attr('filter', 'url(#soft-shadow)');

  // Location icon
  nodeGroup.append('text')
    .attr('x', 12)
    .attr('y', 24)
    .attr('font-size', '16px')
    .text('📍');

  // Location name
  nodeGroup.append('text')
    .attr('x', 36)
    .attr('y', 24)
    .attr('font-size', '13px')
    .attr('font-weight', '600')
    .attr('fill', 'hsl(var(--foreground))')
    .text(sanitizeForD3Text(node.title || 'Unknown Location', 22));

  // Interior/Exterior badge
  if (node.locationType) {
    const isInterior = node.locationType.toLowerCase().includes('int');
    nodeGroup.append('rect')
      .attr('x', nodeWidth - 40)
      .attr('y', 8)
      .attr('width', 32)
      .attr('height', 18)
      .attr('rx', 4)
      .attr('fill', isInterior ? 'hsl(var(--muted))' : 'hsl(var(--accent))');

    nodeGroup.append('text')
      .attr('x', nodeWidth - 24)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', 'hsl(var(--foreground))')
      .text(isInterior ? 'INT' : 'EXT');
  }

  // Add connection pins
  renderConnectionPins({
    nodeGroup,
    nodeWidth,
    nodeHeight,
    pinSize: 8,
    cornerRadius: getRadius(4),
  });
}
