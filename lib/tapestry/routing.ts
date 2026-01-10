/**
 * Tapestry Orthogonal Routing System
 *
 * Implements smart edge routing with:
 * - Orthogonal (right-angle) paths
 * - Channel allocation to avoid overlaps
 * - Crossing minimization using Sugiyama-inspired algorithms
 * - Sweep line algorithm for efficient routing
 */

import type {
  LayoutResult,
  SidebarEntity,
  ScenePosition,
  EdgeBundle,
  RouteSegment,
  RoutedEdge,
} from './types';

// ============================================================================
// Orthogonal Routing
// ============================================================================

/**
 * Routes an edge orthogonally from sidebar entity to scene.
 * Pattern: horizontal exit → vertical in gutter → horizontal entry
 */
export function routeOrthogonal(
  entity: SidebarEntity,
  scene: ScenePosition,
  spineX: number,
  layout: LayoutResult
): RouteSegment[] {
  const exitX = layout.config.paddingLeft + layout.config.sidebarWidth;
  const exitY = entity.y + entity.height / 2;
  const entryX = scene.x;
  const entryY = scene.y + scene.height / 2;

  const segments: RouteSegment[] = [];

  // Segment 1: Horizontal exit from entity to spine
  segments.push({
    type: 'horizontal',
    x1: exitX,
    y1: exitY,
    x2: spineX,
    y2: exitY,
  });

  // Segment 2: Vertical in gutter
  if (Math.abs(exitY - entryY) > 1) {
    segments.push({
      type: 'vertical',
      x1: spineX,
      y1: exitY,
      x2: spineX,
      y2: entryY,
    });
  }

  // Segment 3: Horizontal entry to scene
  segments.push({
    type: 'horizontal',
    x1: spineX,
    y1: entryY,
    x2: entryX,
    y2: entryY,
  });

  return segments;
}

/**
 * Converts route segments to an SVG path string.
 */
export function segmentsToPath(segments: RouteSegment[], cornerRadius = 8): string {
  if (segments.length === 0) return '';

  let d = `M ${segments[0].x1} ${segments[0].y1}`;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];

    if (nextSeg && cornerRadius > 0) {
      // Draw to corner point with rounded corner
      const dirX = Math.sign(seg.x2 - seg.x1);
      const dirY = Math.sign(seg.y2 - seg.y1);
      const nextDirX = Math.sign(nextSeg.x2 - nextSeg.x1);
      const nextDirY = Math.sign(nextSeg.y2 - nextSeg.y1);

      // Adjust endpoint for corner radius
      const adjustedX = seg.x2 - dirX * cornerRadius * (dirX !== 0 ? 1 : 0);
      const adjustedY = seg.y2 - dirY * cornerRadius * (dirY !== 0 ? 1 : 0);

      // Draw line to adjusted point
      if (seg.type === 'horizontal') {
        d += ` H ${adjustedX}`;
      } else {
        d += ` V ${adjustedY}`;
      }

      // Draw quadratic curve for corner
      const cornerEndX = seg.x2 + nextDirX * cornerRadius;
      const cornerEndY = seg.y2 + nextDirY * cornerRadius;
      d += ` Q ${seg.x2} ${seg.y2}, ${cornerEndX} ${cornerEndY}`;
    } else {
      // No corner - draw full segment
      if (seg.type === 'horizontal') {
        d += ` H ${seg.x2}`;
      } else {
        d += ` V ${seg.y2}`;
      }
    }
  }

  return d;
}

// ============================================================================
// Channel Allocation
// ============================================================================

interface Channel {
  y: number;
  occupiedRanges: Array<{ x1: number; x2: number }>;
}

/**
 * Allocates channels for horizontal segments to avoid overlaps.
 * Uses sweep line algorithm for efficient allocation.
 */
export function allocateChannels(
  bundles: EdgeBundle[],
  _layout: LayoutResult
): Map<string, number> {
  const channelMap = new Map<string, number>();
  const channels: Channel[] = [];

  // Collect all horizontal segments that need channel allocation
  const horizontalSegments: Array<{
    connectionId: string;
    y: number;
    x1: number;
    x2: number;
  }> = [];

  bundles.forEach(bundle => {
    bundle.edges.forEach(edge => {
      horizontalSegments.push({
        connectionId: edge.connectionId,
        y: edge.targetY,
        x1: bundle.spineX,
        x2: edge.targetX,
      });
    });
  });

  // Sort by Y position
  horizontalSegments.sort((a, b) => a.y - b.y);

  // Allocate channels using first-fit algorithm
  horizontalSegments.forEach(seg => {
    const channel = findOrCreateChannel(channels, seg.y, seg.x1, seg.x2);
    channelMap.set(seg.connectionId, channel.y);
  });

  return channelMap;
}

