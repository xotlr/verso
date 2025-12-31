/**
 * Tapestry Edge Bundling System
 *
 * Implements hierarchical edge bundling for the sidebar → scene visualization.
 * Edges from each character are bundled through a shared vertical spine in the
 * gutter, then fan out to their target scenes.
 *
 * The bundling reduces visual clutter and makes character-scene relationships
 * easier to trace.
 */

import * as d3 from 'd3';
import type { TapestryConnection } from '@/types/tapestry';
import {
  type LayoutResult,
  type SidebarEntity,
  type ScenePosition,
  type EdgeBundle,
  type BundledEdge,
  BUNDLE_TENSION,
  EDGE_THICKNESS,
} from './types';

// ============================================================================
// Bundle Creation
// ============================================================================

/**
 * Creates edge bundles from the layout and connections.
 * Each sidebar entity gets one bundle containing all its scene connections.
 */
export function createEdgeBundles(
  layout: LayoutResult,
  connections: TapestryConnection[]
): EdgeBundle[] {
  const bundles: EdgeBundle[] = [];

  // Process characters
  layout.sidebar.characters.forEach(entity => {
    const bundle = createBundleForEntity(entity, layout, connections);
    if (bundle.edges.length > 0) {
      bundles.push(bundle);
    }
  });

  // Process locations
  layout.sidebar.locations.forEach(entity => {
    const bundle = createBundleForEntity(entity, layout, connections);
    if (bundle.edges.length > 0) {
      bundles.push(bundle);
    }
  });

  // Compute spine positions to minimize crossings
  computeSpinePositions(bundles, layout.gutter);

  return bundles;
}

/**
 * Creates a bundle for a single sidebar entity.
 */
function createBundleForEntity(
  entity: SidebarEntity,
  layout: LayoutResult,
  connections: TapestryConnection[]
): EdgeBundle {
  // Find all connections from this entity to scenes
  const entityConnections = connections.filter(c => c.sourceId === entity.nodeId);

  // Get max dialogue count for thickness normalization
  const allDialogueCounts = layout.sidebar.characters.map(c => c.dialogueCount);
  const maxDialogue = Math.max(1, ...allDialogueCounts);

  // Create bundled edges
  const edges: BundledEdge[] = [];
  let minTargetY = Infinity;
  let maxTargetY = -Infinity;

  entityConnections.forEach(conn => {
    const targetScene = layout.scenes.get(conn.targetId);
    if (!targetScene) return;

    const targetCenterY = targetScene.y + targetScene.height / 2;
    minTargetY = Math.min(minTargetY, targetCenterY);
    maxTargetY = Math.max(maxTargetY, targetCenterY);

    // Calculate thickness based on dialogue count for this specific scene
    // For now, use entity's total dialogue count; could be refined per-scene
    const dialogueCount = getDialogueCountForScene(entity, targetScene);
    const thickness = normalizeThickness(dialogueCount, maxDialogue);

    edges.push({
      connectionId: conn.id,
      targetNodeId: targetScene.nodeId,
      targetSceneId: targetScene.sceneId,
      branchY: targetCenterY, // Will be refined during path generation
      targetY: targetCenterY,
      targetX: targetScene.x,
      thickness,
      dialogueCount,
    });
  });

  // Sort edges by target Y for smoother bundling
  edges.sort((a, b) => a.targetY - b.targetY);

  // Entity exit point
  const sourceY = entity.y + entity.height / 2;

  return {
    id: `bundle-${entity.nodeId}`,
    sourceEntityId: entity.nodeId,
    sourceType: entity.type,
    spineX: 0, // Will be computed by computeSpinePositions
    sourceY,
    color: entity.color,
    edges,
    minTargetY: minTargetY === Infinity ? sourceY : minTargetY,
    maxTargetY: maxTargetY === -Infinity ? sourceY : maxTargetY,
  };
}

/**
 * Gets dialogue count for a specific character-scene connection.
 * Falls back to entity's total if per-scene data isn't available.
 */
function getDialogueCountForScene(
  entity: SidebarEntity,
  _scene: ScenePosition
): number {
  // TODO: If we have per-scene dialogue data, use it here
  // For now, use the entity's total dialogue count
  return entity.dialogueCount;
}

/**
 * Normalizes dialogue count to edge thickness (1-4px).
 */
