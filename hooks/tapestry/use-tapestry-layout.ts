'use client';

import { useMemo, useState, useCallback, useRef, type RefObject } from 'react';
import type { TapestryNode, TapestryConnection, TapestryGroup } from '@/types/tapestry';
import type { HighlightState } from './use-tapestry-selection';
import {
  computeLayout,
  createEdgeBundles,
  getHighlightedEdges,
  type LayoutResult,
  type EdgeBundle,
} from '@/lib/tapestry';
import {
  createTapestryLookups,
  type TapestryLookups,
} from '@/lib/tapestry/lookups';
import {
  computeGroupBounds,
  type GroupBounds,
} from '@/lib/tapestry/bounds';
import {
  calculateViewport,
  getVisibleNodes as getViewportVisibleNodes,
  getVisibleConnections,
  type Viewport,
} from '@/lib/tapestry/virtualization';

interface Transform {
  x: number;
  y: number;
  k: number;
}

interface UseTapestryLayoutOptions {
  nodes: TapestryNode[];
  connections: TapestryConnection[];
  groups: TapestryGroup[];
  dimensions: { width: number; height: number };
  /** Ref to the current D3 zoom transform (read imperatively) */
  transformRef: RefObject<Transform | null>;
  useNewLayout?: boolean;
  highlightState?: HighlightState;
}

/**
 * Hook for managing tapestry layout computations.
 * Handles layout calculation, edge bundling, lookups, bounds, and virtualization.
 */
export function useTapestryLayout({
  nodes,
  connections,
  groups,
  dimensions,
  transformRef,
  useNewLayout = false,
  highlightState,
}: UseTapestryLayoutOptions) {
  // Viewport state for virtualization
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: dimensions.width,
    height: dimensions.height,
  });
  const viewportRef = useRef<Viewport>(viewport);

  // Compute layout for minimap (always computed)
  const layout = useMemo<LayoutResult | null>(() => {
    if (nodes.length === 0) return null;
    return computeLayout({
      nodes,
      connections,
    });
  }, [nodes, connections]);

  // Create edge bundles for hierarchical bundling (only when new layout mode is enabled)
  const edgeBundles = useMemo<EdgeBundle[]>(() => {
    if (!useNewLayout || !layout) return [];
    return createEdgeBundles(layout, connections);
  }, [useNewLayout, layout, connections]);

  // Get highlighted edges based on current highlight state
  const highlightedEdges = useMemo(() => {
    if (!highlightState) return new Set<string>();
    const activeCharId = highlightState.lockedCharacterId || highlightState.hoveredCharacterId;
    const activeSceneId = highlightState.lockedSceneId || highlightState.hoveredSceneId;
    return getHighlightedEdges(edgeBundles, activeCharId, activeSceneId);
  }, [edgeBundles, highlightState]);

  // Create lookup maps for O(1) node/connection access
  const lookups = useMemo<TapestryLookups>(() => {
    return createTapestryLookups(nodes, connections, groups);
  }, [nodes, connections, groups]);

  // Pre-compute group bounds in a single O(N) pass
  const groupBoundsMap = useMemo<Map<string, GroupBounds>>(() => {
    return computeGroupBounds(nodes, groups);
  }, [nodes, groups]);

  // Debounced viewport update to avoid excessive re-renders during pan/zoom
  // Reads from transformRef imperatively (called on zoom end events)
  const updateViewport = useCallback(() => {
    const transform = transformRef.current;
    if (!transform) return;

    const newViewport = calculateViewport(
      dimensions.width,
      dimensions.height,
      transform.x,
      transform.y,
      transform.k
    );

    // Only update if viewport changed significantly (reduces re-renders)
    const current = viewportRef.current;
    const threshold = 50; // pixels
    if (
      Math.abs(current.x - newViewport.x) > threshold ||
      Math.abs(current.y - newViewport.y) > threshold ||
      Math.abs(current.width - newViewport.width) > threshold ||
      Math.abs(current.height - newViewport.height) > threshold
    ) {
      viewportRef.current = newViewport;
      setViewport(newViewport);
    }
  }, [dimensions, transformRef]);

  // Compute visible nodes based on viewport (virtualization)
  const { visibleNodes, visibleNodeIds } = useMemo(() => {
    // Include extra padding for smoother scrolling
    const visible = getViewportVisibleNodes(nodes, viewport, 200);
    const ids = new Set(visible.map(n => n.id));
    return { visibleNodes: visible, visibleNodeIds: ids };
  }, [nodes, viewport]);

  // Compute visible connections (only those with at least one visible endpoint)
  const visibleConnections = useMemo(() => {
    return getVisibleConnections(connections, visibleNodeIds);
  }, [connections, visibleNodeIds]);

  return {
    // Layout data
    layout,
    edgeBundles,
    highlightedEdges,

    // Lookups for O(1) access
    lookups,
    groupBoundsMap,

    // Viewport/virtualization
    viewport,
    viewportRef,
    updateViewport,
    visibleNodes,
    visibleNodeIds,
    visibleConnections,
  };
}
