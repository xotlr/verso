import { Scene, Character, Location } from './screenplay';
import { Beat, ActId } from '@/components/beat-board';

// Node types for the story graph
export type StoryNodeType = 'scene' | 'character' | 'beat' | 'location';

// Base node interface for D3
export interface GraphNode {
  id: string;
  type: StoryNodeType;
  label: string;
  color?: string;
  x?: number;
  y?: number;
  fx?: number | null; // Fixed x position (for dragging)
  fy?: number | null; // Fixed y position (for dragging)
}

// Scene node
export interface SceneNode extends GraphNode {
  type: 'scene';
  sceneNumber: number;
  heading: string;
  location: string;
  timeOfDay: string;
  characterIds: string[];
  beatId?: string;
}

// Character node
export interface CharacterNode extends GraphNode {
  type: 'character';
  name: string;
  sceneIds: string[];
  dialogueCount: number;
}

// Beat node
export interface BeatNode extends GraphNode {
  type: 'beat';
  title: string;
  description: string;
  act: ActId;
  sceneIds: string[];
}

// Location node
export interface LocationNode extends GraphNode {
  type: 'location';
  name: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  sceneIds: string[];
}

// Union type for all nodes
export type StoryNode = SceneNode | CharacterNode | BeatNode | LocationNode;

// Edge/Link types
export type StoryEdgeType = 'story' | 'character' | 'beat' | 'location';

// D3 link interface
export interface GraphLink {
  id: string;
  source: string | StoryNode;
  target: string | StoryNode;
  type: StoryEdgeType;
  color?: string;
  strength?: number;
}

// Filter state for the graph
export interface GraphFilterState {
  showScenes: boolean;
  showCharacters: boolean;
  showBeats: boolean;
  showLocations: boolean;
}

// Layout options
export type GraphLayoutType = 'force' | 'hierarchical' | 'radial' | 'timeline';

// Graph state for persistence
export interface GraphState {
  nodePositions: Record<string, { x: number; y: number }>;
  zoom: number;
  pan: { x: number; y: number };
  filters: GraphFilterState;
  layout: GraphLayoutType;
}

// Transform input data
export interface GraphInputData {
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  beats: Beat[];
}

// Transform output data
export interface GraphOutputData {
  nodes: StoryNode[];
  links: GraphLink[];
}

// Type guards for runtime type checking
export function isSceneNode(node: StoryNode): node is SceneNode {
  return node.type === 'scene';
}

export function isCharacterNode(node: StoryNode): node is CharacterNode {
  return node.type === 'character';
}

export function isBeatNode(node: StoryNode): node is BeatNode {
  return node.type === 'beat';
}

export function isLocationNode(node: StoryNode): node is LocationNode {
  return node.type === 'location';
}

export function isGraphNode(obj: unknown): obj is GraphNode {
  if (typeof obj !== 'object' || obj === null) return false;
  const node = obj as Record<string, unknown>;
  return (
    typeof node.id === 'string' &&
    typeof node.type === 'string' &&
    ['scene', 'character', 'beat', 'location'].includes(node.type as string) &&
    typeof node.label === 'string'
  );
}

export function isStoryNode(obj: unknown): obj is StoryNode {
  return isGraphNode(obj);
}

export function isGraphLink(obj: unknown): obj is GraphLink {
  if (typeof obj !== 'object' || obj === null) return false;
  const link = obj as Record<string, unknown>;
  return (
    typeof link.id === 'string' &&
    (typeof link.source === 'string' || isStoryNode(link.source)) &&
    (typeof link.target === 'string' || isStoryNode(link.target)) &&
    typeof link.type === 'string' &&
    ['story', 'character', 'beat', 'location'].includes(link.type as string)
  );
}
