/**
 * Hook for initializing tapestry from scenes and characters.
 * Handles initial layout computation and act group creation.
 */

import { useCallback } from 'react';
import {
  TapestryNode,
  TapestryConnection,
  TapestryGroup,
  TapestryState,
  createNode,
  createConnection,
  createGroup,
  NODE_TYPE_COLORS,
  NOTE_COLORS,
} from '@/types/tapestry';
import { Scene } from '@/types/screenplay';
import type { IndexCard } from '@/types/index-cards';
import type { CharacterInfo } from '@/hooks/editor/types';
import { computeLayout } from '@/lib/tapestry/layout';

/**
 * Determine which act a scene belongs to based on scene number.
 */
function getActNumber(sceneNumber: number): number {
  if (sceneNumber <= 30) return 1;
  if (sceneNumber <= 90) return 2;
  return 3;
}

/**
 * Get unique act numbers from scenes sorted in order.
 */
function getActsFromScenes(scenes: Scene[]): number[] {
  const acts = new Set<number>();
  scenes.forEach(scene => {
    if (scene.number) {
      acts.add(getActNumber(scene.number));
    }
  });
  return Array.from(acts).sort((a, b) => a - b);
}

interface LayoutConfig {
  paddingLeft?: number;
  paddingTop?: number;
  sidebarWidth?: number;
  gutterWidth?: number;
  entityNodeHeight?: number;
  entitySpacing?: number;
  sceneNodeWidth?: number;
  sceneNodeHeight?: number;
  sceneHorizontalSpacing?: number;
  sceneVerticalSpacing?: number;
  actLaneWidth?: number;
  actGap?: number;
  maxScenesPerColumn?: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  paddingLeft: 20,
  paddingTop: 40,
  sidebarWidth: 180,
  gutterWidth: 100,
  entityNodeHeight: 60,
  entitySpacing: 16,
  sceneNodeWidth: 160,
  sceneNodeHeight: 100,
  sceneHorizontalSpacing: 20,
  sceneVerticalSpacing: 20,
  actLaneWidth: 200,
  actGap: 40,
  maxScenesPerColumn: 8,
};

interface CreateLayoutResult {
  nodes: TapestryNode[];
  connections: TapestryConnection[];
  groups: TapestryGroup[];
}

/**
 * Create act groups for scene nodes.
 */
function createActGroups(nodes: TapestryNode[], scenes: Scene[]): TapestryGroup[] {
  const groups: TapestryGroup[] = [];
  const acts = getActsFromScenes(scenes);

  if (acts.length <= 1) return groups;

  const actBounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
  const actGroupIds = new Map<number, string>();

  nodes.forEach(node => {
    if (node.type === 'scene' && node.sceneNumber) {
      const actNum = getActNumber(node.sceneNumber);
      const bounds = actBounds.get(actNum);
      const nodeWidth = 160;
      const nodeHeight = 100;

      if (!bounds) {
        actBounds.set(actNum, {
          minX: node.x,
          minY: node.y,
          maxX: node.x + nodeWidth,
          maxY: node.y + nodeHeight,
        });
      } else {
        bounds.minX = Math.min(bounds.minX, node.x);
        bounds.minY = Math.min(bounds.minY, node.y);
        bounds.maxX = Math.max(bounds.maxX, node.x + nodeWidth);
        bounds.maxY = Math.max(bounds.maxY, node.y + nodeHeight);
      }
    }
  });

  const padding = 20;
  actBounds.forEach((bounds, actNum) => {
    const group = createGroup({
      x: bounds.minX - padding,
      y: bounds.minY - 40,
      width: bounds.maxX - bounds.minX + padding * 2,
      height: bounds.maxY - bounds.minY + padding + 40,
      title: `Act ${actNum}`,
      color: NOTE_COLORS[(actNum - 1) % NOTE_COLORS.length],
      collapsed: true,
    });
    actGroupIds.set(actNum, group.id);
    groups.push(group);
  });

  nodes.forEach(node => {
    if (node.type === 'scene' && node.sceneNumber) {
      const actNum = getActNumber(node.sceneNumber);
      const groupId = actGroupIds.get(actNum);
      if (groupId) {
        node.groupId = groupId;
      }
    }
  });

  return groups;
}

/**
 * Create initial layout from scenes and characters.
 */
