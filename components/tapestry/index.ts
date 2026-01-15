/**
 * Tapestry - Pure React Implementation
 *
 * Story graph visualization using pure React components.
 *
 * Benefits:
 * - Better accessibility (keyboard navigation, ARIA)
 * - Easier testing (standard React testing patterns)
 * - Smaller bundle (no D3 dependencies)
 * - Better DX (standard React patterns)
 *
 * Usage:
 * ```tsx
 * import { TapestryCanvas } from '@/components/tapestry';
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
