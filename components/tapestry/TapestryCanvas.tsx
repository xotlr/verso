'use client';

/**
 * TapestryCanvas - Main orchestrator component for the Tapestry v2
 *
 * Pure React implementation replacing the D3-based tapestry.
 * Coordinates all sub-components and state management.
 */

import {
  useCallback,
  useMemo,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import type { TapestryNode, TapestryConnection, TapestryGroup, TapestryState, TapestryNodeType } from '@/types/tapestry';
import { createTapestryLookups } from '@/lib/tapestry/lookups';
import { getVisibleNodeIds, getContentBounds } from '@/lib/tapestry/virtualization';
import type { HighlightState } from '@/lib/tapestry/types';

import { TapestryProvider, useTapestryContext, type Transform } from './state/TapestryContext';
import { usePanZoom } from './hooks/usePanZoom';
import { useTouchGestures } from './hooks/useTouchGestures';
import { useViewportTracking } from './hooks/useViewportTracking';
import { useMarqueeSelect, MarqueeOverlay } from './hooks/useMarqueeSelect';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useAutoCluster } from './hooks/useAutoCluster';
import { useContextMenu, type ContextMenuState } from './hooks/useContextMenu';
import { useGroupPhysics } from './hooks/useGroupPhysics';
import { useCollapseAnimation } from './hooks/useCollapseAnimation';
import { SVGCanvas } from './components/SVGCanvas';
import { NodeRenderer } from './components/NodeRenderer';
import { ConnectionRenderer } from './components/ConnectionRenderer';
import { GroupRenderer } from './components/GroupRenderer';
import { MinimapV2 } from './components/MinimapV2';

// ============================================================================
// Types
// ============================================================================

