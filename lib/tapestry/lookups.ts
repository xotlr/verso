/**
 * Tapestry Lookup Maps - O(1) data access for performance optimization
 *
 * Instead of repeated O(N) array.find() operations during rendering and dragging,
 * these lookup maps provide instant access to nodes and connections.
 */

import type { TapestryNode, TapestryConnection, TapestryGroup } from '@/types/tapestry';

/**
 * Pre-computed lookup maps for efficient data access
 */
export interface TapestryLookups {
  /** O(1) node lookup by ID */
  nodeById: Map<string, TapestryNode>;

  /** O(1) lookup: all connections where this node is source or target */
  connectionsByNodeId: Map<string, TapestryConnection[]>;

  /** O(1) lookup: all nodes belonging to a group */
  nodesByGroupId: Map<string, TapestryNode[]>;

  /** O(1) connection lookup by "sourceId-targetId" key (either direction) */
  connectionByKey: Map<string, TapestryConnection>;

  /** O(1) group lookup by ID */
  groupById: Map<string, TapestryGroup>;

  /** Set of all node IDs in collapsed groups (for filtering) */
  collapsedNodeIds: Set<string>;
}

/**
 * Create all lookup maps from tapestry state.
 * Call this once when nodes/connections change, not on every render.
 *
 * Time complexity: O(N + C + G) where N=nodes, C=connections, G=groups
 * Space complexity: O(N + C + G)
 */
export function createTapestryLookups(
  nodes: TapestryNode[],
  connections: TapestryConnection[],
  groups: TapestryGroup[]
): TapestryLookups {
  const nodeById = new Map<string, TapestryNode>();
  const connectionsByNodeId = new Map<string, TapestryConnection[]>();
  const nodesByGroupId = new Map<string, TapestryNode[]>();
  const connectionByKey = new Map<string, TapestryConnection>();
  const groupById = new Map<string, TapestryGroup>();
  const collapsedNodeIds = new Set<string>();

  // Build group lookup and track collapsed groups
  const collapsedGroupIds = new Set<string>();
  for (const group of groups) {
    groupById.set(group.id, group);
    if (group.collapsed) {
      collapsedGroupIds.add(group.id);
    }
  }

  // Single pass through nodes
  for (const node of nodes) {
    nodeById.set(node.id, node);

    // Group membership
    if (node.groupId) {
      const groupNodes = nodesByGroupId.get(node.groupId);
      if (groupNodes) {
        groupNodes.push(node);
      } else {
        nodesByGroupId.set(node.groupId, [node]);
      }

      // Track if node is in a collapsed group
      if (collapsedGroupIds.has(node.groupId)) {
        collapsedNodeIds.add(node.id);
      }
    }

    // Initialize connection arrays
    connectionsByNodeId.set(node.id, []);
  }

  // Single pass through connections
  for (const conn of connections) {
    // Add to source node's connections
    const sourceConns = connectionsByNodeId.get(conn.sourceId);
    if (sourceConns) {
      sourceConns.push(conn);
    } else {
      connectionsByNodeId.set(conn.sourceId, [conn]);
    }

    // Add to target node's connections (if different)
    if (conn.targetId !== conn.sourceId) {
      const targetConns = connectionsByNodeId.get(conn.targetId);
      if (targetConns) {
        targetConns.push(conn);
      } else {
        connectionsByNodeId.set(conn.targetId, [conn]);
      }
    }

    // Bidirectional key lookup
    const key1 = `${conn.sourceId}-${conn.targetId}`;
    const key2 = `${conn.targetId}-${conn.sourceId}`;
    connectionByKey.set(key1, conn);
    connectionByKey.set(key2, conn);
  }

  return {
    nodeById,
    connectionsByNodeId,
    nodesByGroupId,
    connectionByKey,
    groupById,
    collapsedNodeIds,
  };
}

/**
 * Get node by ID with O(1) lookup
 */
export function getNode(lookups: TapestryLookups, id: string): TapestryNode | undefined {
  return lookups.nodeById.get(id);
}

/**
 * Get all connections for a node (as source or target) with O(1) lookup
 */
export function getNodeConnections(
  lookups: TapestryLookups,
  nodeId: string
): TapestryConnection[] {
  return lookups.connectionsByNodeId.get(nodeId) || [];
}

/**
 * Get all nodes in a group with O(1) lookup
 */
export function getGroupNodes(
  lookups: TapestryLookups,
  groupId: string
): TapestryNode[] {
  return lookups.nodesByGroupId.get(groupId) || [];
}

/**
 * Check if a connection exists between two nodes (in either direction) with O(1) lookup
 */
export function hasConnection(
  lookups: TapestryLookups,
  nodeId1: string,
  nodeId2: string
): boolean {
  return lookups.connectionByKey.has(`${nodeId1}-${nodeId2}`);
}

/**
 * Get connection between two nodes (in either direction) with O(1) lookup
 */
export function getConnection(
  lookups: TapestryLookups,
  nodeId1: string,
  nodeId2: string
): TapestryConnection | undefined {
  return lookups.connectionByKey.get(`${nodeId1}-${nodeId2}`);
}

/**
 * Check if a node is in a collapsed group
 */
export function isNodeCollapsed(lookups: TapestryLookups, nodeId: string): boolean {
  return lookups.collapsedNodeIds.has(nodeId);
}

/**
 * Get visible nodes (not in collapsed groups)
 */
export function getVisibleNodes(
  nodes: TapestryNode[],
  lookups: TapestryLookups
): TapestryNode[] {
  if (lookups.collapsedNodeIds.size === 0) {
    return nodes;
  }
  return nodes.filter(node => !lookups.collapsedNodeIds.has(node.id));
}
