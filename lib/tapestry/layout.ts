/**
 * Tapestry Layout Engine
 *
 * Computes positions for the sidebar-based layout:
 * - Characters/locations in a fixed sidebar on the left
 * - Scenes organized in act lanes to the right
 * - Dynamic lane widths based on connection density
 * - Barycenter-based ordering to minimize edge crossings
 */

import type { TapestryNode, TapestryConnection } from '@/types/tapestry';
import {
  type LayoutConfig,
  type LayoutResult,
  type SidebarEntity,
  type ActLane,
  type ScenePosition,
  type LayoutInput,
  DEFAULT_LAYOUT_CONFIG,
} from './types';

// ============================================================================
// Main Layout Function
// ============================================================================

/**
 * Computes the complete layout for the tapestry visualization.
 * This is the main entry point for the layout engine.
 */
export function computeLayout(input: LayoutInput): LayoutResult {
  const config = { ...DEFAULT_LAYOUT_CONFIG, ...input.config };
  const { nodes, connections } = input;

  // Separate nodes by type
  const characterNodes = nodes.filter(n => n.type === 'character');
  const locationNodes = nodes.filter(n => n.type === 'location');
  const sceneNodes = nodes.filter(n => n.type === 'scene');

  // Build connection lookup for quick access
  const connectionsBySource = buildConnectionLookup(connections, 'source');
  // connectionsByTarget reserved for future bidirectional edge routing
  void buildConnectionLookup(connections, 'target');

  // Compute scene positions first (needed for barycenter calculation)
  const { actLanes, scenes } = computeActLanesAndScenes(
    sceneNodes,
    connections,
    config
  );

  // Compute sidebar with barycenter-based ordering
  const sidebar = computeSidebarPositions(
    characterNodes,
    locationNodes,
    scenes,
    connectionsBySource,
    config
  );

  // Calculate gutter bounds
  const gutter = {
    x: config.paddingLeft + config.sidebarWidth,
    width: config.gutterWidth,
  };

  // Calculate total bounds
  const maxSceneX = Math.max(
    ...actLanes.map(lane => lane.x + lane.width),
    gutter.x + gutter.width + 100
  );
  const maxSceneY = Math.max(
    ...Array.from(scenes.values()).map(s => s.y + s.height),
    sidebar.contentHeight
  );

  return {
    config,
    sidebar,
    actLanes,
    scenes,
    gutter,
    bounds: {
      width: maxSceneX + config.paddingLeft,
      height: Math.max(maxSceneY + config.paddingTop, 600),
    },
  };
}

// ============================================================================
// Sidebar Positioning
// ============================================================================

/**
 * Computes positions for sidebar entities (characters and locations).
 * Uses barycenter ordering to minimize edge crossings.
 */
function computeSidebarPositions(
  characterNodes: TapestryNode[],
  locationNodes: TapestryNode[],
  scenes: Map<string, ScenePosition>,
  connectionsBySource: Map<string, TapestryConnection[]>,
  config: LayoutConfig
): LayoutResult['sidebar'] {
  // Create sidebar entities for characters
  const characters = characterNodes.map(node =>
    createSidebarEntity(node, 'character', scenes, connectionsBySource, config)
  );

  // Create sidebar entities for locations
  const locations = locationNodes.map(node =>
    createSidebarEntity(node, 'location', scenes, connectionsBySource, config)
  );

  // Apply barycenter sorting to minimize crossings
  barycenterSort(characters, scenes, connectionsBySource);
  barycenterSort(locations, scenes, connectionsBySource);

  // Assign Y positions
  let currentY = config.paddingTop;

  // Characters section
  characters.forEach(entity => {
    entity.y = currentY;
    currentY += entity.height + config.entitySpacing;
  });

  // Add gap between characters and locations
  if (characters.length > 0 && locations.length > 0) {
    currentY += config.entitySpacing * 2;
  }

  // Locations section
  locations.forEach(entity => {
    entity.y = currentY;
    currentY += entity.height + config.entitySpacing;
  });

  return {
    characters,
    locations,
    contentHeight: currentY,
  };
}