export interface TapestryCanvasHandle {
  /** Zoom in */
  zoomIn: () => void;
  /** Zoom out */
  zoomOut: () => void;
  /** Reset view to initial */
  resetView: () => void;
  /** Fit all content in view */
  fitToContent: () => void;
  /** Pan to center on a point */
  panTo: (x: number, y: number) => void;
  /** Run auto-cluster layout */
  autoCluster: () => void;
  /** Get current transform */
  getTransform: () => { zoom: number; panX: number; panY: number };
  /** Get selected node IDs */
  getSelectedNodeIds: () => string[];
  /** Select nodes */
  selectNodes: (nodeIds: string[]) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

export interface TapestryCanvasProps {
  /** Initial tapestry state */
  initialState?: TapestryState;
  /** All nodes */
  nodes: TapestryNode[];
  /** All connections */
  connections: TapestryConnection[];
  /** All groups */
  groups: TapestryGroup[];
  /** Initial zoom level */
  initialZoom?: number;
  /** Initial pan position */
  initialPan?: { x: number; y: number };
  /** Whether to show grid */
  showGrid?: boolean;
  /** Whether to show minimap */
  showMinimap?: boolean;
  /** Grid size for snapping (0 = disabled) */
  gridSize?: number;
  /** Callback when nodes change */
  onNodesChange?: (nodes: TapestryNode[]) => void;
  /** Callback when connections change */
  onConnectionsChange?: (connections: TapestryConnection[]) => void;
  /** Callback when groups change */
  onGroupsChange?: (groups: TapestryGroup[]) => void;
  /** Callback when transform changes */
  onTransformChange?: (transform: { zoom: number; panX: number; panY: number }) => void;
  /** Callback when node is selected */
  onNodeSelect?: (nodeId: string | null) => void;
  /** Callback when node is double-clicked (edit) */
  onNodeEdit?: (nodeId: string) => void;
  /** Callback when node is deleted */
  onNodeDelete?: (nodeId: string) => void;
  /** Callback when nodes are deleted (batch) */
  onNodesDelete?: (nodeIds: string[]) => void;
  /** Callback when character profile should open */
  onOpenProfile?: (nodeId: string) => void;
  /** Callback to add a new node */
  onAddNode?: (type: TapestryNodeType, position: { x: number; y: number }) => void;
  /** Callback to start connecting from a node */
  onStartConnect?: (nodeId: string) => void;
  /** Callback when connection label is edited */
  onConnectionLabelEdit?: (connectionId: string, label: string) => void;
  /** Context menu render prop */
  renderContextMenu?: (state: ContextMenuState, onClose: () => void) => React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Undo callback */
  onUndo?: () => void;
  /** Redo callback */
  onRedo?: () => void;
  /** Can undo */
  canUndo?: boolean;
  /** Can redo */
  canRedo?: boolean;
  /** External highlight state (controlled) */
  highlightState?: HighlightState;
  /** Callback when highlight state changes */
  onHighlightChange?: (state: HighlightState) => void;
}

// ============================================================================
// Inner Canvas (uses context)
// ============================================================================

interface InnerCanvasProps extends Omit<TapestryCanvasProps, 'initialZoom' | 'initialPan'> {
  onRegisterHandle: (handle: TapestryCanvasHandle) => void;
}

function InnerCanvas({
  nodes,
  connections,
  groups,
  showGrid = true,
  showMinimap = true,
  gridSize = 0,
  onNodesChange,
  onConnectionsChange: _onConnectionsChange,
  onGroupsChange,
  onTransformChange,
  onNodeSelect,
  onNodeEdit,
  onNodeDelete,
  onNodesDelete,
  onOpenProfile,
  onAddNode: _onAddNode,
  onStartConnect: _onStartConnect,
  onConnectionLabelEdit,
  renderContextMenu,
  onRegisterHandle,
  className,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  highlightState: externalHighlightState,
  onHighlightChange,
}: InnerCanvasProps) {
  const {
    transform,
    transformRef,
    setTransform,
    updateTransformRef,
    containerRef,
    contentRef,
    containerSize,
    setContainerSize,
    viewport,
    selection,
    selectNodes,
    selectGroups,
    clearSelection,
    highlightState: contextHighlightState,
    setHighlightState: setContextHighlightState,
    setIsDragging,
    setIsPanning,
    minZoom,
    maxZoom,
  } = useTapestryContext();

  // Use external highlight state if provided, otherwise context
  const highlightState = externalHighlightState ?? contextHighlightState;
  // Reserved for future highlight state management
  void useCallback((state: HighlightState | ((prev: HighlightState) => HighlightState)) => {
    if (onHighlightChange) {
      const newState = typeof state === 'function' ? state(highlightState) : state;
      onHighlightChange(newState);
    } else {
      setContextHighlightState(state);
    }
  }, [onHighlightChange, highlightState, setContextHighlightState]);

  // Create lookups for O(1) access
  const lookups = useMemo(
    () => createTapestryLookups(nodes, connections, groups),
    [nodes, connections, groups]
  );

  // Pan/zoom handling
  const { zoomIn, zoomOut, resetView, fitToContent, panTo } = usePanZoom({
    containerRef,
    contentRef,
    transform,
    transformRef,
    updateTransformRef,
    setTransform,
    minZoom,
    maxZoom,
    onPanStart: () => setIsPanning(true),
    onPanEnd: () => setIsPanning(false),
  });

  // Touch gestures
  useTouchGestures({
    containerRef,
    contentRef,
    transformRef,
    updateTransformRef,
    setTransform,
    minZoom,
    maxZoom,
  });

  // Track viewport changes
  useViewportTracking({
    transform,
    containerWidth: containerSize.width,
    containerHeight: containerSize.height,
  });

  // Marquee selection
  const { marqueeRect, isSelecting } = useMarqueeSelect({
    containerRef,
    transformRef,
    nodes,
    onSelectionChange: (nodeIds, additive) => {
      selectNodes(nodeIds, additive);
    },
  });

  // Context menu
  const { contextMenu, closeContextMenu } = useContextMenu({
    containerRef,
  });

  // Group physics for collapsed groups
  const [, forceUpdate] = useState(0);
  const {
    startDrag: startPhysicsDrag,
    updateDrag: updatePhysicsDrag,
    endDrag: endPhysicsDrag,
    getCardTransforms,
  } = useGroupPhysics({
    groups,
    nodes,
    onPhysicsUpdate: useCallback(() => {
      // Force re-render when physics updates
      forceUpdate(n => n + 1);
    }, []),
  });

  // Collapse animation
  const {
    animateCollapse,
    getCollapseProgress,
    isAnimating: isCollapseAnimating,
  } = useCollapseAnimation({
    onAnimationComplete: useCallback((groupId: string, collapsed: boolean) => {
      // Update the group's collapsed state when animation completes
      const updatedGroups = groups.map(group =>
        group.id === groupId ? { ...group, collapsed, collapseProgress: undefined } : group
      );
      onGroupsChange?.(updatedGroups);
    }, [groups, onGroupsChange]),
  });

  // Get collapsed group IDs for filtering (must be after useCollapseAnimation)
  const collapsedGroupIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach(group => {
      // A group is effectively collapsed if:
      // 1. It's collapsed and not animating to expand
      // 2. OR it's animating to collapse (progress > 0.5)
      const progress = getCollapseProgress(group.id);
      const isAnimating = progress !== undefined;
      const effectivelyCollapsed = isAnimating
        ? progress > 0.5  // After halfway through collapse animation, hide nodes
        : group.collapsed;

      if (effectivelyCollapsed) {
        ids.add(group.id);
      }
    });
    return ids;
  }, [groups, getCollapseProgress]);

  // Filter out nodes that belong to collapsed groups
  const visibleNodes = useMemo(
    () => nodes.filter(node => !node.groupId || !collapsedGroupIds.has(node.groupId)),
    [nodes, collapsedGroupIds]
  );

  // Get visible node IDs for virtualization
  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(visibleNodes, viewport, 100),
    [visibleNodes, viewport]
  );

  // Auto-cluster
  const { autoCluster } = useAutoCluster({
    width: containerSize.width,
    height: containerSize.height,
  });

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = Array.from(selection.selectedNodeIds);
    if (selectedIds.length > 0) {
      if (onNodesDelete) {
        onNodesDelete(selectedIds);
      } else if (onNodeDelete) {
        selectedIds.forEach(id => onNodeDelete(id));
      }
      clearSelection();
    }
  }, [selection.selectedNodeIds, onNodesDelete, onNodeDelete, clearSelection]);

  // Keyboard navigation
  useKeyboardNav({
    containerRef,
    nodes,
    selectedNodeIds: selection.selectedNodeIds,
    onSelectNodes: (ids) => selectNodes(ids),
    onClearSelection: clearSelection,
    onDeleteSelected: handleDeleteSelected,
    onEditNode: onNodeEdit,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetView: resetView,
    onUndo,
    onRedo,
  });

  // Fit to content helper
  const handleFitToContent = useCallback(() => {
    const bounds = getContentBounds(nodes);
    if (bounds.width > 0 && bounds.height > 0) {
      fitToContent(bounds);
    }
  }, [nodes, fitToContent]);

  // Auto-cluster helper
  const handleAutoCluster = useCallback(() => {
    const newNodes = autoCluster(nodes, connections);
    onNodesChange?.(newNodes);
  }, [autoCluster, nodes, connections, onNodesChange]);

  // Register handle for parent access
  useEffect(() => {
    onRegisterHandle({
      zoomIn,
      zoomOut,
      resetView,
      fitToContent: handleFitToContent,
      panTo,
      autoCluster: handleAutoCluster,
      getTransform: () => ({
        zoom: transform.scale,
        panX: transform.x,
        panY: transform.y,
      }),
      getSelectedNodeIds: () => Array.from(selection.selectedNodeIds),
      selectNodes: (nodeIds) => selectNodes(nodeIds),
      clearSelection,
      undo: onUndo ?? (() => {}),
      redo: onRedo ?? (() => {}),
      canUndo: canUndo ?? false,
      canRedo: canRedo ?? false,
    });
  }, [
    onRegisterHandle,
    zoomIn,
    zoomOut,
    resetView,
    handleFitToContent,
    panTo,
    handleAutoCluster,
    transform,
    selection.selectedNodeIds,
    selectNodes,
    clearSelection,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  ]);

  // Notify parent of transform changes
  useEffect(() => {
    onTransformChange?.({
      zoom: transform.scale,
      panX: transform.x,
      panY: transform.y,
    });
  }, [transform, onTransformChange]);

  // Handle container resize
  const handleResize = useCallback(
    (width: number, height: number) => {
      setContainerSize({ width, height });
    },
    [setContainerSize]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      if (event.shiftKey) {
        selectNodes([nodeId], true);
      } else {
        selectNodes([nodeId]);
      }
      onNodeSelect?.(nodeId);
    },
    [selectNodes, onNodeSelect]
  );

  // Reserved for future double-click handling (profile panel on characters)
  void useCallback(
    (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.type === 'character' && onOpenProfile) {
        onOpenProfile(nodeId);
      } else {
        onNodeEdit?.(nodeId);
      }
    },
    [nodes, onOpenProfile, onNodeEdit]
  );

  // Handle node drag start
  const handleDragStart = useCallback(
    (nodeId: string) => {
      setIsDragging(true);
      if (!selection.selectedNodeIds.has(nodeId)) {
        selectNodes([nodeId]);
      }
    },
    [setIsDragging, selection.selectedNodeIds, selectNodes]
  );

  // Handle node drag move
  const handleDragMove = useCallback(
    (_nodeId: string, _x: number, _y: number) => {
      // Connection updates happen via DOM manipulation in useDragNode
    },
    []
  );

  // Handle node drag end
  const handleDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      setIsDragging(false);
      const updatedNodes = nodes.map(node =>
        node.id === nodeId ? { ...node, x, y } : node
      );
      onNodesChange?.(updatedNodes);
    },
    [setIsDragging, nodes, onNodesChange]
  );

  // Handle node delete
  const handleDelete = useCallback(
    (nodeId: string) => {
      onNodeDelete?.(nodeId);
    },
    [onNodeDelete]
  );

  // Handle node edit
  const handleEdit = useCallback(
    (nodeId: string) => {
      onNodeEdit?.(nodeId);
    },
    [onNodeEdit]
  );

  // Handle group click
  const handleGroupClick = useCallback(
    (groupId: string) => {
      selectGroups([groupId]);
    },
    [selectGroups]
  );

  // Handle group collapse toggle with animation
  const handleToggleCollapse = useCallback(
    (groupId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      // Don't toggle if already animating
      if (isCollapseAnimating(groupId)) return;

      // Start animation (will update collapsed state when complete)
      animateCollapse(groupId, !group.collapsed);
    },
    [groups, animateCollapse, isCollapseAnimating]
  );

  // Handle group drag events for physics
  const handleGroupDragStart = useCallback(
    (groupId: string) => {
      startPhysicsDrag(groupId);
    },
    [startPhysicsDrag]
  );

  const handleGroupDragMove = useCallback(
    (groupId: string, dx: number, dy: number) => {
      updatePhysicsDrag(groupId, dx, dy);
    },
    [updatePhysicsDrag]
  );

  const handleGroupDragEndWithPhysics = useCallback(
    (
      groupId: string,
      position: { x: number; y: number },
      childUpdates: Array<{ id: string; x: number; y: number }>
    ) => {
      endPhysicsDrag(groupId);

      const updatedGroups = groups.map(group =>
        group.id === groupId ? { ...group, x: position.x, y: position.y } : group
      );
      onGroupsChange?.(updatedGroups);

      if (childUpdates.length > 0) {
        const updateMap = new Map(childUpdates.map(u => [u.id, u]));
        const updatedNodes = nodes.map(node => {
          const update = updateMap.get(node.id);
          return update ? { ...node, x: update.x, y: update.y } : node;
        });
        onNodesChange?.(updatedNodes);
      }
    },
    [groups, nodes, endPhysicsDrag, onGroupsChange, onNodesChange]
  );

  // Handle minimap pan
  const handleMinimapPan = useCallback(
    (x: number, y: number) => {
      panTo(x, y);
    },
    [panTo]
  );

  // Transform string for SVG
  const transformString = `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`;

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <SVGCanvas
        svgRef={containerRef}
        contentRef={contentRef}
        transform={transformString}
        showGrid={showGrid}
        onResize={handleResize}
      >
        {/* Groups (render first, behind everything) */}
        <GroupRenderer
          groups={groups}
          nodes={nodes}
          viewport={viewport}
          selectedGroupIds={selection.selectedGroupIds}
          onGroupClick={handleGroupClick}
          onToggleCollapse={handleToggleCollapse}
          onGroupDragStart={handleGroupDragStart}
          onGroupDragMove={handleGroupDragMove}
          onGroupDragEnd={handleGroupDragEndWithPhysics}
          getCardTransforms={getCardTransforms}
          getCollapseProgress={getCollapseProgress}
        />

        {/* Connections (filtered based on visible nodes) */}
        <ConnectionRenderer
          connections={connections}
          nodeById={lookups.nodeById}
          visibleNodeIds={visibleNodeIds}
          collapsedGroupIds={collapsedGroupIds}
          highlightState={highlightState}
          selectedConnectionIds={selection.selectedConnectionIds}
          onLabelEdit={onConnectionLabelEdit}
        />

        {/* Nodes (filtered to exclude those in collapsed groups) */}
        <NodeRenderer
          nodes={visibleNodes}
          viewport={viewport}
          selectedNodeIds={selection.selectedNodeIds}
          highlightState={highlightState}
          onNodeClick={handleNodeClick}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDelete={handleDelete}
          onEdit={handleEdit}
          gridSize={gridSize}
        />

        {/* Marquee selection overlay */}
        {isSelecting && <MarqueeOverlay rect={marqueeRect} />}
      </SVGCanvas>

      {/* Minimap */}
      {showMinimap && (
        <MinimapV2
          nodes={nodes}
          groups={groups}
          viewport={viewport}
          transform={transform}
          containerSize={containerSize}
          onPanTo={handleMinimapPan}
        />
      )}

      {/* Context Menu */}
      {contextMenu && renderContextMenu?.(contextMenu, closeContextMenu)}
    </div>
  );
}

// ============================================================================
// Main Component (with Provider and forwardRef)
// ============================================================================

export const TapestryCanvas = forwardRef<TapestryCanvasHandle, TapestryCanvasProps>(
  function TapestryCanvas(
    { initialZoom = 1, initialPan = { x: 0, y: 0 }, ...props },
    ref
  ) {
    const [handle, setHandle] = useState<TapestryCanvasHandle | null>(null);

    // Expose handle via ref
    useImperativeHandle(ref, () => handle!, [handle]);

    const initialTransform: Transform = {
      x: initialPan.x,
      y: initialPan.y,
      scale: initialZoom,
    };

    return (
      <TapestryProvider initialTransform={initialTransform}>
        <InnerCanvas {...props} onRegisterHandle={setHandle} />
      </TapestryProvider>
    );
  }
);

TapestryCanvas.displayName = 'TapestryCanvas';
