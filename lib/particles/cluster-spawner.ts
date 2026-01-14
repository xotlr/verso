/**
 * Cluster spawner for grouped petal generation.
 * Creates spawn points that drift over time for natural grouping behavior.
 */

import * as THREE from 'three';
import type { Cluster, PetalsConfig } from './types';

/**
 * Manages clusters of spawn points for petals.
 * Each cluster has a color bias and drifts slowly across the scene.
 */
export class ClusterSpawner {
  clusters: Cluster[] = [];
  private config: PetalsConfig;

  constructor(config: PetalsConfig) {
    this.config = config;
    this.initClusters();
  }

  /**
   * Initialize cluster positions and properties.
   */
  initClusters(): void {
    this.clusters = [];
    for (let i = 0; i < this.config.clusterCount; i++) {
      this.clusters.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * this.config.spread.x * 0.8,
          this.config.spread.y / 2 + Math.random() * 3,
          (Math.random() - 0.5) * this.config.spread.z * 0.8
        ),
        colorBias: Math.floor(Math.random() * this.config.colors.length),
        drift: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0,
          (Math.random() - 0.5) * 0.02
        ),
        phase: Math.random() * Math.PI * 2,
        activity: 0.5 + Math.random() * 0.5,
      });
    }
  }

  /**
   * Update cluster positions with gentle oscillation.
   */
  update(time: number): void {
    for (const cluster of this.clusters) {
      cluster.position.x += Math.sin(time * 0.1 + cluster.phase) * 0.005;
      cluster.position.z += Math.cos(time * 0.08 + cluster.phase) * 0.005;

      // Wrap around bounds
      if (cluster.position.x > this.config.spread.x / 2) {
        cluster.position.x = -this.config.spread.x / 2;
      }
      if (cluster.position.x < -this.config.spread.x / 2) {
        cluster.position.x = this.config.spread.x / 2;
      }
      if (cluster.position.z > this.config.spread.z / 2) {
        cluster.position.z = -this.config.spread.z / 2;
      }
      if (cluster.position.z < -this.config.spread.z / 2) {
        cluster.position.z = this.config.spread.z / 2;
      }
    }
  }

  /**
   * Get a randomized spawn position near a cluster.
   */
  getSpawnPosition(clusterId: number): THREE.Vector3 {
    const cluster = this.clusters[clusterId];
    return new THREE.Vector3(
      cluster.position.x + (Math.random() - 0.5) * this.config.clusterRadius,
      cluster.position.y + (Math.random() - 0.5) * 1.5,
      cluster.position.z + (Math.random() - 0.5) * this.config.clusterRadius
    );
  }

  /**
   * Get a color for a petal in a cluster.
   * 70% chance to use cluster's color bias, 30% random from palette.
   */
  getClusterColor(clusterId: number): THREE.Color {
    const cluster = this.clusters[clusterId];
    if (Math.random() < 0.7) {
      return this.config.colors[cluster.colorBias];
    }
    return this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
  }
}
