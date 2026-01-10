/**
 * Tapestry rendering hooks
 *
 * These hooks provide a modular approach to rendering the tapestry visualization.
 * They use D3 data joins for efficient updates and can be composed together.
 */

export * from './types';
export * from './renderUtils';
export { useLayerSetup, type LayerSetupOptions, type LayerSetupReturn } from './useLayerSetup';
export { useConnectionsRenderer } from './useConnectionsRenderer';
export { createNodeDragBehavior, createGroupDragBehavior } from './drag-behaviors';
export { createZoomBehavior } from './zoom-behavior';
export { setupNodeEventHandlers } from './node-events';
export { setupMarqueeHandlers } from './marquee-handlers';
export { setupGroupControls } from './group-controls';
export { renderBundledEdges } from './bundled-edges';
export { renderStandardConnections } from './standard-connections';
export { renderGroups } from './group-rendering';