/**
 * Creates a SidebarEntity from a TapestryNode.
 */
function createSidebarEntity(
  node: TapestryNode,
  type: 'character' | 'location',
  scenes: Map<string, ScenePosition>,
  connectionsBySource: Map<string, TapestryConnection[]>,
  config: LayoutConfig
): SidebarEntity {
  const connections = connectionsBySource.get(node.id) || [];
  const connectedSceneIds = connections
    .filter(c => scenes.has(c.targetId))
    .map(c => c.targetId);

  // Calculate barycenter (average Y of connected scenes)
  const connectedScenes = connectedSceneIds
    .map(id => scenes.get(id))
    .filter((s): s is ScenePosition => s !== undefined);

  const barycenter = connectedScenes.length > 0
    ? connectedScenes.reduce((sum, s) => sum + s.y + s.height / 2, 0) / connectedScenes.length
    : Infinity; // Unconnected entities go to bottom

  return {
    id: `sidebar-${node.id}`,
    nodeId: node.id,
    type,
    name: node.title,
    color: node.color,
    dialogueCount: node.dialogueCount || 0,
    connectionCount: connectedSceneIds.length,
    y: 0, // Will be computed after sorting
    height: config.entityNodeHeight,
    barycenter,
  };
}

/**
 * Sorts sidebar entities by barycenter to minimize edge crossings.
 * This is a key step in the Sugiyama-inspired layout algorithm.
 */
function barycenterSort(
  entities: SidebarEntity[],
  scenes: Map<string, ScenePosition>,
  connectionsBySource: Map<string, TapestryConnection[]>
): void {
  // Recalculate barycenters
  entities.forEach(entity => {
    const connections = connectionsBySource.get(entity.nodeId) || [];
    const connectedScenes = connections
      .map(c => scenes.get(c.targetId))
      .filter((s): s is ScenePosition => s !== undefined);

    if (connectedScenes.length > 0) {
      entity.barycenter = connectedScenes.reduce(
        (sum, s) => sum + s.y + s.height / 2,
        0
      ) / connectedScenes.length;
    } else {
      entity.barycenter = Infinity;
    }
  });

  // Sort by barycenter, with secondary sort by dialogue count for ties
  entities.sort((a, b) => {
    if (Math.abs(a.barycenter - b.barycenter) < 1) {
      // Tie-breaker: higher dialogue count first
      return (b.dialogueCount || 0) - (a.dialogueCount || 0);
    }
    return a.barycenter - b.barycenter;
  });
}

// ============================================================================
// Act Lane and Scene Positioning
// ============================================================================

/**
 * Computes act lanes and scene positions within them.
 */
