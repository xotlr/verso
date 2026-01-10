/**
 * Tapestry Actions Hook
 *
 * Extracts action callbacks from the main tapestry component for cleaner organization.
 * Handles node/group creation, deletion, clustering, and connection management.
 */

import { useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from 'd3-force';
import type { ZoomTransform } from 'd3-zoom';
import {
  TapestryNode,
  TapestryState,
  TapestryNodeType,
  ConnectionType,
  createNode,
  createGroup,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_GROUP_WIDTH,
  DEFAULT_GROUP_HEIGHT,
} from '@/types/tapestry';

interface UseTapestryActionsOptions {
  state: TapestryState;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
  selectedNodes: Set<string>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  dimensions: { width: number; height: number };
  transformRef: React.MutableRefObject<ZoomTransform>;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  setConnectingFrom: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingConnection: React.Dispatch<React.SetStateAction<{
    id: string;
    x: number;
    y: number;
    label: string;
    type: ConnectionType;
  } | null>>;
  setShowAllLines: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTapestryActions({
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
}: UseTapestryActionsOptions) {
  // Add new node of specified type
  const handleAddNode = useCallback((type: TapestryNodeType) => {
    const centerX = dimensions.width / 2 - DEFAULT_NOTE_WIDTH / 2;
    const centerY = dimensions.height / 2 - DEFAULT_NOTE_HEIGHT / 2;

    const adjustedX = (centerX - transformRef.current.x) / transformRef.current.k;
    const adjustedY = (centerY - transformRef.current.y) / transformRef.current.k;

    const typeLabels: Record<TapestryNodeType, string> = {
      note: 'New Note',
      scene: 'New Scene',
      character: 'New Character',
      location: 'New Location',
      item: 'New Item',
    };

    const newNode = createNode({
      type,
      x: adjustedX + Math.random() * 50 - 25,
      y: adjustedY + Math.random() * 50 - 25,
      title: typeLabels[type],
      content: '',
    });

    setState(prev => {
      const newState = { ...prev, nodes: [...prev.nodes, newNode] };
      saveState(newState);
      return newState;
    });
    setSelectedNodes(new Set([newNode.id]));
  }, [dimensions, saveState, setState, setSelectedNodes, transformRef]);

  // Add new group
  const handleAddGroup = useCallback(() => {
    const centerX = dimensions.width / 2 - DEFAULT_GROUP_WIDTH / 2;
    const centerY = dimensions.height / 2 - DEFAULT_GROUP_HEIGHT / 2;

    const adjustedX = (centerX - transformRef.current.x) / transformRef.current.k;
    const adjustedY = (centerY - transformRef.current.y) / transformRef.current.k;

    const newGroup = createGroup({
      x: adjustedX + Math.random() * 50 - 25,
      y: adjustedY + Math.random() * 50 - 25,
      title: 'New Group',
    });

    setState(prev => {
      const newState = { ...prev, groups: [...prev.groups, newGroup] };
      saveState(newState);
      return newState;
    });
  }, [dimensions, saveState, setState, transformRef]);

  // Group selected nodes together
  const handleGroupSelected = useCallback(() => {
    if (selectedNodes.size < 2) return;

    const nodesToGroup = state.nodes.filter(n => selectedNodes.has(n.id));
    if (nodesToGroup.length < 2) return;

    const minX = Math.min(...nodesToGroup.map(n => n.x));
    const minY = Math.min(...nodesToGroup.map(n => n.y));

    const newGroup = createGroup({
      x: minX - 20,
      y: minY - 42,
      title: 'New Group',
    });

    setState(prev => {
      const newState = {
        ...prev,
        groups: [...prev.groups, newGroup],
        nodes: prev.nodes.map(n =>
          selectedNodes.has(n.id) ? { ...n, groupId: newGroup.id } : n
        ),
      };
      saveState(newState);
      return newState;
    });

    setSelectedNodes(new Set());
  }, [selectedNodes, state.nodes, saveState, setState, setSelectedNodes]);

  // Auto-cluster nodes using D3 force simulation
  const handleAutoCluster = useCallback(() => {
    if (state.nodes.length === 0) return;

    type SimNode = TapestryNode & SimulationNodeDatum;

    const simulationNodes: SimNode[] = state.nodes.map(node => ({
      ...node,
      fx: node.pinned ? node.x : undefined,
      fy: node.pinned ? node.y : undefined,
    }));

    const links = state.connections.map(conn => ({
      source: conn.sourceId,
      target: conn.targetId,
    }));

    const simulation = forceSimulation(simulationNodes)
      .force('link', forceLink<SimNode, typeof links[number]>(links)
        .id((d) => d.id)
        .distance(180)
        .strength(0.5))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', forceCollide().radius(100))
      .stop();

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    setState(prev => {
      const newNodes = prev.nodes.map(node => {
        if (node.pinned) return node;
        const simNode = simulationNodes.find(n => n.id === node.id);
        if (simNode && simNode.x !== undefined && simNode.y !== undefined) {
          return { ...node, x: simNode.x, y: simNode.y };
        }
        return node;
      });

      const newState = { ...prev, nodes: newNodes };
      saveState(newState);
      return newState;
    });
  }, [state.nodes, state.connections, dimensions, saveState, setState]);

  // Barycenter sorting - reorders scene Y positions to minimize line crossings
  const handleBarycenterSort = useCallback(() => {
    if (state.nodes.length === 0) return;

    const characterNodes = state.nodes.filter(n => n.type === 'character');
    const sceneNodes = state.nodes.filter(n => n.type === 'scene' && !n.pinned);

    if (characterNodes.length === 0 || sceneNodes.length === 0) return;

    const charYPositions = new Map(characterNodes.map(c => [c.id, c.y]));
    const sceneBarycenters: Array<{ node: TapestryNode; barycenter: number }> = [];

    sceneNodes.forEach(scene => {
      const connectedCharIds = state.connections
        .filter(c => c.targetId === scene.id || c.sourceId === scene.id)
        .map(c => c.sourceId === scene.id ? c.targetId : c.sourceId)
        .filter(id => charYPositions.has(id));

      if (connectedCharIds.length === 0) {
        sceneBarycenters.push({ node: scene, barycenter: scene.y });
      } else {
        const avgY = connectedCharIds.reduce((sum, id) => sum + (charYPositions.get(id) || 0), 0) / connectedCharIds.length;
        sceneBarycenters.push({ node: scene, barycenter: avgY });
      }
    });

    sceneBarycenters.sort((a, b) => a.barycenter - b.barycenter);

    const scenesByGroup = new Map<string | undefined, typeof sceneBarycenters>();
    sceneBarycenters.forEach(item => {
      const groupId = item.node.groupId;
      if (!scenesByGroup.has(groupId)) scenesByGroup.set(groupId, []);
      scenesByGroup.get(groupId)!.push(item);
    });

    const updatedNodes = new Map<string, { x: number; y: number }>();
    const sceneHeight = DEFAULT_NOTE_HEIGHT;
    const spacing = sceneHeight + 40;

    scenesByGroup.forEach((groupScenes) => {
      groupScenes.sort((a, b) => a.barycenter - b.barycenter);
      const groupYs = groupScenes.map(s => s.node.y);
      const minY = Math.min(...groupYs);

      groupScenes.forEach((item, i) => {
        updatedNodes.set(item.node.id, {
          x: item.node.x,
          y: minY + i * spacing,
        });
      });
    });

    setState(prev => {
      const newNodes = prev.nodes.map(node => {
        const update = updatedNodes.get(node.id);
        if (update) return { ...node, x: update.x, y: update.y };
        return node;
      });

      const newState = { ...prev, nodes: newNodes };
      saveState(newState);
      return newState;
    });
  }, [state.nodes, state.connections, saveState, setState]);

  // Toggle showing all connection lines
  const handleToggleLines = useCallback(() => {
    setShowAllLines(prev => !prev);
  }, [setShowAllLines]);

  // Save connection label
  const handleSaveConnectionLabel = useCallback((connectionId: string, label: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        connections: prev.connections.map(c =>
          c.id === connectionId ? { ...c, label: label.trim() || undefined } : c
        ),
      };
      saveState(newState);
      return newState;
    });
    setEditingConnection(null);
  }, [saveState, setState, setEditingConnection]);

  // Save connection type
  const handleSaveConnectionType = useCallback((connectionId: string, type: ConnectionType) => {
    setState(prev => {
      const newState = {
        ...prev,
        connections: prev.connections.map(c =>
          c.id === connectionId ? { ...c, type } : c
        ),
      };
      saveState(newState);
      return newState;
    });
    setEditingConnection(prev => prev ? { ...prev, type } : null);
  }, [saveState, setState, setEditingConnection]);

  // Start connecting (uses first selected node)
  const handleStartConnect = useCallback(() => {
    if (selectedNodes.size > 0) {
      const firstSelected = Array.from(selectedNodes)[0];
      setIsConnecting(true);
      setConnectingFrom(firstSelected);
    }
  }, [selectedNodes, setIsConnecting, setConnectingFrom]);

  // Delete selected nodes
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodes.size === 0) return;

    setState(prev => {
      const newState = {
        ...prev,
        nodes: prev.nodes.filter(n => !selectedNodes.has(n.id)),
        connections: prev.connections.filter(c =>
          !selectedNodes.has(c.sourceId) && !selectedNodes.has(c.targetId)
        ),
      };
      saveState(newState);
      return newState;
    });
    setSelectedNodes(new Set());
  }, [selectedNodes, saveState, setState, setSelectedNodes]);

  // Copy selected nodes
  const handleCopySelected = useCallback(() => {
    if (selectedNodes.size === 0) return [];
    return state.nodes.filter(n => selectedNodes.has(n.id));
  }, [selectedNodes, state.nodes]);

  // Paste nodes from clipboard
  const handlePasteNodes = useCallback((clipboard: TapestryNode[]) => {
    if (clipboard.length === 0) return;

    const newNodes = clipboard.map(node => createNode({
      ...node,
      x: node.x + 30,
      y: node.y + 30,
    }));

    setState(prev => {
      const newState = { ...prev, nodes: [...prev.nodes, ...newNodes] };
      saveState(newState);
      return newState;
    });
    setSelectedNodes(new Set(newNodes.map(n => n.id)));
  }, [saveState, setState, setSelectedNodes]);

  // Pin/unpin selected nodes
  const handleTogglePin = useCallback(() => {
    if (selectedNodes.size === 0) return;

    setState(prev => {
      const anyPinned = prev.nodes.some(n => selectedNodes.has(n.id) && n.pinned);
      const newState = {
        ...prev,
        nodes: prev.nodes.map(n =>
          selectedNodes.has(n.id) ? { ...n, pinned: !anyPinned } : n
        ),
      };
      saveState(newState);
      return newState;
    });
  }, [selectedNodes, saveState, setState]);

  return {
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
    handleCopySelected,
    handlePasteNodes,
    handleTogglePin,
  };
}
