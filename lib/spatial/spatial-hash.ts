/**
 * Spatial hashing for efficient neighbor queries.
 * Used for collision detection and flocking behavior in particle systems.
 */

import * as THREE from 'three';

/**
 * Interface for objects that can be inserted into the spatial hash.
 */
export interface SpatialEntity {
  position: THREE.Vector3;
}

/**
 * Spatial hash grid for O(1) average-case neighbor lookups.
 * Divides 3D space into cells and maintains lists of entities per cell.
 */
export class SpatialHash<T extends SpatialEntity> {
  private cellSize: number;
  private cells: Map<string, T[]>;

  /**
   * Create a new spatial hash.
   * @param cellSize - Size of each cell (should be >= query radius for efficiency)
   */
  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  /**
   * Clear all entities from the hash.
   * Call this at the start of each frame before re-inserting.
   */
  clear(): void {
    this.cells.clear();
  }

  /**
   * Get the cell key for a position.
   */
  private getKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  /**
   * Insert an entity into the hash.
   */
  insert(entity: T): void {
    const key = this.getKey(entity.position.x, entity.position.y, entity.position.z);
    const cell = this.cells.get(key);
    if (cell) {
      cell.push(entity);
    } else {
      this.cells.set(key, [entity]);
    }
  }

  /**
   * Get all entities within radius of a position.
   * Returns entities from all cells that could contain neighbors.
   *
   * Note: This returns candidates; callers should still check exact distance
   * if precise radius filtering is needed.
   */
  getNearby(position: THREE.Vector3, radius: number): T[] {
    const nearby: T[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.cells.get(key);
          if (cell) {
            nearby.push(...cell);
          }
        }
      }
    }

    return nearby;
  }
}
