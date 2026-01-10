/**
 * Tapestry Rendering Utilities
 *
 * Pure functions for rendering tapestry elements with D3.
 * These are used by the main tapestry component's useEffect.
 */

// Node rendering
export {
  NODE_TYPE_ICONS,
  TIME_OF_DAY_ICONS,
  renderConnectionPins,
  renderCharacterNode,
  renderStandardNode,
  renderThumbTack,
  setupNodeHoverBehavior,
  // Legacy exports (simpler versions without header/hover)
  renderNoteNode,
  renderLocationNode,
} from './node-renderer';

// Connection rendering
export {
  calculateConnectionPath,
  getConnectionEndpoints,
  renderConnection,
  updateConnectionPath,
} from './connection-renderer';

// Group rendering
export {
  lerp,
  generateScatterOffsets,
  renderGroupContainer,
  renderGroupHeader,
  renderStackedCard,
  calculateGroupDimensions,
} from './group-renderer';
