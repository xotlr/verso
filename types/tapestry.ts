/**
 * Tapestry v2 - Story mapping and relationship visualization
 * Supports multiple node types, visual groups, and typed connections
 */

// ============================================================================
// Node Types
// ============================================================================

export type TapestryNodeType = 'scene' | 'character' | 'item' | 'location' | 'note';

/**
 * A node on the tapestry board (scene, character, item, location, or note)
 */
export interface TapestryNode {
  id: string;
  type: TapestryNodeType;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  groupId?: string;
  tags?: string[];
  createdAt: string;

  // Common features
  pinned?: boolean;           // Pinned to canvas (won't move with layout)
  notes?: string;             // User notes/annotations
  portrait?: string;          // Image URL for character/location portraits

  // Scene-specific
  sceneId?: string;
  sceneNumber?: number;
  timeOfDay?: string;

  // Character-specific
  characterId?: string;
  dialogueCount?: number;
  sceneAppearances?: string[];
  arcSummary?: string;        // Character arc description
  relationships?: CharacterRelationship[];

  // Item-specific
  itemType?: 'prop' | 'vehicle' | 'weapon' | 'document' | 'other';

  // Location-specific
  locationType?: 'INT' | 'EXT' | 'INT/EXT';
}

/**
 * Character relationship for profile panel
 */
export interface CharacterRelationship {
  characterId: string;
  characterName: string;
  type: string;  // e.g., "ally", "enemy", "family", "romantic", "mentor"
  description?: string;
}

// Legacy alias for backward compatibility
export type TapestryNote = TapestryNode;

// ============================================================================
// Connection Types
// ============================================================================

export type ConnectionType =
  | 'relationship'  // Character relationships
  | 'appears_in'    // Character appears in scene
  | 'uses'          // Character uses item
  | 'located_at'    // Scene at location
  | 'owns'          // Character owns item
  | 'causes'        // Scene causes scene
  | 'references'    // General reference
  | 'custom';

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  relationship: 'Relationship',
  appears_in: 'Appears In',
  uses: 'Uses',
  located_at: 'Located At',
  owns: 'Owns',
  causes: 'Causes',
  references: 'References',
  custom: 'Connected',
};

// Thread colors by connection type (for investigation board style)
export const CONNECTION_COLORS: Record<ConnectionType, string> = {
  relationship: '#dc2626',    // Red - character relationships
  appears_in: '#2563eb',      // Blue - character in scene
  located_at: '#16a34a',      // Green - scene at location
  causes: '#9333ea',          // Purple - causation
  uses: '#ea580c',            // Orange - uses item
  owns: '#ca8a04',            // Yellow - ownership
  references: '#64748b',      // Gray - general reference
  custom: '#6366f1',          // Indigo - custom
};

// Status colors for scene cards (matches index-cards.tsx)
export const STATUS_COLORS: Record<string, string> = {
  draft: '#71717a',     // Zinc
  outline: '#3b82f6',   // Blue
  writing: '#f59e0b',   // Amber
  revision: '#f97316',  // Orange
  complete: '#10b981',  // Emerald
};

// Time of day icons for scene nodes
export const TIME_ICONS: Record<string, string> = {
  NIGHT: '☽',
  DAWN: '☀',
  MORNING: '☀',
  AFTERNOON: '☀',
  DUSK: '☀',
  EVENING: '☽',
  CONTINUOUS: '↻',
  DAY: '☀',
};

/**
 * A connection/thread between two nodes
 */
export interface TapestryConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  label?: string;
  color?: string;
  directed: boolean;
}

// Legacy alias
export type TapestryString = TapestryConnection;

// ============================================================================
// Groups
// ============================================================================

/**
 * A visual container group for organizing nodes
 */
export interface TapestryGroup {
  id: string;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean;
}

// ============================================================================
// State
// ============================================================================

/**
 * Complete tapestry state for a screenplay
 */
export interface TapestryState {
  nodes: TapestryNode[];
  connections: TapestryConnection[];
  groups: TapestryGroup[];
  zoom: number;
  panX: number;
  panY: number;
}

// Legacy fields for migration
interface LegacyTapestryState {
  notes?: TapestryNode[];
  strings?: TapestryConnection[];
  zoom: number;
  panX: number;
  panY: number;
}

// ============================================================================
// Constants
// ============================================================================

// Grid spacing for canvas
export const GRID_MAJOR_SPACING = 64;
export const GRID_MINOR_SPACING = 16;

