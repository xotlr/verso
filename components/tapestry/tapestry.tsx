'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTapestryHistory } from '@/hooks/tapestry/use-tapestry-history';
import { useTapestrySelection } from '@/hooks/tapestry/use-tapestry-selection';
import { useTapestryLayout } from '@/hooks/tapestry/use-tapestry-layout';
import { useTapestryActions } from '@/hooks/tapestry/use-tapestry-actions';
import { useTapestryPhysics } from '@/hooks/tapestry/use-tapestry-physics';
import { useTapestryClipboard } from '@/hooks/tapestry/use-tapestry-clipboard';
import { useTapestryNavigation } from '@/hooks/tapestry/use-tapestry-navigation';
import { useTapestryKeyboard } from '@/hooks/tapestry/use-tapestry-keyboard';
import { useTapestryAutoSync } from '@/hooks/tapestry/use-tapestry-auto-sync';
import { useTapestryZoom } from '@/hooks/tapestry/use-tapestry-zoom';
import { useTapestryFilters } from '@/hooks/tapestry/use-tapestry-filters';
import { TapestryUIOverlay } from './TapestryUIOverlay';
// D3 tree-shaken imports (~200KB savings vs full bundle)
import { select, pointer } from 'd3-selection';
import { zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import {
  TapestryNode,
  TapestryState,
  ConnectionType,
  createEmptyTapestry,
  getTapestryStorageKey,
  migrateTapestryState,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
} from '@/types/tapestry';
import '@/styles/tapestry.css';
import { TapestryToolbar } from './tapestry-toolbar';
import { createDefaultFilters, type TapestryFilters } from './filter-panel';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import { Scene, Location } from '@/types/screenplay';
import type { IndexCard } from '@/components/index-cards';
import type { CharacterInfo } from '@/hooks/editor/types';
import { PaperNoise } from '@/components/prosemirror/PaperNoise';
import { useSettings } from '@/contexts/settings-context';

// Layout system imports (most computations moved to useTapestryLayout hook)
import {
  initializeSvgDefs,
  loadIndexCards,
} from '@/lib/tapestry';
import { Minimap } from './Minimap';

// Extracted rendering utilities
import {
  renderCharacterNode,
  renderStandardNode,
  setupNodeHoverBehavior,
} from './renderers';

// Extracted drag, zoom, and event behavior factories
import { createNodeDragBehavior, createGroupDragBehavior, createZoomBehavior, setupNodeEventHandlers, setupMarqueeHandlers, setupGroupControls, renderBundledEdges, renderStandardConnections, renderGroups } from './hooks';

interface TapestryProps {
  screenplayId: string;
  screenplayTitle: string;
  scenes?: Scene[];
  characters?: CharacterInfo[];
  locations?: Location[];
  onSceneClick?: (sceneId: string) => void;
}

export function Tapestry({
  screenplayId,
  screenplayTitle,
  scenes = [],
  characters = [],
  locations = [],
  onSceneClick,
}: TapestryProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get theme settings for border radius
  const { settings } = useSettings();
  const themeRadius = settings.visual.borderRadius;
  // Scale radius values proportionally (base is 12px)
  const getRadius = (base: number) => Math.round((base / 12) * themeRadius);

  // Use history hook for undo/redo support
  const {
    state,
    setState,
    undo,
    redo,
    resetState,
    canUndo,
    canRedo,
  } = useTapestryHistory(createEmptyTapestry());

  // Use selection hook for selection, connection mode, marquee, and highlighting
  const {
    selectedNodes,
    setSelectedNodes,
    isConnecting,
    setIsConnecting,
    connectingFrom,
    setConnectingFrom,
    setIsMarqueeSelecting,
    setMarqueeStart,
    setMarqueeEnd,
    marqueeRef,
    startMarquee,
    updateMarquee,
    highlightState,
    highlightedConnections,
    highlightedNodeIds,
    hasAnyHighlight,
  } = useTapestrySelection({
    nodes: state.nodes,
    connections: state.connections,
  });

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [editingNode, setEditingNode] = useState<TapestryNode | null>(null);
  const [filters, setFilters] = useState<TapestryFilters>(createDefaultFilters);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    groupId?: string;
  } | null>(null);

  // Toggle for new layout mode (can be controlled via toolbar)
  const [useNewLayout] = useState(false);

  // Character profile panel state
  const [profileCharacter, setProfileCharacter] = useState<TapestryNode | null>(null);

  // Toggle for showing all connection lines (off by default)
  const [showAllLines, setShowAllLines] = useState(false);

  // Note: Clipboard state and operations are now provided by useTapestryClipboard hook

  // Connection label editing state
  const [editingConnection, setEditingConnection] = useState<{
    id: string;
    x: number;
    y: number;
    label: string;
    type: ConnectionType;
  } | null>(null);

  // Reset trigger to force layout regeneration
  const [resetTrigger, setResetTrigger] = useState(0);

  // Snap-to-grid toggle
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Note: Marquee selection state is now provided by useTapestrySelection hook

  // Note: highlightedConnections and highlightedNodeIds are now provided by useTapestrySelection hook
  // Note: Physics state (physicsRef, animateCollapse, startPhysicsLoop) is now provided by useTapestryPhysics hook

  // Get available characters for filter panel
  const availableCharacters = characters.map(c => c.name);

  // Transform ref for D3 zoom (declared early so layout hook can use it)
  const transformRef = useRef<ZoomTransform>(zoomIdentity);

  // Layout computations (extracted to hook for better organization)
  const {
    layout,
    edgeBundles,
    highlightedEdges,
    lookups,
    groupBoundsMap,
    updateViewport,
    visibleNodes,
    visibleConnections,
  } = useTapestryLayout({
    nodes: state.nodes,
    connections: state.connections,
    groups: state.groups,
    dimensions,
    transformRef,
    useNewLayout,
    highlightState,
  });

  // Filter matching logic (extracted to hook)
  const { nodeMatchesFilters } = useTapestryFilters({ filters, scenes });

  // Refs for D3 (transformRef declared earlier for layout hook)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const lastTapRef = useRef<{ nodeId: string; time: number } | null>(null);
  const snapToGridRef = useRef(snapToGrid);

  // Keep snap ref in sync with state
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Load state from localStorage with migration (doesn't push to history)
  useEffect(() => {
    const storageKey = getTapestryStorageKey(screenplayId);
    const result = safeGetItem<TapestryState>(storageKey);

    if (result.success && result.data) {
      // Migrate legacy data if needed
      const migrated = migrateTapestryState(result.data);
      resetState(migrated); // Use resetState to avoid pushing to history
      transformRef.current = zoomIdentity
        .translate(migrated.panX, migrated.panY)
        .scale(migrated.zoom);

      // Save migrated data back if it changed
      if (result.data !== migrated) {
        safeSetItem(storageKey, migrated);
      }
    }
  }, [screenplayId, resetState]);

  // Auto-sync screenplay data (scenes, characters, locations) to tapestry nodes
  useTapestryAutoSync({
    screenplayId,
    scenes,
    characters,
    locations,
    resetTrigger,
    setState,
  });

  // Save state to localStorage
  const saveState = useCallback((newState: TapestryState) => {
    const storageKey = getTapestryStorageKey(screenplayId);
    safeSetItem(storageKey, newState);
  }, [screenplayId]);

  // Extracted action callbacks (node/group creation, deletion, clustering, etc.)
  const {
    handleAddNode,
    handleAddGroup,
    handleGroupSelected,
    handleAutoCluster,
    handleBarycenterSort,
    handleToggleLines,
    handleSaveConnectionLabel,
    handleSaveConnectionType,
    handleStartConnect,
    handleDeleteSelected,
    handleTogglePin,
  } = useTapestryActions({
    state,
    setState,
    saveState,
    selectedNodes,
    setSelectedNodes,
    dimensions,
    transformRef,
    setIsConnecting,
    setConnectingFrom,
    setEditingConnection,
    setShowAllLines,
  });

  // Extracted physics system for paper stack spring animation
  const {
    physicsRef,
    startPhysicsLoop,
    animateCollapse,
  } = useTapestryPhysics({
    setState,
    saveState,
  });

  // Extracted clipboard operations
  const {
    clipboard,
    handleCopyNodes,
    handlePasteNodes,
    handleDuplicateSelected,
  } = useTapestryClipboard({
    state,
    setState,
    saveState,
    selectedNodes,
    setSelectedNodes,
    dimensions,
    transformRef,
  });

  // Extracted navigation operations
  const {
    handleNudgeSelected,
    handleCycleSelection,
    snapToGridValue,
  } = useTapestryNavigation({
    state,
    setState,
    saveState,
    selectedNodes,
    setSelectedNodes,
    snapToGrid,
  });

  // Extracted keyboard shortcuts
  useTapestryKeyboard({
    undo,
    redo,
    selectedNodes,
    setSelectedNodes,
    handleDeleteSelected,
    handleCopyNodes,
    handlePasteNodes,
    handleDuplicateSelected,
    handleNudgeSelected,
    handleCycleSelection,
    setIsConnecting,
    setContextMenu,
  });

  // Zoom controls
  const {
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleResetLayout,
  } = useTapestryZoom({
    svgRef,
    zoomRef,
    transformRef,
    screenplayId,
    resetState,
    setResetTrigger,
  });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const { width, height } = dimensions;

    // Initialize SVG with grid, markers, filters, and background
    const container = initializeSvgDefs(svg, { snapToGrid, width, height });

    // Setup zoom with touch gesture support using extracted factory
    const zoomBehavior = createZoomBehavior({
      container,
      transformRef,
      setState,
      saveState,
      updateViewport,
    });

    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // Apply saved transform
    svg.call(zoomBehavior.transform, transformRef.current);

    // Create all SVG layer groups upfront (order matters for z-index)
    const groupsGroup = container.append('g').attr('class', 'groups');
    const connectionsGroup = container.append('g').attr('class', 'connections');
    const nodesGroup = container.append('g').attr('class', 'nodes');

    // Create drag behavior for groups using extracted factory (now that all groups exist)
    const groupDrag = createGroupDragBehavior({
      container: container as any,
      nodesGroup: nodesGroup as any,
      connectionsGroup: connectionsGroup as any,
      lookups,
      physicsRef,
      startPhysicsLoop,
      setState,
      saveState,
    });

    // Render groups using extracted factory
    renderGroups({
      groups: state.groups,
      groupsGroup: groupsGroup as any,
      groupDrag: groupDrag as any,
      lookups,
      groupBoundsMap,
      physicsRef,
      getRadius,
      animateCollapse,
      setState,
      saveState,
      setContextMenu,
    });

    // Use bundled edges when new layout is active
    if (layout && edgeBundles.length > 0) {
      // Render bundled edges using extracted factory
      renderBundledEdges({
        connectionsGroup: connectionsGroup as any,
        edgeBundles,
        layout,
        nodes: state.nodes,
        groups: state.groups,
        highlightedConnections,
        highlightedEdges,
        hasAnyHighlight,
        selectedNodesSize: selectedNodes.size,
        nodeMatchesFilters,
        setState,
        saveState,
      });
    } else {
      // Fallback: original connection rendering for non-bundled mode using extracted factory
      renderStandardConnections({
        connectionsGroup: connectionsGroup as any,
        visibleConnections,
        lookups,
        highlightedConnections,
        showAllLines,
        nodeMatchesFilters,
        setState,
        saveState,
        onEditConnection: (conn, midX, midY) => {
          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            const screenX = midX * transformRef.current.k + transformRef.current.x + svgRect.left;
            const screenY = midY * transformRef.current.k + transformRef.current.y + svgRect.top;
            setEditingConnection({
              id: conn.id,
              x: screenX,
              y: screenY,
              label: conn.label || '',
              type: conn.type,
            });
          }
        },
      });
    }

    // Create node drag behavior using extracted factory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeDragBehavior = createNodeDragBehavior({
      container,
      connectionsGroup: connectionsGroup as any,
      lookups,
      groupBoundsMap,
      groups: state.groups,
      snapToGridRef,
      setState,
      saveState,
    });

    // Load index cards for scene status display
    const indexCards = loadIndexCards(screenplayId);
    const cardsBySceneId = new Map(indexCards.map(c => [c.sceneId, c]));

    // Render each VISIBLE node (virtualization - only render nodes in viewport)
    // This dramatically reduces DOM elements for large tapestries
    visibleNodes.forEach(node => {
      // Skip nodes in collapsed groups OR groups that are animating collapse/expand
      // O(1) lookup instead of O(N) find
      if (node.groupId) {
        const parentGroup = lookups.groupById.get(node.groupId);
        if (parentGroup?.collapsed || parentGroup?.collapseProgress !== undefined) return;
      }

      const nodeWidth = node.width || DEFAULT_NOTE_WIDTH;
      const nodeHeight = node.height || DEFAULT_NOTE_HEIGHT;
      const nodeType = node.type || 'note';
      const matchesFilter = nodeMatchesFilters(node);


      // Monochromatic styling - uses primary color for selection/hover
      const mutedHeaderColor = 'hsl(var(--muted))';
      const isSelected = selectedNodes.has(node.id);

      // Determine if this node is highlighted from selection
      const isNodeHighlighted = highlightedNodeIds.has(node.id);
      const hasActiveSelection = selectedNodes.size > 0;

      // Build accessible label for screen readers
      const nodeAriaLabel = nodeType === 'character'
        ? `${node.title}, character, ${node.dialogueCount || 0} lines`
        : nodeType === 'scene'
          ? `Scene ${node.sceneNumber || ''}: ${node.title || node.content?.slice(0, 30) || 'Untitled'}`
          : `${node.title || 'Note'}: ${node.content?.slice(0, 30) || ''}`;

      const nodeGroup = nodesGroup.append('g')
        .datum(node)
        .attr('class', `node tapestry-node ${nodeType}-node ${nodeType === 'character' ? 'polaroid-node' : ''} ${isSelected ? 'selected' : ''} ${isNodeHighlighted ? 'highlighted' : ''}`)
        .attr('data-node-id', node.id)
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .attr('cursor', 'grab')
        .attr('opacity', matchesFilter ? (hasActiveSelection && !isNodeHighlighted ? 0.15 : 1) : 0.2)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', nodeAriaLabel)
        .attr('aria-selected', isSelected ? 'true' : 'false')
        .call(nodeDragBehavior);

      // ========== POLAROID STYLE FOR CHARACTER NODES ==========
      if (nodeType === 'character') {
        renderCharacterNode({
          nodeGroup,
          node,
          isSelected,
          getRadius,
        });

      } else {
        // ========== STANDARD NODE RENDERING ==========
        // Get scene-specific data if this is a scene node
        let sceneStatus: string | undefined;
        let locationName: string | undefined;
        if (nodeType === 'scene' && node.sceneId) {
          const card = cardsBySceneId.get(node.sceneId);
          sceneStatus = card?.status || 'draft';
          const scene = scenes.find(s => s.id === node.sceneId);
          locationName = scene?.location?.name;
        }

        renderStandardNode({
          nodeGroup,
          node,
          nodeType,
          nodeWidth,
          nodeHeight,
          isSelected,
          getRadius,
          mutedHeaderColor,
          sceneStatus,
          locationName,
        });

        // Set up hover behavior for monochromatic styling
        setupNodeHoverBehavior(nodeGroup, node.id, selectedNodes, mutedHeaderColor);
      } // End else (standard node rendering)

      // Set up all event handlers using extracted factory
      setupNodeEventHandlers({
        node,
        nodeGroup: nodeGroup as any,
        lastTapRef,
        selectedNodes,
        isConnecting,
        connectingFrom,
        setEditingNode,
        setSelectedNodes,
        setProfileCharacter,
        setIsConnecting,
        setConnectingFrom,
        setContextMenu,
        setState,
        saveState,
        handleDeleteSelected,
      });
    });

    // Group controls overlay (rendered ON TOP of nodes for interactivity)
    const groupControlsOverlay = container.append('g').attr('class', 'group-controls-overlay');

    // Set up group controls using extracted factory
    setupGroupControls({
      groups: state.groups,
      groupControlsOverlay: groupControlsOverlay as any,
      groupsGroup: groupsGroup as any,
      nodesGroup: nodesGroup as any,
      connectionsGroup: connectionsGroup as any,
      container: container as any,
      lookups,
      groupBoundsMap,
      setState,
      saveState,
      animateCollapse,
    });

    // Set up marquee selection handlers using extracted factory
    setupMarqueeHandlers({
      svg: svg as any,
      container: container as any,
      nodes: state.nodes,
      marqueeRef,
      isConnecting,
      startMarquee,
      updateMarquee,
      setIsMarqueeSelecting,
      setMarqueeStart,
      setMarqueeEnd,
      setSelectedNodes,
      setIsConnecting,
      setConnectingFrom,
      setContextMenu,
    });

    return () => {
      svg.on('.zoom', null);
      svg.on('mousedown', null);
      svg.on('mousemove', null);
      svg.on('mouseup', null);
      svg.on('contextmenu', null);
      svg.selectAll('*').remove();
    };
  }, [state.nodes, state.connections, state.groups, dimensions, isConnecting, connectingFrom, selectedNodes, saveState, onSceneClick, nodeMatchesFilters, layout, edgeBundles, highlightedEdges, hasAnyHighlight, showAllLines, highlightedConnections, highlightedNodeIds, snapToGrid, lookups, groupBoundsMap, visibleNodes, visibleConnections, updateViewport]);

  // Save edited node
  const handleSaveNote = useCallback((updatedNode: TapestryNode) => {
    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n),
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <TapestryToolbar
          onAddNode={handleAddNode}
          onAddGroup={handleAddGroup}
          onStartConnect={handleStartConnect}
          onDeleteNode={handleDeleteSelected}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onResetLayout={handleResetLayout}
          onToggleLines={handleToggleLines}
          onToggleSnap={() => setSnapToGrid(prev => !prev)}
          snapToGrid={snapToGrid}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          showAllLines={showAllLines}
          hasSelectedNode={selectedNodes.size > 0}
          isConnecting={isConnecting}
          filters={filters}
          onFiltersChange={setFilters}
          availableCharacters={availableCharacters}
        />

        {/* Screen reader keyboard shortcuts description */}
        <div id="tapestry-shortcuts" className="sr-only">
          Keyboard shortcuts: Tab to cycle through nodes. Enter or Space to select.
          Shift+Enter to add to selection. Arrow keys to move selected nodes.
          E to edit focused node. Delete to remove selected. Escape to clear selection.
          Control+Z to undo. Control+Shift+Z to redo. Control+C to copy. Control+V to paste.
        </div>

        {/* Live region for selection announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {selectedNodes.size === 0
            ? ''
            : selectedNodes.size === 1
              ? `Selected: ${state.nodes.find(n => selectedNodes.has(n.id))?.title || 'node'}`
              : `${selectedNodes.size} nodes selected`}
        </div>

        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full touch-none"
          style={{ touchAction: 'none' }}
          role="application"
          aria-label={`Tapestry board for ${screenplayTitle}. ${state.nodes.length} nodes, ${state.connections.length} connections.`}
          aria-describedby="tapestry-shortcuts"
        >
          <title>Tapestry - {screenplayTitle}</title>
          {/* SVG filters for soft shadows (procreate style) */}
          <defs>
            <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
            </filter>
          </defs>
        </svg>

        {/* Paper texture overlay (procreate style) */}
        <PaperNoise opacity={0.025} intensity={0.15} />


        {/* Minimap for navigation */}
        {layout && (
          <Minimap
            layout={layout}
            bundles={edgeBundles}
            viewport={{
              x: transformRef.current.x,
              y: transformRef.current.y,
              width: dimensions.width,
              height: dimensions.height,
              scale: transformRef.current.k,
            }}
            onViewportChange={(x, y) => {
              if (svgRef.current && zoomRef.current) {
                const newTransform = zoomIdentity.translate(x, y).scale(transformRef.current.k);
                select(svgRef.current)
                  .transition()
                  .duration(300)
                  .call(zoomRef.current.transform, newTransform);
              }
            }}
          />
        )}

        {state.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-card/80 backdrop-blur rounded-lg border border-border/60 p-8">
              <p className="text-lg font-semibold text-foreground">Your tapestry is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add notes or scenes will auto-import from your screenplay
              </p>
            </div>
          </div>
        )}

        {/* UI Overlays: dialogs, context menus, connection editor */}
        <TapestryUIOverlay
          state={state}
          selectedNodes={selectedNodes}
          isConnecting={isConnecting}
          editingNode={editingNode}
          setEditingNode={setEditingNode}
          editingConnection={editingConnection}
          setEditingConnection={setEditingConnection}
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          profileCharacter={profileCharacter}
          setProfileCharacter={setProfileCharacter}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteSelected}
          onSaveConnectionLabel={handleSaveConnectionLabel}
          onSaveConnectionType={handleSaveConnectionType}
          onGroupSelected={handleGroupSelected}
          onAnimateCollapse={animateCollapse}
          onNavigateToScene={onSceneClick}
          setState={setState}
          saveState={saveState}
          setSelectedNodes={setSelectedNodes}
          setIsConnecting={setIsConnecting}
          setConnectingFrom={setConnectingFrom}
        />
      </div>
    </div>
  );
}