function computeActLanesAndScenes(
  sceneNodes: TapestryNode[],
  connections: TapestryConnection[],
  config: LayoutConfig
): { actLanes: ActLane[]; scenes: Map<string, ScenePosition> } {
  // Group scenes by act number
  const scenesByAct = groupScenesByAct(sceneNodes);
  const actNumbers = Array.from(scenesByAct.keys()).sort((a, b) => a - b);

  // Calculate connection density for each act transition
  const densityBetweenActs = calculateActDensities(sceneNodes, connections, actNumbers);

  // Create act lanes with positions
  const actLanes: ActLane[] = [];
  const scenes = new Map<string, ScenePosition>();

  // Starting X position (after sidebar + gutter)
  let currentX = config.paddingLeft + config.sidebarWidth + config.gutterWidth;

  actNumbers.forEach((actNum, index) => {
    const actScenes = scenesByAct.get(actNum) || [];

    // Calculate columns needed
    const columnCount = Math.ceil(actScenes.length / config.maxScenesPerColumn);

    // Calculate lane width
    const baseWidth = columnCount * (config.sceneNodeWidth + config.sceneHorizontalSpacing);
    const density = densityBetweenActs.get(actNum) || 0;
    const densityBonus = Math.min(density * 10, 60); // Cap the bonus
    const laneWidth = Math.max(config.actLaneWidth, baseWidth + densityBonus);

    // Create the lane
    const lane: ActLane = {
      actNumber: actNum,
      x: currentX,
      width: laneWidth,
      sceneNodeIds: actScenes.map(s => s.id),
      connectionDensity: density,
      columnCount,
    };
    actLanes.push(lane);

    // Position scenes within this lane
    actScenes.forEach((scene, sceneIndex) => {
      const column = Math.floor(sceneIndex / config.maxScenesPerColumn);
      const row = sceneIndex % config.maxScenesPerColumn;

      const x = currentX + column * (config.sceneNodeWidth + config.sceneHorizontalSpacing);
      const y = config.paddingTop + row * (config.sceneNodeHeight + config.sceneVerticalSpacing);

      scenes.set(scene.id, {
        nodeId: scene.id,
        sceneId: scene.sceneId || scene.id,
        sceneNumber: scene.sceneNumber || sceneIndex + 1,
        actNumber: actNum,
        x,
        y,
        width: config.sceneNodeWidth,
        height: config.sceneNodeHeight,
        column,
        row,
      });
    });

    // Calculate gap to next act
    const nextActNum = actNumbers[index + 1];
    const gapDensity = nextActNum ? (densityBetweenActs.get(nextActNum) || 0) : 0;
    const gap = config.actGap + gapDensity * 5;

    currentX += laneWidth + gap;
  });

  return { actLanes, scenes };
}

/**
 * Groups scene nodes by their act number.
 * Default: every 10 scenes = 1 act.
 */
function groupScenesByAct(sceneNodes: TapestryNode[]): Map<number, TapestryNode[]> {
  const byAct = new Map<number, TapestryNode[]>();

  // Sort scenes by scene number first
  const sortedScenes = [...sceneNodes].sort(
    (a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0)
  );

  sortedScenes.forEach(scene => {
    const actNum = getActNumber(scene.sceneNumber || 1);
    const actScenes = byAct.get(actNum) || [];
    actScenes.push(scene);
    byAct.set(actNum, actScenes);
  });

  return byAct;
}

/**
 * Returns the act number for a given scene number.
 * Default: 1-10 = Act 1, 11-20 = Act 2, etc.
 */
export function getActNumber(sceneNumber: number): number {
  return Math.ceil(sceneNumber / 10);
}

/**
 * Calculates connection density between act transitions.
 * Higher density means more edges crossing between acts.
 */
function calculateActDensities(
  sceneNodes: TapestryNode[],
  connections: TapestryConnection[],
  actNumbers: number[]
): Map<number, number> {
  const densities = new Map<number, number>();

  // Build scene ID to act number lookup
  const sceneToAct = new Map<string, number>();
  sceneNodes.forEach(scene => {
    const actNum = getActNumber(scene.sceneNumber || 1);
    sceneToAct.set(scene.id, actNum);
    if (scene.sceneId) {
      sceneToAct.set(scene.sceneId, actNum);
    }
  });

  // Count edges crossing into each act
  actNumbers.forEach(actNum => {
    let density = 0;
    connections.forEach(conn => {
      const sourceAct = sceneToAct.get(conn.sourceId);
      const targetAct = sceneToAct.get(conn.targetId);

      // Count character → scene connections entering this act
      if (targetAct === actNum && sourceAct === undefined) {
        density++;
      }
      // Count scene → scene connections crossing into this act
      if (targetAct === actNum && sourceAct !== undefined && sourceAct !== actNum) {
        density++;
      }
    });
    densities.set(actNum, density);
  });

  return densities;
}

// ============================================================================
// Connection Helpers
// ============================================================================

/**
 * Builds a lookup map from node ID to connections.
 */