// Node type colors (work in both light/dark themes)
export const NODE_TYPE_COLORS: Record<TapestryNodeType, string> = {
  scene: '#3b82f6',      // Blue
  character: '#ec4899',  // Pink
  item: '#f59e0b',       // Amber
  location: '#10b981',   // Emerald
  note: '#8b5cf6',       // Violet
};

// Extended color palette for user customization
export const NOTE_COLORS = [
  '#3b82f6',  // Blue
  '#10b981',  // Emerald
  '#8b5cf6',  // Violet
  '#ec4899',  // Pink
  '#f59e0b',  // Amber
  '#06b6d4',  // Cyan
  '#6366f1',  // Indigo
  '#f97316',  // Orange
] as const;

export const DEFAULT_STRING_COLOR = '#6366f1'; // Indigo - works well in both themes
export const DEFAULT_NOTE_WIDTH = 260;
export const DEFAULT_NOTE_HEIGHT = 140;
export const DEFAULT_CHARACTER_WIDTH = 120;  // Polaroid card width
export const DEFAULT_CHARACTER_HEIGHT = 160; // Polaroid card height
export const DEFAULT_GROUP_WIDTH = 400;
export const DEFAULT_GROUP_HEIGHT = 300;
export const PIN_RADIUS = 6;
export const NODE_HEADER_HEIGHT = 28;

// ============================================================================
// Factory Functions
// ============================================================================

export function createEmptyTapestry(): TapestryState {
  return {
    nodes: [],
    connections: [],
    groups: [],
    zoom: 1,
    panX: 0,
    panY: 0,
  };
}

export function createNode(
  partial: Partial<TapestryNode> & { x: number; y: number; type?: TapestryNodeType }
): TapestryNode {
  const type = partial.type || 'note';
  // Character nodes use polaroid dimensions
  const isCharacter = type === 'character';
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    title: '',
    content: '',
    color: NODE_TYPE_COLORS[type],
    width: isCharacter ? DEFAULT_CHARACTER_WIDTH : DEFAULT_NOTE_WIDTH,
    height: isCharacter ? DEFAULT_CHARACTER_HEIGHT : DEFAULT_NOTE_HEIGHT,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

// Legacy alias
export const createNote = createNode;

export function createConnection(
  sourceId: string,
  targetId: string,
  type: ConnectionType = 'custom',
  partial?: Partial<TapestryConnection>
): TapestryConnection {
  return {
    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sourceId,
    targetId,
    type,
    directed: type !== 'relationship' && type !== 'custom',
    color: DEFAULT_STRING_COLOR,
    ...partial,
  };
}

// Legacy alias
export function createString(
  sourceId: string,
  targetId: string,
  partial?: Partial<TapestryConnection>
): TapestryConnection {
  return createConnection(sourceId, targetId, 'custom', partial);
}

export function createGroup(
  partial: Partial<TapestryGroup> & { x: number; y: number }
): TapestryGroup {
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: 'New Group',
    color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    width: DEFAULT_GROUP_WIDTH,
    height: DEFAULT_GROUP_HEIGHT,
    collapsed: false,
    ...partial,
  };
}

// ============================================================================
// Storage & Migration
// ============================================================================

export function getTapestryStorageKey(screenplayId: string): string {
  return `verso-tapestry-${screenplayId}`;
}

/**
 * Migrate legacy tapestry data to v2 format
 */
export function migrateTapestryState(data: LegacyTapestryState | TapestryState): TapestryState {
  // Already migrated
  if ('nodes' in data && 'connections' in data && 'groups' in data) {
    return data as TapestryState;
  }

  const legacy = data as LegacyTapestryState;

  // Migrate notes → nodes (add type: 'note' if missing)
  const nodes: TapestryNode[] = (legacy.notes || []).map(note => ({
    ...note,
    type: (note as TapestryNode).type || 'note',
  }));

  // Migrate strings → connections (add type: 'custom' and directed: false)
  const connections: TapestryConnection[] = (legacy.strings || []).map(str => ({
    ...str,
    type: (str as TapestryConnection).type || 'custom',
    directed: (str as TapestryConnection).directed ?? false,
  }));

  return {
    nodes,
    connections,
    groups: [],
    zoom: legacy.zoom ?? 1,
    panX: legacy.panX ?? 0,
    panY: legacy.panY ?? 0,
  };
}
