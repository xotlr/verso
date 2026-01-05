'use client';

/**
 * useGroupPhysics - Spring physics for collapsed group card stacks
 *
 * Implements the "stacked paper" effect where cards in a collapsed group
 * follow with delay/lag when dragging, creating a satisfying physical feel.
 *
 * Spring formula: F = -k(x - target) - b*velocity
 * - Cards trail behind during drag (depth-based inertia)
 * - Cards settle back with bounce when drag ends
 */

import { useCallback, useEffect, useRef } from 'react';
import type { TapestryGroup, TapestryNode } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

/** Physics state for a single card in the stack */
export interface CardPhysicsState {
  /** Current X position relative to group */
  x: number;
  /** Current Y position relative to group */
  y: number;
  /** Current rotation in degrees */
  rot: number;
  /** X velocity */
  vx: number;
  /** Y velocity */
  vy: number;
  /** Rotation velocity */
  vrot: number;
  /** Target X (scatter offset) */
  tx: number;
  /** Target Y (scatter offset) */
  ty: number;
  /** Target rotation (scatter offset) */
  trot: number;
}

/** Physics state for a group */
export interface GroupPhysicsState {
  /** Physics state for each card in the stack */
  cards: CardPhysicsState[];
  /** Whether the group is currently being dragged */
  isDragging: boolean;
  /** Current drag velocity (for trailing effect) */
  dragVelocity: { x: number; y: number };
}

/** Card transform for rendering */
export interface CardTransform {
  x: number;
  y: number;
  rot: number;
}

export interface UseGroupPhysicsOptions {
  /** All groups */
  groups: TapestryGroup[];
  /** All nodes (for counting children) */
  nodes: TapestryNode[];
  /** Maximum cards to show in stack */
  maxStackCards?: number;
  /** Callback when physics state updates (for re-render trigger) */
  onPhysicsUpdate?: () => void;
}

