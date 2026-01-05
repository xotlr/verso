/**
 * Tapestry Bounds - Efficient group bounds calculation
 *
 * Pre-computes group bounds in a single pass instead of
 * O(G × N) nested loops during rendering.
 */

import type { TapestryNode, TapestryGroup } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';

/**
 * Bounds rectangle for a group
 */
export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  nodeCount: number;
}

/**
 * Empty bounds constant
 */
const EMPTY_BOUNDS: GroupBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  nodeCount: 0,
};

/**
 * Compute bounds for all groups in a single pass.
 *
 * Time complexity: O(N) where N = total nodes
 * Instead of: O(G × N) where G = groups, N = nodes
 *
 * @param nodes All nodes
 * @param groups All groups (used for fallback dimensions)
 * @returns Map of groupId -> bounds
 */
export function computeGroupBounds(
  nodes: TapestryNode[],
  groups: TapestryGroup[]
): Map<string, GroupBounds> {
  const boundsMap = new Map<string, GroupBounds>();

  // Initialize with existing group positions (for empty groups)
  for (const group of groups) {
    boundsMap.set(group.id, {
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
      nodeCount: 0,
    });
  }

  // Accumulate bounds from nodes in single pass
  const minMaxMap = new Map<string, {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    count: number;
  }>();

  for (const node of nodes) {
    if (!node.groupId) continue;

    const { width, height } = getNodeDimensions(node);
    const nodeMaxX = node.x + width;
    const nodeMaxY = node.y + height;

    const existing = minMaxMap.get(node.groupId);
    if (existing) {
      existing.minX = Math.min(existing.minX, node.x);
      existing.minY = Math.min(existing.minY, node.y);
      existing.maxX = Math.max(existing.maxX, nodeMaxX);
      existing.maxY = Math.max(existing.maxY, nodeMaxY);
      existing.count++;
    } else {
      minMaxMap.set(node.groupId, {
        minX: node.x,
        minY: node.y,
        maxX: nodeMaxX,
        maxY: nodeMaxY,
        count: 1,
      });
    }
  }

  // Convert min/max to bounds with padding
  const PADDING = 20; // Visual padding around group contents

  for (const [groupId, minMax] of minMaxMap) {
    boundsMap.set(groupId, {
      x: minMax.minX - PADDING,
      y: minMax.minY - PADDING,
      width: minMax.maxX - minMax.minX + PADDING * 2,
      height: minMax.maxY - minMax.minY + PADDING * 2,
      nodeCount: minMax.count,
    });
  }

  return boundsMap;
}

/**
 * Get bounds for a single group (O(1) lookup from pre-computed map)
 */
export function getGroupBounds(
  boundsMap: Map<string, GroupBounds>,
  groupId: string
): GroupBounds {
  return boundsMap.get(groupId) ?? EMPTY_BOUNDS;
}

/**
 * Compute bounds for a specific set of nodes (for drag preview, etc.)
 */
export function computeNodesBounds(nodes: TapestryNode[]): GroupBounds {
  if (nodes.length === 0) {
    return EMPTY_BOUNDS;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + width);
    maxY = Math.max(maxY, node.y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    nodeCount: nodes.length,
  };
}

/**
 * Check if a point is inside bounds
 */
export function isPointInBounds(
  x: number,
  y: number,
  bounds: GroupBounds
): boolean {
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

/**
 * Check if two bounds overlap
 */
export function doBoundsOverlap(a: GroupBounds, b: GroupBounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}
