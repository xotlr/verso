/**
 * Utility functions for efficient D3 rendering using data joins.
 * These functions can be called from the main tapestry effect to
 * efficiently update elements without full rebuilds.
 */

import * as d3 from 'd3';
import type { TapestryNode, TapestryConnection, TapestryGroup } from '@/types/tapestry';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, getNodeDimensions } from '@/types/tapestry';
import type { TapestryLookups } from '@/lib/tapestry/lookups';
import type { GroupBounds } from '@/lib/tapestry/bounds';

// Re-export for backwards compatibility with existing imports
export { getNodeDimensions };

/**
 * Generate a bezier path between two points
 */
export function generateConnectionPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): string {
  const dx = Math.abs(targetX - sourceX);
  const controlOffset = Math.max(40, dx * 0.3);
  return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
}

/**
 * Calculate connection endpoints, handling collapsed groups
 */
export function getConnectionEndpoints(
  conn: TapestryConnection,
  lookups: TapestryLookups
): { sourceX: number; sourceY: number; targetX: number; targetY: number } | null {
  const sourceNode = lookups.nodeById.get(conn.sourceId);
  const targetNode = lookups.nodeById.get(conn.targetId);
  if (!sourceNode || !targetNode) return null;

  const sourceGroup = sourceNode.groupId ? lookups.groupById.get(sourceNode.groupId) : undefined;
  const targetGroup = targetNode.groupId ? lookups.groupById.get(targetNode.groupId) : undefined;

  const sourceDims = getNodeDimensions(sourceNode);
  const targetDims = getNodeDimensions(targetNode);

  const collapsedStackWidth = DEFAULT_NOTE_WIDTH + 30;
  const collapsedStackHeight = DEFAULT_NOTE_HEIGHT + 30;

  let sourceX: number, sourceY: number, targetX: number, targetY: number;

  if (sourceGroup?.collapsed) {
    sourceX = sourceGroup.x + collapsedStackWidth;
    sourceY = sourceGroup.y + collapsedStackHeight / 2;
  } else {
    sourceX = sourceNode.x + sourceDims.width;
    sourceY = sourceNode.y + sourceDims.height / 2;
  }

  if (targetGroup?.collapsed) {
    targetX = targetGroup.x;
    targetY = targetGroup.y + collapsedStackHeight / 2;
  } else {
    targetX = targetNode.x;
    targetY = targetNode.y + targetDims.height / 2;
  }

  return { sourceX, sourceY, targetX, targetY };
}

/**
 * Update a single connection's path (used during drag operations)
 */
export function updateConnectionPath(
  connectionsGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  conn: TapestryConnection,
  lookups: TapestryLookups
): void {
  const endpoints = getConnectionEndpoints(conn, lookups);
  if (!endpoints) return;

  const { sourceX, sourceY, targetX, targetY } = endpoints;
  const pathD = generateConnectionPath(sourceX, sourceY, targetX, targetY);

  connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
}

/**
 * Update paths for all connections involving a specific node (used during node drag)
 */
export function updateNodeConnections(
  connectionsGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodeId: string,
  lookups: TapestryLookups
): void {
  const nodeConns = lookups.connectionsByNodeId.get(nodeId) || [];
  for (const conn of nodeConns) {
    updateConnectionPath(connectionsGroup, conn, lookups);
  }
}

/**
 * Calculate hash of node visual state for change detection
 */
export function getNodeVisualHash(
  node: TapestryNode,
  isSelected: boolean,
  isHighlighted: boolean
): string {
  return `${node.id}:${node.x}:${node.y}:${node.title}:${isSelected}:${isHighlighted}:${node.pinned}`;
}

/**
 * Calculate hash of connection visual state for change detection
 */
export function getConnectionVisualHash(
  conn: TapestryConnection,
  isHighlighted: boolean
): string {
  return `${conn.id}:${conn.sourceId}:${conn.targetId}:${conn.label}:${isHighlighted}`;
}

/**
 * Linear interpolation helper for animations
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Easing function for smooth collapse/expand
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Check if a node is inside a marquee selection rectangle
 */
export function isNodeInMarquee(
  node: TapestryNode,
  start: { x: number; y: number },
  end: { x: number; y: number } | null
): boolean {
  if (!end) return false;

  const dims = getNodeDimensions(node);
  const nodeX = node.x;
  const nodeY = node.y;
  const nodeW = dims.width;
  const nodeH = dims.height;

  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  // Check if node overlaps with marquee
  return !(nodeX + nodeW < minX || nodeX > maxX || nodeY + nodeH < minY || nodeY > maxY);
}

/**
 * Wrap text to fit within a specified width (approximate character count)
 */
export function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Create a pseudo-random number based on a seed (for consistent scattering)
 */
export function seededRandom(seed: string, n: number): number {
  const seedNum = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((seedNum * (n + 1) * 9301 + 49297) % 233280) / 233280;
}

/**
 * Generate scatter offsets for collapsed group card stack
 */
export function generateScatterOffsets(groupId: string, maxCards: number): Array<{ x: number; y: number; rot: number }> {
  const offsets: Array<{ x: number; y: number; rot: number }> = [];

  for (let i = 0; i < maxCards; i++) {
    if (i === 0) {
      // Top card - stable position
      offsets.push({ x: 10, y: 10, rot: 0 });
    } else {
      // Other cards - scattered
      offsets.push({
        x: 10 + (seededRandom(groupId, i * 3) * 16 - 8),
        y: 10 + (seededRandom(groupId, i * 3 + 1) * 12 - 4),
        rot: seededRandom(groupId, i * 3 + 2) * 12 - 6,
      });
    }
  }

  return offsets;
}
