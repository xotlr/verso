'use client';

/**
 * useAutoCluster - Force-directed layout using d3-force
 *
 * Applies force simulation to arrange nodes automatically.
 * Preserves pinned nodes and respects group membership.
 */

import { useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from 'd3-force';
import type { TapestryNode, TapestryConnection } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

interface SimNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export interface UseAutoClusterOptions {
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Number of simulation ticks (default: 300) */
  iterations?: number;
  /** Link distance (default: 180) */
  linkDistance?: number;
  /** Charge strength (default: -300) */
  chargeStrength?: number;
  /** Collision radius (default: 100) */
  collisionRadius?: number;
}

export interface UseAutoClusterReturn {
  /** Run auto-cluster on nodes */
  autoCluster: (
    nodes: TapestryNode[],
    connections: TapestryConnection[]
  ) => TapestryNode[];
}

// ============================================================================
// Hook
// ============================================================================

export function useAutoCluster({
  width,
  height,
  iterations = 300,
  linkDistance = 180,
  chargeStrength = -300,
  collisionRadius = 100,
}: UseAutoClusterOptions): UseAutoClusterReturn {
  const autoCluster = useCallback(
    (nodes: TapestryNode[], connections: TapestryConnection[]): TapestryNode[] => {
      if (nodes.length === 0) return nodes;

      // Create simulation nodes
      const simulationNodes: SimNode[] = nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        // Pin nodes that are marked as pinned
        fx: node.pinned ? node.x : undefined,
        fy: node.pinned ? node.y : undefined,
      }));

      // Create links from connections
      const links = connections.map(conn => ({
        source: conn.sourceId,
        target: conn.targetId,
      }));

      // Build node lookup for link resolution
      const nodeMap = new Map(simulationNodes.map(n => [n.id, n]));

      // Run force simulation
      const simulation = forceSimulation(simulationNodes)
        .force(
          'link',
          forceLink<SimNode, (typeof links)[number]>(links)
            .id(d => d.id)
            .distance(linkDistance)
            .strength(0.5)
        )
        .force('charge', forceManyBody().strength(chargeStrength))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collision', forceCollide().radius(collisionRadius))
        .stop();

      // Run simulation for fixed iterations
      for (let i = 0; i < iterations; i++) {
        simulation.tick();
      }

      // Map back to TapestryNodes with new positions
      return nodes.map(node => {
        const simNode = nodeMap.get(node.id);
        if (!simNode || node.pinned) {
          return node;
        }

        // Get node dimensions for centering
        const { width: nw, height: nh } = getNodeDimensions(node);

        return {
          ...node,
          x: Math.round((simNode.x ?? node.x) - nw / 2),
          y: Math.round((simNode.y ?? node.y) - nh / 2),
        };
      });
    },
    [width, height, iterations, linkDistance, chargeStrength, collisionRadius]
  );

  return { autoCluster };
}
