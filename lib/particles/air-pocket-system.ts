/**
 * Air pocket system for simulating updrafts and turbulence.
 * Creates transient pockets of rising air that affect nearby particles.
 */

import * as THREE from 'three';
import type { AirPocket } from './types';

/**
 * Manages dynamic air pockets that create localized lift forces.
 * Pockets spawn randomly, rise, and dissipate over time.
 */
export class AirPocketSystem {
  pockets: AirPocket[] = [];
  private maxPockets: number;

  constructor(maxPockets = 8) {
    this.maxPockets = maxPockets;
  }

  /**
   * Update pocket positions and lifetimes.
   * Spawns new pockets probabilistically.
   */
  update(_time: number): void {
    // Spawn new pockets with small probability
    if (this.pockets.length < this.maxPockets && Math.random() < 0.005) {
      this.pockets.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 18,
          -7 + Math.random() * 14 * 0.4,
          (Math.random() - 0.5) * 16
        ),
        radius: 2 + Math.random() * 3,
        strength: 0.5 + Math.random() * 0.7,
        life: 0,
        maxLife: 5 + Math.random() * 6,
        drift: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          0.15 + Math.random() * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        currentStrength: 0,
      });
    }

    // Update existing pockets
    for (let i = this.pockets.length - 1; i >= 0; i--) {
      const pocket = this.pockets[i];
      pocket.life += 0.016; // ~60fps timestep
      pocket.position.add(pocket.drift.clone().multiplyScalar(0.016));

      // Strength follows sine curve over lifetime
      pocket.currentStrength = pocket.strength * Math.sin(pocket.life / pocket.maxLife * Math.PI);

      // Remove expired pockets
      if (pocket.life > pocket.maxLife) {
        this.pockets.splice(i, 1);
      }
    }
  }

  /**
   * Calculate the combined force from all pockets at a position.
   * Returns upward lift with inward pull toward pocket center.
   */
  getForceAt(position: THREE.Vector3): THREE.Vector3 {
    const force = new THREE.Vector3(0, 0, 0);

    for (const pocket of this.pockets) {
      const diff = position.clone().sub(pocket.position);
      const dist = diff.length();

      if (dist < pocket.radius) {
        const falloff = 1 - (dist / pocket.radius);
        // Upward force with quadratic falloff
        force.y += pocket.currentStrength * falloff * falloff;
        // Inward pull toward center
        const inward = diff.clone().normalize().multiplyScalar(-0.06 * falloff);
        force.x += inward.x;
        force.z += inward.z;
      }
    }

    return force;
  }
}