/**
 * Finds an existing channel or creates a new one.
 */
function findOrCreateChannel(
  channels: Channel[],
  preferredY: number,
  x1: number,
  x2: number
): Channel {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  // Try to find a channel at the preferred Y that doesn't conflict
  const bestChannel = channels.find(ch => {
    if (Math.abs(ch.y - preferredY) > 20) return false;

    // Check for overlap with existing ranges
    return !ch.occupiedRanges.some(range =>
      !(maxX < range.x1 || minX > range.x2)
    );
  });

  if (bestChannel) {
    bestChannel.occupiedRanges.push({ x1: minX, x2: maxX });
    return bestChannel;
  }

  // Create new channel
  const newChannel: Channel = {
    y: preferredY,
    occupiedRanges: [{ x1: minX, x2: maxX }],
  };
  channels.push(newChannel);
  return newChannel;
}

// ============================================================================
// Crossing Minimization
// ============================================================================

/**
 * Minimizes edge crossings using barycenter heuristic.
 * This is a Sugiyama-inspired algorithm for bipartite graphs.
 */
export function minimizeCrossings(
  entities: SidebarEntity[],
  scenes: Map<string, ScenePosition>,
  bundles: EdgeBundle[],
  iterations = 4
): SidebarEntity[] {
  const sortedEntities = [...entities];

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate barycenter for each entity
    sortedEntities.forEach(entity => {
      const bundle = bundles.find(b => b.sourceEntityId === entity.nodeId);
      if (bundle && bundle.edges.length > 0) {
        // Barycenter = average Y position of connected scenes
        const avgY = bundle.edges.reduce((sum, e) => {
          const scene = scenes.get(e.targetNodeId);
          return sum + (scene ? scene.y + scene.height / 2 : 0);
        }, 0) / bundle.edges.length;
        entity.barycenter = avgY;
      } else {
        entity.barycenter = Infinity;
      }
    });

    // Sort by barycenter
    sortedEntities.sort((a, b) => {
      if (Math.abs(a.barycenter - b.barycenter) < 0.1) {
        // Tie-breaker: higher dialogue count first
        return (b.dialogueCount || 0) - (a.dialogueCount || 0);
      }
      return a.barycenter - b.barycenter;
    });

    // Check if order stabilized
    const crossingCount = countEdgeCrossings(sortedEntities, bundles, scenes);
    if (crossingCount === 0) break;
  }

  return sortedEntities;
}

/**
 * Counts the number of edge crossings in the current layout.
 */
export function countEdgeCrossings(
  entities: SidebarEntity[],
  bundles: EdgeBundle[],
  scenes: Map<string, ScenePosition>
): number {
  let crossings = 0;

  // Build entity index map
  const entityIndex = new Map<string, number>();
  entities.forEach((e, i) => entityIndex.set(e.nodeId, i));

  // Compare each pair of edges
  for (let i = 0; i < bundles.length; i++) {
    const bundleA = bundles[i];
    const indexA = entityIndex.get(bundleA.sourceEntityId) ?? 0;

    for (let j = i + 1; j < bundles.length; j++) {
      const bundleB = bundles[j];
      const indexB = entityIndex.get(bundleB.sourceEntityId) ?? 0;

      // Compare edges from bundle A with edges from bundle B
      bundleA.edges.forEach(edgeA => {
        const sceneA = scenes.get(edgeA.targetNodeId);
        if (!sceneA) return;

        bundleB.edges.forEach(edgeB => {
          const sceneB = scenes.get(edgeB.targetNodeId);
          if (!sceneB) return;

          // Check for crossing
          // Crossing occurs when entity order doesn't match scene order
          const entityOrder = indexA < indexB;
          const sceneOrder = sceneA.y < sceneB.y;

          if (entityOrder !== sceneOrder) {
            crossings++;
          }
        });
      });
    }
  }

  return crossings;
}

// ============================================================================
// Sweep Line Routing
// ============================================================================

interface SweepEvent {
  x: number;
  type: 'start' | 'end';
  y: number;
  connectionId: string;
}

/**
 * Uses sweep line algorithm to detect and resolve routing conflicts.
 */
