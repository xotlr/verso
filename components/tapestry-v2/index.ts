/**
 * Tapestry v2 - Pure React Implementation
 *
 * A complete rewrite of the D3-based tapestry using pure React components.
 *
 * Benefits:
 * - Better accessibility (keyboard navigation, ARIA)
 * - Easier testing (standard React testing patterns)
 * - Smaller bundle (no d3-selection, d3-drag, d3-zoom)
 * - Better DX (standard React patterns, no D3 data joins)
 *
 * Usage:
 * ```tsx
 * import { TapestryCanvas } from '@/components/tapestry-v2';
 *
 * <TapestryCanvas
 *   nodes={nodes}
 *   connections={connections}
 *   groups={groups}
 *   onNodesChange={handleNodesChange}
 *   onConnectionsChange={handleConnectionsChange}
 * />
 * ```
 */

// Main wrapper (backward-compatible with old Tapestry API)
export { Tapestry } from './TapestryWrapper';

// Low-level canvas component
export { TapestryCanvas, type TapestryCanvasProps, type TapestryCanvasHandle } from './TapestryCanvas';

// Context and state
export {
  TapestryProvider,
  useTapestryContext,
  useTapestryContextOptional,
  type TapestryContextValue,
  type Transform,
  type SelectionState,
} from './state/TapestryContext';

// Hooks
export * from './hooks';

// Node components
export * from './nodes';

// Canvas components
export * from './components';
