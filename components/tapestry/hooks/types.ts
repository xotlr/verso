/**
 * Shared types for tapestry rendering hooks
 */

import * as d3 from 'd3';
import type { TapestryNode, TapestryConnection, TapestryGroup } from '@/types/tapestry';
import type { TapestryLookups } from '@/lib/tapestry/lookups';
import type { GroupBounds } from '@/lib/tapestry/bounds';
import type { LayoutResult, EdgeBundle, HighlightState } from '@/lib/tapestry';

/**
 * D3 Selection types for type safety
 */
export type SVGSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type GSelection = d3.Selection<SVGGElement, unknown, null, undefined>;
export type NodeSelection = d3.Selection<SVGGElement, TapestryNode, SVGGElement, unknown>;
export type ConnectionSelection = d3.Selection<SVGGElement, TapestryConnection, SVGGElement, unknown>;
export type GroupSelection = d3.Selection<SVGGElement, TapestryGroup, SVGGElement, unknown>;

/**
 * Layer groups for the tapestry visualization
 */
export interface TapestryLayers {
  container: GSelection | null;
  groupsGroup: GSelection | null;
  connectionsGroup: GSelection | null;
  nodesGroup: GSelection | null;
  groupControlsOverlay: GSelection | null;
}

/**
 * Render context passed to render functions
 */
export interface RenderContext {
  layers: TapestryLayers;
  lookups: TapestryLookups;
  groupBoundsMap: Map<string, GroupBounds>;
  selectedNodes: Set<string>;
  highlightedNodeIds: Set<string>;
  highlightedConnections: Set<string>;
  showAllLines: boolean;
  snapToGrid: boolean;
  getRadius: (base: number) => number;
}

/**
 * Node render options
 */
export interface NodeRenderOptions {
  node: TapestryNode;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  matchesFilter: boolean;
}

/**
 * Connection render options
 */
export interface ConnectionRenderOptions {
  connection: TapestryConnection;
  sourceNode: TapestryNode;
  targetNode: TapestryNode;
  isHighlighted: boolean;
  showLine: boolean;
}

/**
 * Group render options
 */
export interface GroupRenderOptions {
  group: TapestryGroup;
  bounds: GroupBounds | undefined;
  childNodes: TapestryNode[];
  isCollapsed: boolean;
  isAnimating: boolean;
  progress: number;
}