export function createInitialLayout(
  scenes: Scene[],
  characters: CharacterInfo[],
  indexCards: IndexCard[],
  config: LayoutConfig = {}
): CreateLayoutResult {
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const cardMap = new Map(indexCards.map(c => [c.sceneId, c]));

  const nodes: TapestryNode[] = [];
  const connections: TapestryConnection[] = [];

  // Create character nodes
  characters.forEach((char) => {
    nodes.push(createNode({
      type: 'character',
      x: 0,
      y: 0,
      title: char.name,
      content: `${char.dialogueCount} dialogue${char.dialogueCount !== 1 ? 's' : ''}`,
      characterId: char.id,
      dialogueCount: char.dialogueCount,
      sceneAppearances: scenes
        .filter(s => s.characters?.includes(char.name))
        .map(s => s.id),
    }));
  });

  // Create scene nodes
  scenes.forEach((scene) => {
    const card = cardMap.get(scene.id);
    nodes.push(createNode({
      type: 'scene',
      x: 0,
      y: 0,
      title: `Scene ${scene.number}`,
      content: card?.summary || scene.heading,
      sceneId: scene.id,
      sceneNumber: scene.number,
      timeOfDay: scene.timeOfDay,
      color: card?.color || NODE_TYPE_COLORS.scene,
    }));
  });

  // Create character-scene connections
  const charNodeMap = new Map(
    nodes.filter(n => n.type === 'character').map(n => [n.title, n])
  );
  const sceneNodeMap = new Map(
    nodes.filter(n => n.type === 'scene').map(n => [n.sceneId, n])
  );

  scenes.forEach(scene => {
    const sceneNode = sceneNodeMap.get(scene.id);
    if (!sceneNode) return;

    scene.characters?.forEach(charName => {
      const charNode = charNodeMap.get(charName);
      if (charNode) {
        connections.push(createConnection(
          charNode.id,
          sceneNode.id,
          'appears_in'
        ));
      }
    });
  });

  // Apply layout algorithm
  const layout = computeLayout({
    nodes,
    connections,
    config: layoutConfig,
  });

  const positionedNodes = nodes.map(node => {
    if (node.type === 'character') {
      const entity = layout.sidebar.characters.find(e => e.nodeId === node.id);
      if (entity) return { ...node, x: 20, y: entity.y };
    } else if (node.type === 'location') {
      const entity = layout.sidebar.locations.find(e => e.nodeId === node.id);
      if (entity) return { ...node, x: 20, y: entity.y };
    } else if (node.type === 'scene') {
      const scenePos = layout.scenes.get(node.id);
      if (scenePos) return { ...node, x: scenePos.x, y: scenePos.y };
    }
    return node;
  });

  const groups = createActGroups(positionedNodes, scenes);

  return { nodes: positionedNodes, connections, groups };
}

/**
 * Re-compute layout for existing nodes (auto-cluster).
 */
export function recomputeLayout(state: TapestryState): TapestryState {
  if (state.nodes.length === 0) return state;

  const layout = computeLayout({
    nodes: state.nodes,
    connections: state.connections,
  });

  const positionedNodes = state.nodes.map(node => {
    if (node.type === 'character') {
      const entity = layout.sidebar.characters.find(e => e.nodeId === node.id);
      if (entity) return { ...node, x: 20, y: entity.y, groupId: undefined };
    } else if (node.type === 'location') {
      const entity = layout.sidebar.locations.find(e => e.nodeId === node.id);
      if (entity) return { ...node, x: 20, y: entity.y, groupId: undefined };
    } else if (node.type === 'scene') {
      const scenePos = layout.scenes.get(node.id);
      if (scenePos) return { ...node, x: scenePos.x, y: scenePos.y, groupId: undefined };
    }
    return node;
  });

  // Re-create act groups
  const sceneNodes = positionedNodes.filter(n => n.type === 'scene' && n.sceneNumber);
  const acts = new Set<number>();
  sceneNodes.forEach(n => acts.add(getActNumber(n.sceneNumber!)));
  const sortedActs = Array.from(acts).sort((a, b) => a - b);

  const groups: TapestryGroup[] = [];

  if (sortedActs.length > 1) {
    const actBounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
    const actGroupIds = new Map<number, string>();

    sceneNodes.forEach(node => {
      const actNum = getActNumber(node.sceneNumber!);
      const bounds = actBounds.get(actNum);
      const nodeWidth = 160;
      const nodeHeight = 100;

      if (!bounds) {
        actBounds.set(actNum, {
          minX: node.x,
          minY: node.y,
          maxX: node.x + nodeWidth,
          maxY: node.y + nodeHeight,
        });
      } else {
        bounds.minX = Math.min(bounds.minX, node.x);
        bounds.minY = Math.min(bounds.minY, node.y);
        bounds.maxX = Math.max(bounds.maxX, node.x + nodeWidth);
        bounds.maxY = Math.max(bounds.maxY, node.y + nodeHeight);
      }
    });

    const padding = 20;
    actBounds.forEach((bounds, actNum) => {
      const group = createGroup({
        x: bounds.minX - padding,
        y: bounds.minY - 40,
        width: bounds.maxX - bounds.minX + padding * 2,
        height: bounds.maxY - bounds.minY + padding + 40,
        title: `Act ${actNum}`,
        color: NOTE_COLORS[(actNum - 1) % NOTE_COLORS.length],
        collapsed: true,
      });
      actGroupIds.set(actNum, group.id);
      groups.push(group);
    });

    positionedNodes.forEach(node => {
      if (node.type === 'scene' && node.sceneNumber) {
        const actNum = getActNumber(node.sceneNumber);
        node.groupId = actGroupIds.get(actNum);
      }
    });
  }

  return { ...state, nodes: positionedNodes, groups };
}

/**
 * Hook providing initialization utilities.
 */
export function useTapestryInit() {
  const computeInitialLayout = useCallback(
    (scenes: Scene[], characters: CharacterInfo[], indexCards: IndexCard[]) => {
      return createInitialLayout(scenes, characters, indexCards);
    },
    []
  );

  const autoCluster = useCallback((state: TapestryState) => {
    return recomputeLayout(state);
  }, []);

  return { computeInitialLayout, autoCluster };
}