function normalizeThickness(dialogueCount: number, maxDialogue: number): number {
  if (maxDialogue === 0) return EDGE_THICKNESS.min;
  const normalized = dialogueCount / maxDialogue;
  return EDGE_THICKNESS.min + normalized * (EDGE_THICKNESS.max - EDGE_THICKNESS.min);
}

// ============================================================================
// Spine Position Computation
// ============================================================================

/**
 * Computes X positions for bundle spines in the gutter.
 * Uses barycenter-based positioning to minimize crossings.
 */
function computeSpinePositions(
  bundles: EdgeBundle[],
  gutter: { x: number; width: number }
): void {
  if (bundles.length === 0) return;

  // Calculate barycenter for each bundle (average X of target scenes)
  bundles.forEach(bundle => {
    if (bundle.edges.length > 0) {
      const avgTargetX = bundle.edges.reduce(
        (sum, e) => sum + e.targetX,
        0
      ) / bundle.edges.length;
      (bundle as EdgeBundle & { _barycenterX: number })._barycenterX = avgTargetX;
    } else {
      (bundle as EdgeBundle & { _barycenterX: number })._barycenterX = 0;
    }
  });

  // Sort bundles by barycenter for consistent spine ordering
  const sortedBundles = [...bundles].sort((a, b) => {
    const aX = (a as EdgeBundle & { _barycenterX: number })._barycenterX;
    const bX = (b as EdgeBundle & { _barycenterX: number })._barycenterX;
    return aX - bX;
  });

  // Distribute spines evenly across gutter width
  const padding = 20;
  const availableWidth = gutter.width - padding * 2;
  const spacing = bundles.length > 1
    ? availableWidth / (bundles.length - 1)
    : 0;

  sortedBundles.forEach((bundle, index) => {
    bundle.spineX = bundles.length === 1
      ? gutter.x + gutter.width / 2
      : gutter.x + padding + index * spacing;
  });
}

// ============================================================================
// SVG Path Generation
// ============================================================================

/**
 * Generates the complete SVG path for a bundle's main spine.
 * The spine runs from the entity's exit point vertically through the gutter.
 */
export function generateSpinePath(bundle: EdgeBundle, layout: LayoutResult): string {
  const exitX = layout.config.paddingLeft + layout.config.sidebarWidth;

  // Path: horizontal exit → vertical spine
  const points: [number, number][] = [
    [exitX, bundle.sourceY],
    [bundle.spineX, bundle.sourceY],
    [bundle.spineX, bundle.minTargetY],
    [bundle.spineX, bundle.maxTargetY],
  ];

  const line = d3.line<[number, number]>()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveBundle.beta(BUNDLE_TENSION));

  return line(points) || '';
}

/**
 * Generates SVG path for a single edge branch from spine to scene.
 */
export function generateBranchPath(
  bundle: EdgeBundle,
  edge: BundledEdge,
  layout: LayoutResult
): string {
  // Branch point on spine
  const branchX = bundle.spineX;
  const branchY = edge.targetY;

  // Target entry point (left edge of scene)
  const targetX = edge.targetX;
  const targetY = edge.targetY;

  // Create smooth curve from spine to scene
  const points: [number, number][] = [
    [branchX, branchY],
    [branchX + (targetX - branchX) * 0.3, branchY],
    [targetX - (targetX - branchX) * 0.3, targetY],
    [targetX, targetY],
  ];

  const line = d3.line<[number, number]>()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveBasis);

  return line(points) || '';
}

/**
 * Generates a complete bundled path from entity to scene.
 * Used when we want a single path per edge rather than spine + branches.
 */
export function generateBundledEdgePath(
  bundle: EdgeBundle,
  edge: BundledEdge,
  layout: LayoutResult
): string {
  const exitX = layout.config.paddingLeft + layout.config.sidebarWidth;

  // Full path: entity exit → spine → branch → scene
  const points: [number, number][] = [
    [exitX, bundle.sourceY],
    [bundle.spineX, bundle.sourceY],
    [bundle.spineX, edge.targetY],
    [edge.targetX, edge.targetY],
  ];

  const line = d3.line<[number, number]>()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveBundle.beta(BUNDLE_TENSION));

  return line(points) || '';
}

/**
 * Generates an orthogonal (right-angle) path from entity to scene.
 * Alternative to curved bundling for a more schematic look.
 */