export function sweepLineRouting(bundles: EdgeBundle[]): Map<string, number> {
  const yAdjustments = new Map<string, number>();
  const events: SweepEvent[] = [];

  // Create events for all horizontal segments
  bundles.forEach(bundle => {
    bundle.edges.forEach(edge => {
      const startX = Math.min(bundle.spineX, edge.targetX);
      const endX = Math.max(bundle.spineX, edge.targetX);

      events.push({ x: startX, type: 'start', y: edge.targetY, connectionId: edge.connectionId });
      events.push({ x: endX, type: 'end', y: edge.targetY, connectionId: edge.connectionId });
    });
  });

  // Sort events by X position
  events.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    // End events before start events at same X
    return a.type === 'end' ? -1 : 1;
  });

  // Sweep through events
  const activeSegments = new Map<string, number>(); // connectionId -> y

  events.forEach(event => {
    if (event.type === 'start') {
      // Check for conflicts with active segments
      let adjustedY = event.y;
      const conflictThreshold = 4; // Minimum vertical distance

      activeSegments.forEach(y => {
        if (Math.abs(y - adjustedY) < conflictThreshold) {
          // Adjust this segment up or down
          adjustedY = y + conflictThreshold;
        }
      });

      activeSegments.set(event.connectionId, adjustedY);
      if (adjustedY !== event.y) {
        yAdjustments.set(event.connectionId, adjustedY);
      }
    } else {
      activeSegments.delete(event.connectionId);
    }
  });

  return yAdjustments;
}

// ============================================================================
// Path Optimization
// ============================================================================

/**
 * Simplifies a path by removing redundant points.
 */
export function simplifyPath(segments: RouteSegment[]): RouteSegment[] {
  if (segments.length <= 1) return segments;

  const simplified: RouteSegment[] = [];
  let current = segments[0];

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];

    // Merge consecutive segments of same type
    if (current.type === next.type) {
      if (current.type === 'horizontal' && current.y1 === next.y1) {
        current = { ...current, x2: next.x2 };
        continue;
      }
      if (current.type === 'vertical' && current.x1 === next.x1) {
        current = { ...current, y2: next.y2 };
        continue;
      }
    }

    simplified.push(current);
    current = next;
  }

  simplified.push(current);
  return simplified;
}

/**
 * Calculates the total length of a path.
 */
export function pathLength(segments: RouteSegment[]): number {
  return segments.reduce((total, seg) => {
    const dx = Math.abs(seg.x2 - seg.x1);
    const dy = Math.abs(seg.y2 - seg.y1);
    return total + dx + dy;
  }, 0);
}

// ============================================================================
// Route Generation Pipeline
// ============================================================================

/**
 * Complete routing pipeline:
 * 1. Minimize crossings
 * 2. Compute spine positions
 * 3. Allocate channels
 * 4. Generate final paths
 */
export function generateAllRoutes(
  entities: SidebarEntity[],
  scenes: Map<string, ScenePosition>,
  bundles: EdgeBundle[],
  layout: LayoutResult
): RoutedEdge[] {
  // Step 1: Minimize crossings by reordering entities
  const sortedEntities = minimizeCrossings(entities, scenes, bundles);

  // Step 2: Recalculate entity Y positions based on new order
  let currentY = layout.config.paddingTop;
  sortedEntities.forEach(entity => {
    entity.y = currentY;
    currentY += entity.height + layout.config.entitySpacing;
  });

  // Step 3: Update bundle source Y positions
  bundles.forEach(bundle => {
    const entity = sortedEntities.find(e => e.nodeId === bundle.sourceEntityId);
    if (entity) {
      bundle.sourceY = entity.y + entity.height / 2;
    }
  });

  // Step 4: Apply sweep line routing to avoid conflicts
  const yAdjustments = sweepLineRouting(bundles);

  // Step 5: Generate routed edges
  const routedEdges: RoutedEdge[] = [];

  bundles.forEach(bundle => {
    const entity = sortedEntities.find(e => e.nodeId === bundle.sourceEntityId);
    if (!entity) return;

    bundle.edges.forEach(edge => {
      const scene = scenes.get(edge.targetNodeId);
      if (!scene) return;

      // Apply Y adjustment if needed
      const adjustedY = yAdjustments.get(edge.connectionId) ?? edge.targetY;
      const adjustedScene = { ...scene, y: adjustedY - scene.height / 2 };

      const segments = routeOrthogonal(entity, adjustedScene, bundle.spineX, layout);
      const simplifiedSegments = simplifyPath(segments);

      routedEdges.push({
        id: edge.connectionId,
        sourceId: bundle.sourceEntityId,
        targetId: edge.targetNodeId,
        segments: simplifiedSegments,
        thickness: edge.thickness,
        color: bundle.color,
        bundleId: bundle.id,
        dialogueCount: edge.dialogueCount,
      });
    });
  });

  return routedEdges;
}
