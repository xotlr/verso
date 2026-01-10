'use client';

/**
 * TapestryContext - Shared state for the Tapestry canvas
 *
 * Provides transform state (pan/zoom), selection state, and shared refs
 * for high-performance interactions without React re-renders.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type RefObject,
} from 'react';
// TapestryNode, TapestryConnection, TapestryGroup types used by consumers of context
import type { Viewport } from '@/lib/tapestry/virtualization';
import type { HighlightState } from '@/lib/tapestry/types';
import { INITIAL_HIGHLIGHT_STATE } from '@/lib/tapestry/types';

// ============================================================================
// Types
// ============================================================================

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface SelectionState {
  selectedNodeIds: Set<string>;
  selectedConnectionIds: Set<string>;
  selectedGroupIds: Set<string>;
}

export interface TapestryContextValue {
  // Transform (pan/zoom) - refs for performance, state for React updates
  transform: Transform;
  transformRef: RefObject<Transform>;
  setTransform: (transform: Transform) => void;
  updateTransformRef: (transform: Transform) => void;

  // Container refs
  containerRef: RefObject<SVGSVGElement | null>;
  contentRef: RefObject<SVGGElement | null>;

  // Container dimensions
  containerSize: { width: number; height: number };
  setContainerSize: (size: { width: number; height: number }) => void;

  // Viewport (calculated from transform + container size)
  viewport: Viewport;

  // Selection state
  selection: SelectionState;
  selectNodes: (nodeIds: string[], additive?: boolean) => void;
  selectConnections: (connectionIds: string[], additive?: boolean) => void;
  selectGroups: (groupIds: string[], additive?: boolean) => void;
  clearSelection: () => void;

  // Highlight state (hover/lock)
  highlightState: HighlightState;
  setHighlightState: (state: HighlightState | ((prev: HighlightState) => HighlightState)) => void;

  // Interaction flags
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;

  // Zoom constraints
  minZoom: number;
  maxZoom: number;
}

// ============================================================================
// Context
// ============================================================================

const TapestryContext = createContext<TapestryContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface TapestryProviderProps {
  children: ReactNode;
  initialTransform?: Transform;
  minZoom?: number;
  maxZoom?: number;
}

const INITIAL_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 };
const EMPTY_SELECTION: SelectionState = {
  selectedNodeIds: new Set(),
  selectedConnectionIds: new Set(),
  selectedGroupIds: new Set(),
};

export function TapestryProvider({
  children,
  initialTransform = INITIAL_TRANSFORM,
  minZoom = 0.1,
  maxZoom = 4,
}: TapestryProviderProps) {
  // Transform state - both ref (for 60fps updates) and state (for React)
  const [transform, setTransformState] = useState<Transform>(initialTransform);
  const transformRef = useRef<Transform>(initialTransform);

  // Container refs
  const containerRef = useRef<SVGSVGElement | null>(null);
  const contentRef = useRef<SVGGElement | null>(null);

  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Selection state
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);

  // Highlight state
  const [highlightState, setHighlightState] = useState<HighlightState>(INITIAL_HIGHLIGHT_STATE);

  // Interaction flags
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Update transform ref without triggering React re-render
  const updateTransformRef = useCallback((newTransform: Transform) => {
    transformRef.current = newTransform;
  }, []);

  // Full transform update (ref + state)
  const setTransform = useCallback((newTransform: Transform) => {
    transformRef.current = newTransform;
    setTransformState(newTransform);
  }, []);

  // Calculate viewport from transform and container size
  const viewport = useMemo<Viewport>(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: -transform.x / transform.scale,
      y: -transform.y / transform.scale,
      width: containerSize.width / transform.scale,
      height: containerSize.height / transform.scale,
    };
  }, [transform, containerSize]);

  // Selection methods
  const selectNodes = useCallback((nodeIds: string[], additive = false) => {
    setSelection(prev => ({
      ...prev,
      selectedNodeIds: additive
        ? new Set([...prev.selectedNodeIds, ...nodeIds])
        : new Set(nodeIds),
    }));
  }, []);

  const selectConnections = useCallback((connectionIds: string[], additive = false) => {
    setSelection(prev => ({
      ...prev,
      selectedConnectionIds: additive
        ? new Set([...prev.selectedConnectionIds, ...connectionIds])
        : new Set(connectionIds),
    }));
  }, []);

  const selectGroups = useCallback((groupIds: string[], additive = false) => {
    setSelection(prev => ({
      ...prev,
      selectedGroupIds: additive
        ? new Set([...prev.selectedGroupIds, ...groupIds])
        : new Set(groupIds),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
  }, []);

  const value = useMemo<TapestryContextValue>(
    () => ({
      transform,
      transformRef: transformRef as RefObject<Transform>,
      setTransform,
      updateTransformRef,
      containerRef,
      contentRef,
      containerSize,
      setContainerSize,
      viewport,
      selection,
      selectNodes,
      selectConnections,
      selectGroups,
      clearSelection,
      highlightState,
      setHighlightState,
      isDragging,
      setIsDragging,
      isPanning,
      setIsPanning,
      minZoom,
      maxZoom,
    }),
    [
      transform,
      setTransform,
      updateTransformRef,
      containerSize,
      viewport,
      selection,
      selectNodes,
      selectConnections,
      selectGroups,
      clearSelection,
      highlightState,
      isDragging,
      isPanning,
      minZoom,
      maxZoom,
    ]
  );

  return <TapestryContext value={value}>{children}</TapestryContext>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTapestryContext(): TapestryContextValue {
  const context = useContext(TapestryContext);
  if (!context) {
    throw new Error('useTapestryContext must be used within a TapestryProvider');
  }
  return context;
}

// Optional hook that doesn't throw (for optional usage)
export function useTapestryContextOptional(): TapestryContextValue | null {
  return useContext(TapestryContext);
}
