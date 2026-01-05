/**
 * Tapestry Virtualization - Viewport culling for performance
 *
 * Only render nodes and connections that are visible within the viewport.
 * This dramatically reduces DOM elements for large tapestries.
 */

import type { TapestryNode, TapestryConnection } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';

/**
 * Viewport rectangle in canvas coordinates (not screen coordinates)
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate viewport in canvas coordinates from transform
 */
export function calculateViewport(
  containerWidth: number,
  containerHeight: number,
  panX: number,
  panY: number,
  zoom: number
): Viewport {
  return {
    x: -panX / zoom,
    y: -panY / zoom,
    width: containerWidth / zoom,
    height: containerHeight / zoom,
  };
}

/**
 * Check if a rectangle intersects with the viewport
 */
function intersectsViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: Viewport,
  padding: number
): boolean {
  const vx1 = viewport.x - padding;
  const vy1 = viewport.y - padding;
  const vx2 = viewport.x + viewport.width + padding;
  const vy2 = viewport.y + viewport.height + padding;

  const nx2 = x + width;
  const ny2 = y + height;

  // AABB intersection test
  return x < vx2 && nx2 > vx1 && y < vy2 && ny2 > vy1;
}

/**
 * Filter nodes to only those visible within the viewport.
 *
 * @param nodes All nodes
 * @param viewport Current viewport in canvas coordinates
 * @param padding Extra margin around viewport to include nodes about to scroll into view
 * @returns Nodes that are visible or near-visible
 */
export function getVisibleNodes(
  nodes: TapestryNode[],
  viewport: Viewport,
  padding = 100
): TapestryNode[] {
  return nodes.filter(node => {
    const { width, height } = getNodeDimensions(node);
    return intersectsViewport(node.x, node.y, width, height, viewport, padding);
  });
}

/**
 * Get visible node IDs as a Set for O(1) lookup
 */
export function getVisibleNodeIds(
  nodes: TapestryNode[],
  viewport: Viewport,
  padding = 100
): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    if (intersectsViewport(node.x, node.y, width, height, viewport, padding)) {
      ids.add(node.id);
    }
  }
  return ids;
}

/**
 * Filter connections to only those with at least one visible endpoint.
 *
 * A connection is visible if:
 * - Its source node is visible, OR
 * - Its target node is visible
 *
 * This ensures we don't cut off connections that extend into the viewport.
 */
export function getVisibleConnections(
  connections: TapestryConnection[],
  visibleNodeIds: Set<string>
): TapestryConnection[] {
  return connections.filter(
    conn => visibleNodeIds.has(conn.sourceId) || visibleNodeIds.has(conn.targetId)
  );
}

/**
 * Batch check which connections are visible
 */
export function getVisibleConnectionIds(
  connections: TapestryConnection[],
  visibleNodeIds: Set<string>
): Set<string> {
  const ids = new Set<string>();
  for (const conn of connections) {
    if (visibleNodeIds.has(conn.sourceId) || visibleNodeIds.has(conn.targetId)) {
      ids.add(conn.id);
    }
  }
  return ids;
}

/**
 * Calculate the bounding box of all nodes (for minimap, fit-to-content, etc.)
 */
export function getContentBounds(nodes: TapestryNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
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
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if viewport has changed significantly enough to warrant re-render
 * (debounce helper)
 */
export function hasViewportChanged(
  prev: Viewport | null,
  next: Viewport,
  threshold = 10
): boolean {
  if (!prev) return true;

  return (
    Math.abs(prev.x - next.x) > threshold ||
    Math.abs(prev.y - next.y) > threshold ||
    Math.abs(prev.width - next.width) > threshold ||
    Math.abs(prev.height - next.height) > threshold
  );
}
