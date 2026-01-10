import { describe, it, expect } from 'vitest';
import {
  createTapestryLookups,
  getNode,
  getNodeConnections,
  getGroupNodes,
  hasConnection,
  getConnection,
  isNodeCollapsed,
  getVisibleNodes,
} from '@/lib/tapestry/lookups';
import type { TapestryNode, TapestryConnection, TapestryGroup } from '@/types/tapestry';

// Test fixtures
const createTestNode = (overrides: Partial<TapestryNode> = {}): TapestryNode => ({
  id: 'node-1',
  type: 'note',
  title: 'Test Node',
  content: '',
  color: '#888888',
  x: 100,
  y: 100,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createTestConnection = (
  sourceId: string,
  targetId: string,
  overrides: Partial<TapestryConnection> = {}
): TapestryConnection => ({
  id: `conn-${sourceId}-${targetId}`,
  sourceId,
  targetId,
  type: 'references',
  directed: true,
  ...overrides,
});

const createTestGroup = (overrides: Partial<TapestryGroup> = {}): TapestryGroup => ({
  id: 'group-1',
  title: 'Test Group',
  x: 50,
  y: 50,
  width: 200,
  height: 200,
  color: '#FF0000',
  ...overrides,
});

describe('Tapestry Lookups', () => {
  describe('createTapestryLookups', () => {
    it('should create empty lookups for empty inputs', () => {
      const lookups = createTapestryLookups([], [], []);

      expect(lookups.nodeById.size).toBe(0);
      expect(lookups.connectionsByNodeId.size).toBe(0);
      expect(lookups.nodesByGroupId.size).toBe(0);
      expect(lookups.connectionByKey.size).toBe(0);
      expect(lookups.groupById.size).toBe(0);
      expect(lookups.collapsedNodeIds.size).toBe(0);
    });

    it('should index nodes by ID', () => {
      const nodes = [
        createTestNode({ id: 'a', title: 'Node A' }),
        createTestNode({ id: 'b', title: 'Node B' }),
      ];

      const lookups = createTapestryLookups(nodes, [], []);

      expect(lookups.nodeById.get('a')?.title).toBe('Node A');
      expect(lookups.nodeById.get('b')?.title).toBe('Node B');
      expect(lookups.nodeById.get('c')).toBeUndefined();
    });

    it('should index connections by node ID', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
        createTestNode({ id: 'c' }),
      ];
      const connections = [
        createTestConnection('a', 'b'),
        createTestConnection('a', 'c'),
      ];

      const lookups = createTapestryLookups(nodes, connections, []);

      // Node 'a' should have 2 connections
      expect(lookups.connectionsByNodeId.get('a')?.length).toBe(2);
      // Node 'b' should have 1 connection
      expect(lookups.connectionsByNodeId.get('b')?.length).toBe(1);
      // Node 'c' should have 1 connection
      expect(lookups.connectionsByNodeId.get('c')?.length).toBe(1);
    });

    it('should create bidirectional connection key lookups', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
      ];
      const connections = [createTestConnection('a', 'b')];

      const lookups = createTapestryLookups(nodes, connections, []);

      // Both directions should resolve to the same connection
      expect(lookups.connectionByKey.get('a-b')).toBe(connections[0]);
      expect(lookups.connectionByKey.get('b-a')).toBe(connections[0]);
    });

    it('should group nodes by groupId', () => {
      const nodes = [
        createTestNode({ id: 'a', groupId: 'group-1' }),
        createTestNode({ id: 'b', groupId: 'group-1' }),
        createTestNode({ id: 'c', groupId: 'group-2' }),
        createTestNode({ id: 'd' }), // No group
      ];
      const groups = [
        createTestGroup({ id: 'group-1' }),
        createTestGroup({ id: 'group-2' }),
      ];

      const lookups = createTapestryLookups(nodes, [], groups);

      expect(lookups.nodesByGroupId.get('group-1')?.length).toBe(2);
      expect(lookups.nodesByGroupId.get('group-2')?.length).toBe(1);
      expect(lookups.nodesByGroupId.get('group-3')).toBeUndefined();
    });

    it('should track collapsed group node IDs', () => {
      const nodes = [
        createTestNode({ id: 'a', groupId: 'group-1' }),
        createTestNode({ id: 'b', groupId: 'group-1' }),
        createTestNode({ id: 'c', groupId: 'group-2' }),
      ];
      const groups = [
        createTestGroup({ id: 'group-1', collapsed: true }),
        createTestGroup({ id: 'group-2', collapsed: false }),
      ];

      const lookups = createTapestryLookups(nodes, [], groups);

      expect(lookups.collapsedNodeIds.has('a')).toBe(true);
      expect(lookups.collapsedNodeIds.has('b')).toBe(true);
      expect(lookups.collapsedNodeIds.has('c')).toBe(false);
    });
  });

  describe('getNode', () => {
    it('should return node by ID', () => {
      const nodes = [createTestNode({ id: 'test', title: 'Test' })];
      const lookups = createTapestryLookups(nodes, [], []);

      expect(getNode(lookups, 'test')?.title).toBe('Test');
    });

    it('should return undefined for non-existent node', () => {
      const lookups = createTapestryLookups([], [], []);

      expect(getNode(lookups, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getNodeConnections', () => {
    it('should return all connections for a node', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
        createTestNode({ id: 'c' }),
      ];
      const connections = [
        createTestConnection('a', 'b'),
        createTestConnection('a', 'c'),
      ];
      const lookups = createTapestryLookups(nodes, connections, []);

      expect(getNodeConnections(lookups, 'a').length).toBe(2);
    });

    it('should return empty array for node with no connections', () => {
      const nodes = [createTestNode({ id: 'lonely' })];
      const lookups = createTapestryLookups(nodes, [], []);

      expect(getNodeConnections(lookups, 'lonely')).toEqual([]);
    });
  });

  describe('getGroupNodes', () => {
    it('should return all nodes in a group', () => {
      const nodes = [
        createTestNode({ id: 'a', groupId: 'g1' }),
        createTestNode({ id: 'b', groupId: 'g1' }),
      ];
      const groups = [createTestGroup({ id: 'g1' })];
      const lookups = createTapestryLookups(nodes, [], groups);

      const groupNodes = getGroupNodes(lookups, 'g1');
      expect(groupNodes.length).toBe(2);
      expect(groupNodes.map(n => n.id)).toContain('a');
      expect(groupNodes.map(n => n.id)).toContain('b');
    });

    it('should return empty array for empty group', () => {
      const groups = [createTestGroup({ id: 'empty' })];
      const lookups = createTapestryLookups([], [], groups);

      expect(getGroupNodes(lookups, 'empty')).toEqual([]);
    });
  });

  describe('hasConnection', () => {
    it('should return true for existing connection', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
      ];
      const connections = [createTestConnection('a', 'b')];
      const lookups = createTapestryLookups(nodes, connections, []);

      expect(hasConnection(lookups, 'a', 'b')).toBe(true);
      expect(hasConnection(lookups, 'b', 'a')).toBe(true); // Bidirectional
    });

    it('should return false for non-existent connection', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
      ];
      const lookups = createTapestryLookups(nodes, [], []);

      expect(hasConnection(lookups, 'a', 'b')).toBe(false);
    });
  });

  describe('getConnection', () => {
    it('should return connection between nodes', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
      ];
      const conn = createTestConnection('a', 'b');
      const lookups = createTapestryLookups(nodes, [conn], []);

      expect(getConnection(lookups, 'a', 'b')).toBe(conn);
      expect(getConnection(lookups, 'b', 'a')).toBe(conn);
    });
  });

  describe('isNodeCollapsed', () => {
    it('should return true for nodes in collapsed groups', () => {
      const nodes = [createTestNode({ id: 'a', groupId: 'g1' })];
      const groups = [createTestGroup({ id: 'g1', collapsed: true })];
      const lookups = createTapestryLookups(nodes, [], groups);

      expect(isNodeCollapsed(lookups, 'a')).toBe(true);
    });

    it('should return false for nodes in expanded groups', () => {
      const nodes = [createTestNode({ id: 'a', groupId: 'g1' })];
      const groups = [createTestGroup({ id: 'g1', collapsed: false })];
      const lookups = createTapestryLookups(nodes, [], groups);

      expect(isNodeCollapsed(lookups, 'a')).toBe(false);
    });
  });

  describe('getVisibleNodes', () => {
    it('should filter out nodes in collapsed groups', () => {
      const nodes = [
        createTestNode({ id: 'visible', groupId: 'expanded' }),
        createTestNode({ id: 'hidden', groupId: 'collapsed' }),
        createTestNode({ id: 'also-visible' }), // No group
      ];
      const groups = [
        createTestGroup({ id: 'expanded', collapsed: false }),
        createTestGroup({ id: 'collapsed', collapsed: true }),
      ];
      const lookups = createTapestryLookups(nodes, [], groups);

      const visible = getVisibleNodes(nodes, lookups);
      expect(visible.length).toBe(2);
      expect(visible.map(n => n.id)).toContain('visible');
      expect(visible.map(n => n.id)).toContain('also-visible');
      expect(visible.map(n => n.id)).not.toContain('hidden');
    });

    it('should return all nodes when no groups are collapsed', () => {
      const nodes = [
        createTestNode({ id: 'a' }),
        createTestNode({ id: 'b' }),
      ];
      const lookups = createTapestryLookups(nodes, [], []);

      expect(getVisibleNodes(nodes, lookups)).toEqual(nodes);
    });
  });
});