export interface UseGroupPhysicsResult {
  /** Start dragging a group */
  startDrag: (groupId: string) => void;
  /** Update drag (call on each drag move) */
  updateDrag: (groupId: string, dx: number, dy: number) => void;
  /** End dragging a group */
  endDrag: (groupId: string) => void;
  /** Get card transforms for a group */
  getCardTransforms: (groupId: string) => CardTransform[];
  /** Check if physics is active for a group */
  isPhysicsActive: (groupId: string) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Spring physics constants */
const SPRING = {
  stiffness: 180,      // Spring force (higher = snappier)
  damping: 12,         // Friction (higher = less oscillation)
  mass: 1,             // Card mass
  precision: 0.01,     // Stop threshold for velocity
} as const;

/** Default maximum cards in collapsed stack */
const DEFAULT_MAX_STACK_CARDS = 5;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Seeded pseudo-random number generator for deterministic scatter
 */
function seededRandom(seed: string, n: number): number {
  const seedNum = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((seedNum * (n + 1) * 9301 + 49297) % 233280) / 233280;
}

/**
 * Generate scatter offsets for stacked cards
 * Cards stack with slight offset and rotation for a natural paper stack look
 */
function generateScatterOffsets(
  groupId: string,
  count: number
): Array<{ x: number; y: number; rot: number }> {
  const offsets: Array<{ x: number; y: number; rot: number }> = [];

  for (let i = 0; i < count; i++) {
    const seed = `${groupId}-${i}`;
    // Cards stack with decreasing offset (bottom cards peek out more)
    const depth = count - 1 - i;
    offsets.push({
      x: depth * 6 + seededRandom(seed, 0) * 8 - 4,  // Stack offset + jitter
      y: depth * 8 + seededRandom(seed, 1) * 4,      // Vertical stack + jitter
      rot: (seededRandom(seed, 2) * 6 - 3) * (depth + 1) * 0.3, // Slight rotation
    });
  }

  return offsets;
}

/**
 * Initialize card physics state from scatter offsets
 */
function initializeCardPhysics(
  offsets: Array<{ x: number; y: number; rot: number }>
): CardPhysicsState[] {
  return offsets.map(offset => ({
    x: offset.x,
    y: offset.y,
    rot: offset.rot,
    vx: 0,
    vy: 0,
    vrot: 0,
    tx: offset.x,
    ty: offset.y,
    trot: offset.rot,
  }));
}

// ============================================================================
// Hook
// ============================================================================

export function useGroupPhysics({
  groups,
  nodes,
  maxStackCards = DEFAULT_MAX_STACK_CARDS,
  onPhysicsUpdate,
}: UseGroupPhysicsOptions): UseGroupPhysicsResult {
  // Physics state per group (stored in ref for performance)
  const physicsRef = useRef<Map<string, GroupPhysicsState>>(new Map());
  // Animation frame ID
  const frameRef = useRef<number | null>(null);
  // Track if physics loop is running
  const isRunningRef = useRef(false);

  // Initialize physics state for collapsed groups
  useEffect(() => {
    const physics = physicsRef.current;

    groups.forEach(group => {
      if (group.collapsed && !physics.has(group.id)) {
        // Count children for this group
        const childCount = nodes.filter(n => n.groupId === group.id).length;
        const cardCount = Math.min(childCount, maxStackCards);

        if (cardCount > 0) {
          const offsets = generateScatterOffsets(group.id, cardCount);
          physics.set(group.id, {
            cards: initializeCardPhysics(offsets),
            isDragging: false,
            dragVelocity: { x: 0, y: 0 },
          });
        }
      } else if (!group.collapsed && physics.has(group.id)) {
        // Remove physics state when group is expanded
        physics.delete(group.id);
      }
    });

    // Clean up physics for removed groups
    const groupIds = new Set(groups.map(g => g.id));
    physics.forEach((_, id) => {
      if (!groupIds.has(id)) {
        physics.delete(id);
      }
    });
  }, [groups, nodes, maxStackCards]);

  // Physics update loop
  const updatePhysics = useCallback(() => {
    const dt = 1 / 60; // Fixed timestep (60fps)
    let needsUpdate = false;

    physicsRef.current.forEach((groupState) => {
      const numCards = groupState.cards.length;
      if (numCards === 0) return;

      groupState.cards.forEach((card, i) => {
        // Top card (last in array) stays stable - it follows the group directly
        if (i === numCards - 1) return;

        // Calculate depth - cards further back have more inertia
        const depth = numCards - 1 - i;

        // Apply drag velocity as dynamic target offset
        const dragOffset = groupState.isDragging ? {
          x: -groupState.dragVelocity.x * depth * 2.0,
          y: -groupState.dragVelocity.y * depth * 2.0,
          rot: (groupState.dragVelocity.x * 0.8 - groupState.dragVelocity.y * 0.3) * depth,
        } : { x: 0, y: 0, rot: 0 };

        const targetX = card.tx + dragOffset.x;
        const targetY = card.ty + dragOffset.y;
        const targetRot = card.trot + dragOffset.rot;

        // Spring physics: F = -k(x - target) - b*velocity
        const fx = -SPRING.stiffness * (card.x - targetX) - SPRING.damping * card.vx;
        const fy = -SPRING.stiffness * (card.y - targetY) - SPRING.damping * card.vy;
        const frot = -SPRING.stiffness * (card.rot - targetRot) - SPRING.damping * card.vrot;

        // Update velocity: v += (F/m) * dt
        card.vx += (fx / SPRING.mass) * dt;
        card.vy += (fy / SPRING.mass) * dt;
        card.vrot += (frot / SPRING.mass) * dt;

        // Update position: x += v * dt
        card.x += card.vx * dt;
        card.y += card.vy * dt;
        card.rot += card.vrot * dt;

        // Check if still moving significantly
        const isMoving =
          Math.abs(card.vx) > SPRING.precision ||
          Math.abs(card.vy) > SPRING.precision ||
          Math.abs(card.vrot) > SPRING.precision * 10;

        if (isMoving) {
          needsUpdate = true;
        }
      });

      // Decay drag velocity when not dragging (creates drift effect)
      if (!groupState.isDragging) {
        groupState.dragVelocity.x *= 0.92;
        groupState.dragVelocity.y *= 0.92;
        if (
          Math.abs(groupState.dragVelocity.x) > 0.05 ||
          Math.abs(groupState.dragVelocity.y) > 0.05
        ) {
          needsUpdate = true;
        }
      }
    });

    // Notify about physics update for re-render
    if (needsUpdate) {
      onPhysicsUpdate?.();
    }

    // Continue loop if physics still active
    if (needsUpdate) {
      frameRef.current = requestAnimationFrame(updatePhysics);
    } else {
      frameRef.current = null;
      isRunningRef.current = false;
    }
  }, [onPhysicsUpdate]);

  // Start the physics loop if not already running
  const startPhysicsLoop = useCallback(() => {
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      frameRef.current = requestAnimationFrame(updatePhysics);
    }
  }, [updatePhysics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        isRunningRef.current = false;
      }
    };
  }, []);

  // Start dragging a group
  const startDrag = useCallback((groupId: string) => {
    const physics = physicsRef.current.get(groupId);
    if (physics) {
      physics.isDragging = true;
      physics.dragVelocity = { x: 0, y: 0 };
      startPhysicsLoop();
    }
  }, [startPhysicsLoop]);

  // Update drag (call on each drag move)
  const updateDrag = useCallback((groupId: string, dx: number, dy: number) => {
    const physics = physicsRef.current.get(groupId);
    if (physics) {
      // Smooth the velocity with exponential moving average
      physics.dragVelocity.x = physics.dragVelocity.x * 0.7 + dx * 0.3;
      physics.dragVelocity.y = physics.dragVelocity.y * 0.7 + dy * 0.3;
    }
  }, []);

  // End dragging a group
  const endDrag = useCallback((groupId: string) => {
    const physics = physicsRef.current.get(groupId);
    if (physics) {
      physics.isDragging = false;
      // Keep physics running for settle animation
      startPhysicsLoop();
    }
  }, [startPhysicsLoop]);

  // Get card transforms for a group
  const getCardTransforms = useCallback((groupId: string): CardTransform[] => {
    const physics = physicsRef.current.get(groupId);
    if (!physics) return [];

    return physics.cards.map(card => ({
      x: card.x,
      y: card.y,
      rot: card.rot,
    }));
  }, []);

  // Check if physics is active for a group
  const isPhysicsActive = useCallback((groupId: string): boolean => {
    return physicsRef.current.has(groupId);
  }, []);

  return {
    startDrag,
    updateDrag,
    endDrag,
    getCardTransforms,
    isPhysicsActive,
  };
}