function buildConnectionLookup(
  connections: TapestryConnection[],
  side: 'source' | 'target'
): Map<string, TapestryConnection[]> {
  const lookup = new Map<string, TapestryConnection[]>();

  connections.forEach(conn => {
    const key = side === 'source' ? conn.sourceId : conn.targetId;
    const existing = lookup.get(key) || [];
    existing.push(conn);
    lookup.set(key, existing);
  });

  return lookup;
}

// ============================================================================
// Layout Update Utilities
// ============================================================================

/**
 * Recomputes layout with a single node position change.
 * More efficient than full recompute for drag operations.
 */
export function updateNodePosition(
  layout: LayoutResult,
  nodeId: string,
  newX: number,
  newY: number
): LayoutResult {
  // Check if it's a scene node
  const scene = layout.scenes.get(nodeId);
  if (scene) {
    const updatedScenes = new Map(layout.scenes);
    updatedScenes.set(nodeId, { ...scene, x: newX, y: newY });
    return { ...layout, scenes: updatedScenes };
  }

  // Check if it's a sidebar entity
  const charIndex = layout.sidebar.characters.findIndex(c => c.nodeId === nodeId);
  if (charIndex >= 0) {
    const updatedChars = [...layout.sidebar.characters];
    updatedChars[charIndex] = { ...updatedChars[charIndex], y: newY };
    return {
      ...layout,
      sidebar: { ...layout.sidebar, characters: updatedChars },
    };
  }

  const locIndex = layout.sidebar.locations.findIndex(l => l.nodeId === nodeId);
  if (locIndex >= 0) {
    const updatedLocs = [...layout.sidebar.locations];
    updatedLocs[locIndex] = { ...updatedLocs[locIndex], y: newY };
    return {
      ...layout,
      sidebar: { ...layout.sidebar, locations: updatedLocs },
    };
  }

  return layout;
}

/**
 * Gets the center point of a node for edge connection.
 */
export function getNodeCenter(
  layout: LayoutResult,
  nodeId: string
): { x: number; y: number } | null {
  // Check scenes
  const scene = layout.scenes.get(nodeId);
  if (scene) {
    return {
      x: scene.x + scene.width / 2,
      y: scene.y + scene.height / 2,
    };
  }

  // Check sidebar entities
  const char = layout.sidebar.characters.find(c => c.nodeId === nodeId);
  if (char) {
    return {
      x: layout.config.paddingLeft + layout.config.sidebarWidth,
      y: char.y + char.height / 2,
    };
  }

  const loc = layout.sidebar.locations.find(l => l.nodeId === nodeId);
  if (loc) {
    return {
      x: layout.config.paddingLeft + layout.config.sidebarWidth,
      y: loc.y + loc.height / 2,
    };
  }

  return null;
}

/**
 * Gets the edge connection points for a node.
 * Sidebar entities connect from their right edge.
 * Scenes connect from their left edge.
 */
export function getNodeEdgePoints(
  layout: LayoutResult,
  nodeId: string
): { entry: { x: number; y: number }; exit: { x: number; y: number } } | null {
  // Check scenes (entry on left, exit on right)
  const scene = layout.scenes.get(nodeId);
  if (scene) {
    return {
      entry: { x: scene.x, y: scene.y + scene.height / 2 },
      exit: { x: scene.x + scene.width, y: scene.y + scene.height / 2 },
    };
  }

  // Check sidebar entities (exit on right only)
  const char = layout.sidebar.characters.find(c => c.nodeId === nodeId);
  if (char) {
    const rightEdge = layout.config.paddingLeft + layout.config.sidebarWidth;
    return {
      entry: { x: layout.config.paddingLeft, y: char.y + char.height / 2 },
      exit: { x: rightEdge, y: char.y + char.height / 2 },
    };
  }

  const loc = layout.sidebar.locations.find(l => l.nodeId === nodeId);
  if (loc) {
    const rightEdge = layout.config.paddingLeft + layout.config.sidebarWidth;
    return {
      entry: { x: layout.config.paddingLeft, y: loc.y + loc.height / 2 },
      exit: { x: rightEdge, y: loc.y + loc.height / 2 },
    };
  }

  return null;
}
