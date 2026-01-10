/**
 * Standard Connection Rendering Factory
 *
 * Renders connections in non-bundled mode with proper endpoint calculation
 * for collapsed groups and filter handling.
 */

import type { Selection } from 'd3-selection';
import type { ZoomTransform } from 'd3-zoom';
import type {
  TapestryNode,
  TapestryGroup,
  TapestryState,
  TapestryConnection,
  ConnectionType,
} from '@/types/tapestry';
import { getNodeDimensions, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '@/types/tapestry';
import { renderConnection } from '../renderers';

interface TapestryLookups {
  nodeById: Map<string, TapestryNode>;
  groupById: Map<string, TapestryGroup>;
}

interface RenderStandardConnectionsOptions {
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>;
  visibleConnections: TapestryConnection[];
  lookups: TapestryLookups;
  highlightedConnections: Set<string>;
  showAllLines: boolean;
  nodeMatchesFilters: (node: TapestryNode) => boolean;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (state: TapestryState) => void;
  onEditConnection: (conn: TapestryConnection, midX: number, midY: number) => void;
}

/**
 * Renders standard connections (non-bundled mode) with proper endpoint calculation.
 */
export function renderStandardConnections({
  connectionsGroup,
  visibleConnections,
  lookups,
  highlightedConnections,
  showAllLines,
  nodeMatchesFilters,
  setState,
  saveState,
  onEditConnection,
}: RenderStandardConnectionsOptions): void {
  visibleConnections.forEach(conn => {
    // O(1) lookups instead of O(N) finds
    const sourceNode = lookups.nodeById.get(conn.sourceId);
    const targetNode = lookups.nodeById.get(conn.targetId);
    if (!sourceNode || !targetNode) return;

    // Check if nodes are in collapsed groups - skip connections to hidden nodes
    // O(1) lookups instead of O(N) finds
    const sourceGroup = sourceNode.groupId ? lookups.groupById.get(sourceNode.groupId) : undefined;
    const targetGroup = targetNode.groupId ? lookups.groupById.get(targetNode.groupId) : undefined;
    const sourceInCollapsed = sourceGroup?.collapsed;
    const targetInCollapsed = targetGroup?.collapsed;

    // Skip if both ends are in collapsed groups, or redirect to group position
    if (sourceInCollapsed && targetInCollapsed) return;

    // Check if both endpoints match the filter
    const sourceMatches = nodeMatchesFilters(sourceNode);
    const targetMatches = nodeMatchesFilters(targetNode);
    const connectionVisible = sourceMatches && targetMatches;

    // Use proper dimensions for each node type
    const sourceDims = getNodeDimensions(sourceNode);
    const targetDims = getNodeDimensions(targetNode);

    // If a node is in collapsed group, redirect connection to the group
    const collapsedStackWidth = DEFAULT_NOTE_WIDTH + 30;
    const collapsedStackHeight = DEFAULT_NOTE_HEIGHT + 30;

    let sourceX: number, sourceY: number, targetX: number, targetY: number;

    if (sourceInCollapsed && sourceGroup) {
      // Redirect to collapsed group
      sourceX = sourceGroup.x + collapsedStackWidth;
      sourceY = sourceGroup.y + collapsedStackHeight / 2;
    } else {
      sourceX = sourceNode.x + sourceDims.width;
      sourceY = sourceNode.y + sourceDims.height / 2;
    }

    if (targetInCollapsed && targetGroup) {
      // Redirect to collapsed group
      targetX = targetGroup.x;
      targetY = targetGroup.y + collapsedStackHeight / 2;
    } else {
      targetX = targetNode.x;
      targetY = targetNode.y + targetDims.height / 2;
    }

    // Determine visibility: show if showAllLines is on, or if this connection is highlighted
    const isHighlightedConn = highlightedConnections.has(conn.id);

    // Render connection using extracted renderer
    renderConnection({
      connectionsGroup: connectionsGroup as any,
      conn,
      endpoints: { sourceX, sourceY, targetX, targetY },
      isHighlighted: isHighlightedConn,
      showAllLines,
      connectionVisible,
      onDelete: () => {
        setState(prev => {
          const newState = {
            ...prev,
            connections: prev.connections.filter(c => c.id !== conn.id),
          };
          saveState(newState);
          return newState;
        });
      },
      onEditLabel: (midX, midY) => {
        onEditConnection(conn, midX, midY);
      },
    });
  });
}
