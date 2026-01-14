/**
 * Shared types and constants for petal particle system.
 */

import * as THREE from 'three';

/**
 * Physics constants for petal aerodynamics.
 */
export const PHYSICS = {
  /** Translational lift coefficient */
  CT: 1.0,
  /** Rotational lift coefficient */
  CR: 1.2,
  /** Drag coefficient at 0° angle of attack */
  CD_0: 0.12,
  /** Drag coefficient at 90° angle of attack */
  CD_90: 2.0,
  /** Critical Froude number for state transitions */
  FR_CRITICAL: 0.67,
  /** Angular velocity for flutter state */
  OMEGA_FLUTTER: 0.8,
  /** Angular velocity for tumble state */
  OMEGA_TUMBLE: 1.5,
  /** Terminal velocity limit */
  TERMINAL_VELOCITY: 0.6,
} as const;

/**
 * Petal motion states.
 */
export const STATE = {
  STEADY_DESCENT: 0,
  FLUTTERING: 1,
  TUMBLING: 2,
  CHAOTIC: 3,
  GLIDING: 4,
  CUSP_TURN: 5,
} as const;

export type PetalState = typeof STATE[keyof typeof STATE];

/**
 * Configuration for petal system.
 */
export interface PetalsConfig {
  petalCount: number;
  spread: { x: number; y: number; z: number };
  colors: THREE.Color[];
  clusterCount: number;
  clusterRadius: number;
  cohesionStrength: number;
  alignmentStrength: number;
}

/**
 * Cluster data for grouped petal spawning.
 */
export interface Cluster {
  position: THREE.Vector3;
  colorBias: number;
  drift: THREE.Vector3;
  phase: number;
  activity: number;
}

/**
 * Air pocket data for updraft simulation.
 */
export interface AirPocket {
  position: THREE.Vector3;
  radius: number;
  strength: number;
  life: number;
  maxLife: number;
  drift: THREE.Vector3;
  currentStrength: number;
}

/**
 * Create a configuration object for the petal system.
 */
export function createPetalsConfig(count: number, colors: THREE.Color[]): PetalsConfig {
  return {
    petalCount: count,
    spread: { x: 18, y: 14, z: 16 },
    colors,
    clusterCount: Math.max(6, Math.floor(count / 30)),
    clusterRadius: 2.5,
    cohesionStrength: 0.015,
    alignmentStrength: 0.02,
  };
}
