import { describe, it, expect } from 'vitest';
import {
  computeGroupBounds,
  computeNodesBounds,
  isPointInBounds,
  doBoundsOverlap,
  getGroupBounds,
  type GroupBounds,
} from '@/lib/tapestry/bounds';
import type { TapestryNode, TapestryGroup } from '@/types/tapestry';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '@/types/tapestry';

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

describe('Tapestry Bounds', () => {
  describe('computeGroupBounds', () => {
    it('should return empty map for no groups', () => {
      const bounds = computeGroupBounds([], []);
      expect(bounds.size).toBe(0);
    });

    it('should use group dimensions for empty groups', () => {
      const groups = [
        createTestGroup({ id: 'g1', x: 10, y: 20, width: 100, height: 150 }),
      ];
      const bounds = computeGroupBounds([], groups);

      const groupBounds = bounds.get('g1');
      expect(groupBounds?.x).toBe(10);
      expect(groupBounds?.y).toBe(20);
      expect(groupBounds?.width).toBe(100);
      expect(groupBounds?.height).toBe(150);
      expect(groupBounds?.nodeCount).toBe(0);
    });

    it('should compute bounds from child nodes with padding', () => {
      const nodes = [
        createTestNode({ id: 'a', groupId: 'g1', x: 100, y: 100 }),
        createTestNode({ id: 'b', groupId: 'g1', x: 300, y: 200 }),
      ];
      const groups = [createTestGroup({ id: 'g1' })];
      const bounds = computeGroupBounds(nodes, groups);

      const groupBounds = bounds.get('g1')!;

      // Should include 20px padding
      expect(groupBounds.x).toBe(80); // 100 - 20
      expect(groupBounds.y).toBe(80); // 100 - 20
      expect(groupBounds.nodeCount).toBe(2);

      // Width should span from first node to last node + node width + padding*2
      const expectedWidth = (300 + DEFAULT_NOTE_WIDTH) - 100 + 40; // maxX - minX + padding*2
      expect(groupBounds.width).toBe(expectedWidth);
    });

    it('should handle multiple groups independently', () => {
      const nodes = [
        createTestNode({ id: 'a', groupId: 'g1', x: 0, y: 0 }),
        createTestNode({ id: 'b', groupId: 'g2', x: 500, y: 500 }),
      ];
      const groups = [
        createTestGroup({ id: 'g1' }),
        createTestGroup({ id: 'g2' }),
      ];
      const bounds = computeGroupBounds(nodes, groups);

      expect(bounds.get('g1')?.nodeCount).toBe(1);
      expect(bounds.get('g2')?.nodeCount).toBe(1);
      expect(bounds.get('g1')?.x).not.toBe(bounds.get('g2')?.x);
    });

    it('should handle nodes without groups', () => {
      const nodes = [
        createTestNode({ id: 'a', groupId: 'g1', x: 0, y: 0 }),
        createTestNode({ id: 'ungrouped', x: 1000, y: 1000 }), // No groupId
      ];
      const groups = [createTestGroup({ id: 'g1' })];
      const bounds = computeGroupBounds(nodes, groups);

      // Ungrouped node should not affect group bounds
      expect(bounds.get('g1')?.nodeCount).toBe(1);
    });
  });

  describe('computeNodesBounds', () => {
    it('should return empty bounds for empty array', () => {
      const bounds = computeNodesBounds([]);
      expect(bounds).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        nodeCount: 0,
      });
    });

    it('should compute bounds for single node', () => {
      const nodes = [createTestNode({ x: 50, y: 75 })];
      const bounds = computeNodesBounds(nodes);

      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(75);
      expect(bounds.width).toBe(DEFAULT_NOTE_WIDTH);
      expect(bounds.height).toBe(DEFAULT_NOTE_HEIGHT);
      expect(bounds.nodeCount).toBe(1);
    });

    it('should compute bounds spanning multiple nodes', () => {
      const nodes = [
        createTestNode({ id: 'a', x: 0, y: 0 }),
        createTestNode({ id: 'b', x: 100, y: 100 }),
      ];
      const bounds = computeNodesBounds(nodes);

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(100 + DEFAULT_NOTE_WIDTH);
      expect(bounds.height).toBe(100 + DEFAULT_NOTE_HEIGHT);
      expect(bounds.nodeCount).toBe(2);
    });
  });

  describe('getGroupBounds', () => {
    it('should return bounds from map', () => {
      const boundsMap = new Map<string, GroupBounds>();
      boundsMap.set('g1', { x: 10, y: 20, width: 100, height: 200, nodeCount: 3 });

      expect(getGroupBounds(boundsMap, 'g1')).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 200,
        nodeCount: 3,
      });
    });

    it('should return empty bounds for missing group', () => {
      const boundsMap = new Map<string, GroupBounds>();

      expect(getGroupBounds(boundsMap, 'nonexistent')).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        nodeCount: 0,
      });
    });
  });

  describe('isPointInBounds', () => {
    const bounds: GroupBounds = {
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      nodeCount: 0,
    };

    it('should return true for point inside bounds', () => {
      expect(isPointInBounds(150, 150, bounds)).toBe(true);
    });

    it('should return true for point on edge', () => {
      expect(isPointInBounds(100, 100, bounds)).toBe(true); // Top-left corner
      expect(isPointInBounds(300, 250, bounds)).toBe(true); // Bottom-right corner
    });

    it('should return false for point outside bounds', () => {
      expect(isPointInBounds(50, 50, bounds)).toBe(false); // Before bounds
      expect(isPointInBounds(350, 300, bounds)).toBe(false); // After bounds
    });
  });

  describe('doBoundsOverlap', () => {
    const boundsA: GroupBounds = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      nodeCount: 0,
    };

    it('should return true for overlapping bounds', () => {
      const boundsB: GroupBounds = {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        nodeCount: 0,
      };
      expect(doBoundsOverlap(boundsA, boundsB)).toBe(true);
    });

    it('should return true for touching bounds', () => {
      const boundsB: GroupBounds = {
        x: 100,
        y: 0,
        width: 100,
        height: 100,
        nodeCount: 0,
      };
      expect(doBoundsOverlap(boundsA, boundsB)).toBe(true);
    });

    it('should return false for non-overlapping bounds', () => {
      const boundsB: GroupBounds = {
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        nodeCount: 0,
      };
      expect(doBoundsOverlap(boundsA, boundsB)).toBe(false);
    });

    it('should return true for contained bounds', () => {
      const boundsB: GroupBounds = {
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        nodeCount: 0,
      };
      expect(doBoundsOverlap(boundsA, boundsB)).toBe(true);
    });
  });
});
