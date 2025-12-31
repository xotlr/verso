/**
 * Tapestry Layout System Types
 *
 * Defines the data structures for the sidebar-based layout with hierarchical
 * edge bundling. The layout places characters/locations in a fixed sidebar
 * on the left, with scenes organized in act lanes to the right.
 */

import type { TapestryNode, TapestryConnection } from '@/types/tapestry';

// ============================================================================
// Layout Configuration
// ============================================================================

export interface LayoutConfig {
  /** Width of the entity sidebar in pixels */
  sidebarWidth: number;
  /** Minimum width per act lane */
  actLaneWidth: number;
  /** Base gap between act lanes (increases with density) */
  actGap: number;
  /** Width of routing gutter between sidebar and scenes */
  gutterWidth: number;
  /** Height of each sidebar entity node */
  entityNodeHeight: number;
  /** Vertical spacing between sidebar entities */
  entitySpacing: number;
  /** Width of scene cards */
  sceneNodeWidth: number;
  /** Height of scene cards */
  sceneNodeHeight: number;
  /** Vertical spacing between scenes */
  sceneVerticalSpacing: number;
  /** Horizontal spacing between scenes in same lane */
  sceneHorizontalSpacing: number;
  /** Maximum scenes per column in an act lane */
  maxScenesPerColumn: number;
  /** Top padding for the layout */
  paddingTop: number;
  /** Left padding for sidebar */
  paddingLeft: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  sidebarWidth: 220,
  actLaneWidth: 280,
  actGap: 80,
  gutterWidth: 140,
  entityNodeHeight: 48,
  entitySpacing: 8,
  sceneNodeWidth: 200,
  sceneNodeHeight: 120,
  sceneVerticalSpacing: 24,
  sceneHorizontalSpacing: 24,
  maxScenesPerColumn: 8,
  paddingTop: 40,
  paddingLeft: 24,
};

// ============================================================================
// Sidebar Entities
// ============================================================================

export interface SidebarEntity {
  /** Unique identifier */
  id: string;
  /** Reference to the TapestryNode */
  nodeId: string;
  /** Entity type */
  type: 'character' | 'location';
  /** Display name */
  name: string;
  /** Entity color for edges */
  color: string;
  /** Dialogue count (characters only) */
  dialogueCount: number;
  /** Number of scenes this entity connects to */
  connectionCount: number;
  /** Computed Y position in sidebar */
  y: number;
  /** Computed height */
  height: number;
  /** Barycenter for crossing minimization (avg Y of connected scenes) */
  barycenter: number;
}

// ============================================================================
// Act Lanes
// ============================================================================

export interface ActLane {
  /** Act number (1, 2, 3, etc.) */
  actNumber: number;
  /** X position of the lane's left edge */
  x: number;
  /** Computed width based on scene count and density */
  width: number;
  /** Scene node IDs in this lane */
  sceneNodeIds: string[];
  /** Number of edges crossing into/out of this lane */
  connectionDensity: number;
  /** Number of columns needed for scenes */
  columnCount: number;
}

// ============================================================================
// Scene Positions
// ============================================================================

export interface ScenePosition {
  /** TapestryNode ID */
  nodeId: string;
  /** Original scene ID from screenplay */
  sceneId: string;
  /** Scene number */
  sceneNumber: number;
  /** Act this scene belongs to */
  actNumber: number;
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Column index within the act lane */
  column: number;
  /** Row index within the column */
  row: number;
}

// ============================================================================
// Layout Result
// ============================================================================

export interface LayoutResult {
  /** Configuration used */
  config: LayoutConfig;
  /** Sidebar entities organized by type */
  sidebar: {
    characters: SidebarEntity[];
    locations: SidebarEntity[];
    /** Total height of sidebar content */
    contentHeight: number;
  };
  /** Act lanes with positions */
  actLanes: ActLane[];
  /** Scene positions indexed by node ID */
  scenes: Map<string, ScenePosition>;
  /** Gutter bounds for edge routing */
  gutter: {
    x: number;
    width: number;
  };
  /** Total bounds of the layout */
  bounds: {
    width: number;
    height: number;
  };
}

// ============================================================================
// Edge Routing Types
// ============================================================================

export type SegmentType = 'horizontal' | 'vertical';

export interface RouteSegment {
  type: SegmentType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RoutedEdge {
  /** Connection ID */
  id: string;
  /** Source node ID (character/location in sidebar) */
  sourceId: string;
  /** Target node ID (scene) */
  targetId: string;
  /** Route segments for orthogonal routing */
  segments: RouteSegment[];
  /** Line thickness (1-4px based on dialogue) */
  thickness: number;
  /** Line color (character's color) */
  color: string;
  /** Bundle this edge belongs to */
  bundleId: string;
  /** Dialogue count for this specific connection */
  dialogueCount: number;
}

// ============================================================================
// Edge Bundling Types
// ============================================================================

export interface EdgeBundle {
  /** Unique bundle identifier */
  id: string;
  /** Character/location node ID this bundle originates from */
  sourceEntityId: string;
  /** Entity type */
  sourceType: 'character' | 'location';
  /** X position of the vertical spine in the gutter */
  spineX: number;
  /** Y position where the bundle exits the entity node */
  sourceY: number;
  /** Color for this bundle (entity's color) */
  color: string;
  /** All edges in this bundle */
  edges: BundledEdge[];
  /** Min Y of all target scenes */
  minTargetY: number;
  /** Max Y of all target scenes */
  maxTargetY: number;
}

export interface BundledEdge {
  /** Connection ID */
  connectionId: string;
  /** Target scene node ID */
  targetNodeId: string;
  /** Target scene ID */
  targetSceneId: string;
  /** Y position where this edge branches from spine */
  branchY: number;
  /** Target scene center Y */
  targetY: number;
  /** Target scene left X */
  targetX: number;
  /** Line thickness for this edge */
  thickness: number;
  /** Dialogue count in this specific scene */
  dialogueCount: number;
}

// ============================================================================
// Highlight State
// ============================================================================

export interface HighlightState {
  /** Currently hovered character node ID */
  hoveredCharacterId: string | null;
  /** Currently hovered scene node ID */
  hoveredSceneId: string | null;
  /** Locked (clicked) character node ID */
  lockedCharacterId: string | null;
  /** Locked (clicked) scene node ID */
  lockedSceneId: string | null;
}

export const INITIAL_HIGHLIGHT_STATE: HighlightState = {
  hoveredCharacterId: null,
  hoveredSceneId: null,
  lockedCharacterId: null,
  lockedSceneId: null,
};

// ============================================================================
// Visual Constants
// ============================================================================

export const EDGE_OPACITY = {
  /** Default opacity for all edges */
  default: 0.3,
  /** Opacity for highlighted edges */
  highlighted: 1.0,
  /** Opacity for dimmed edges (when others are highlighted) */
  dimmed: 0.1,
} as const;

export const EDGE_THICKNESS = {
  /** Minimum edge thickness */
  min: 1,
  /** Maximum edge thickness */
  max: 4,
} as const;

export const BUNDLE_TENSION = 0.85;

// ============================================================================
// Utility Types
// ============================================================================

export type NodeLookup = Map<string, TapestryNode>;
export type ConnectionLookup = Map<string, TapestryConnection[]>;

export interface LayoutInput {
  nodes: TapestryNode[];
  connections: TapestryConnection[];
  config?: Partial<LayoutConfig>;
}