export function generateOrthogonalPath(
  bundle: EdgeBundle,
  edge: BundledEdge,
  layout: LayoutResult
): string {
  const exitX = layout.config.paddingLeft + layout.config.sidebarWidth;

  // Orthogonal path with rounded corners
  const cornerRadius = 8;
  const spineX = bundle.spineX;

  // Build path with rounded corners
  let d = `M ${exitX} ${bundle.sourceY}`;

  // Horizontal to spine
  d += ` H ${spineX - cornerRadius}`;

  // Corner: horizontal to vertical
  if (edge.targetY > bundle.sourceY) {
    d += ` Q ${spineX} ${bundle.sourceY}, ${spineX} ${bundle.sourceY + cornerRadius}`;
    d += ` V ${edge.targetY - cornerRadius}`;
    d += ` Q ${spineX} ${edge.targetY}, ${spineX + cornerRadius} ${edge.targetY}`;
  } else if (edge.targetY < bundle.sourceY) {
    d += ` Q ${spineX} ${bundle.sourceY}, ${spineX} ${bundle.sourceY - cornerRadius}`;
    d += ` V ${edge.targetY + cornerRadius}`;
    d += ` Q ${spineX} ${edge.targetY}, ${spineX + cornerRadius} ${edge.targetY}`;
  } else {
    // Same Y level - straight line
    d += ` Q ${spineX} ${bundle.sourceY}, ${spineX + cornerRadius} ${edge.targetY}`;
  }

  // Horizontal to scene
  d += ` H ${edge.targetX}`;

  return d;
}

// ============================================================================
// Bundle Analysis Utilities
// ============================================================================

/**
 * Gets all edges connected to a specific scene.
 */
export function getEdgesForScene(
  bundles: EdgeBundle[],
  sceneNodeId: string
): { bundle: EdgeBundle; edge: BundledEdge }[] {
  const result: { bundle: EdgeBundle; edge: BundledEdge }[] = [];

  bundles.forEach(bundle => {
    bundle.edges.forEach(edge => {
      if (edge.targetNodeId === sceneNodeId) {
        result.push({ bundle, edge });
      }
    });
  });

  return result;
}

/**
 * Gets all edges for a specific entity.
 */
export function getEdgesForEntity(
  bundles: EdgeBundle[],
  entityNodeId: string
): EdgeBundle | undefined {
  return bundles.find(b => b.sourceEntityId === entityNodeId);
}

/**
 * Calculates the total number of edge crossings.
 * Lower is better - used to evaluate layout quality.
 */
export function countCrossings(bundles: EdgeBundle[]): number {
  let crossings = 0;

  // Compare each pair of edges
  for (let i = 0; i < bundles.length; i++) {
    for (let j = i + 1; j < bundles.length; j++) {
      const bundleA = bundles[i];
      const bundleB = bundles[j];

      // Check if spines cross (based on source Y vs spine X ordering)
      const aAboveB = bundleA.sourceY < bundleB.sourceY;
      const aLeftOfB = bundleA.spineX < bundleB.spineX;

      // If entity ordering doesn't match spine ordering, there's a crossing
      if (aAboveB !== aLeftOfB) {
        crossings++;
      }
    }
  }

  return crossings;
}

// ============================================================================
// Highlight Utilities
// ============================================================================

/**
 * Determines which edges should be highlighted based on current state.
 */
export function getHighlightedEdges(
  bundles: EdgeBundle[],
  highlightedEntityId: string | null,
  highlightedSceneId: string | null
): Set<string> {
  const highlighted = new Set<string>();

  if (highlightedEntityId) {
    // Highlight all edges from this entity
    const bundle = bundles.find(b => b.sourceEntityId === highlightedEntityId);
    if (bundle) {
      bundle.edges.forEach(e => highlighted.add(e.connectionId));
    }
  }

  if (highlightedSceneId) {
    // Highlight all edges to this scene
    bundles.forEach(bundle => {
      bundle.edges.forEach(edge => {
        if (edge.targetNodeId === highlightedSceneId) {
          highlighted.add(edge.connectionId);
        }
      });
    });
  }

  return highlighted;
}

/**
 * Gets the opacity for an edge based on highlight state.
 */
export function getEdgeOpacity(
  connectionId: string,
  highlightedEdges: Set<string>,
  hasAnyHighlight: boolean
): number {
  if (!hasAnyHighlight) {
    return 0.3; // Default opacity
  }

  if (highlightedEdges.has(connectionId)) {
    return 1.0; // Highlighted
  }

  return 0.1; // Dimmed
}
