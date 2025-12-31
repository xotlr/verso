/**
 * Tapestry Layout System
 *
 * A comprehensive layout engine for the story visualization canvas.
 * Provides sidebar-based layout with hierarchical edge bundling.
 */

// Types
export * from './types';

// Layout Engine
export { computeLayout, updateNodePosition, getNodeCenter, getNodeEdgePoints, getActNumber } from './layout';

// Edge Bundling
export {
  createEdgeBundles,
  generateSpinePath,
  generateBranchPath,
  generateBundledEdgePath,
  generateOrthogonalPath,
  getEdgesForScene,
  getEdgesForEntity,
  countCrossings,
  getHighlightedEdges,
  getEdgeOpacity,
} from './edge-bundling';

// Routing
export {
  routeOrthogonal,
  segmentsToPath,
  allocateChannels,
  minimizeCrossings,
  countEdgeCrossings,
  sweepLineRouting,
  simplifyPath,
  pathLength,
  generateAllRoutes,
} from './routing';
