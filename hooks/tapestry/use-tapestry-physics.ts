/**
 * Tapestry Physics Hook
 *
 * Extracts spring physics logic for collapsed group card animations.
 * Handles the "stacked card drift" effect when dragging collapsed groups.
 */

import { useRef, useCallback, useEffect } from 'react';
import { select } from 'd3-selection';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, TapestryState } from '@/types/tapestry';

// Spring physics constants
const SPRING_CONFIG = {
  stiffness: 180,      // Spring force (higher = snappier)
  damping: 12,         // Friction (higher = less oscillation)
  mass: 1,             // Card mass
  precision: 0.01,     // Stop threshold for velocity
};

export interface CardPhysicsState {
  x: number;
  y: number;
  rot: number;
  vx: number;
  vy: number;
  vrot: number;
  tx: number;
  ty: number;
  trot: number;
}

export interface GroupPhysicsState {
  cards: CardPhysicsState[];
  isDragging: boolean;
  dragVelocity: { x: number; y: number };
}

interface UseTapestryPhysicsOptions {
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
}

export function useTapestryPhysics({
  setState,
  saveState,
}: UseTapestryPhysicsOptions) {
  const physicsRef = useRef<Map<string, GroupPhysicsState>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Physics update loop - runs via requestAnimationFrame for smooth spring animation
  const updatePhysics = useCallback(() => {
    const dt = 1 / 60; // Fixed timestep (60fps)
    let needsUpdate = false;

    physicsRef.current.forEach((groupState, groupId) => {
      const groupEl = select(`[data-group-id="${groupId}"]`);
      if (groupEl.empty()) return;

      const numCards = groupState.cards.length;

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
        const fx = -SPRING_CONFIG.stiffness * (card.x - targetX) - SPRING_CONFIG.damping * card.vx;
        const fy = -SPRING_CONFIG.stiffness * (card.y - targetY) - SPRING_CONFIG.damping * card.vy;
        const frot = -SPRING_CONFIG.stiffness * (card.rot - targetRot) - SPRING_CONFIG.damping * card.vrot;

        // Update velocity: v += (F/m) * dt
        card.vx += (fx / SPRING_CONFIG.mass) * dt;
        card.vy += (fy / SPRING_CONFIG.mass) * dt;
        card.vrot += (frot / SPRING_CONFIG.mass) * dt;

        // Update position: x += v * dt
        card.x += card.vx * dt;
        card.y += card.vy * dt;
        card.rot += card.vrot * dt;

        // Check if still moving significantly
        const isMoving = Math.abs(card.vx) > SPRING_CONFIG.precision ||
                        Math.abs(card.vy) > SPRING_CONFIG.precision ||
                        Math.abs(card.vrot) > SPRING_CONFIG.precision * 10;

        if (isMoving) {
          needsUpdate = true;
        }

        // Update DOM - find card by index in DOM order
        const cardEls = groupEl.selectAll('.stacked-card');
        const cardEl = select(cardEls.nodes()[i] as Element);
        if (!cardEl.empty()) {
          cardEl.attr('transform',
            `translate(${card.x}, ${card.y}) rotate(${card.rot}, ${DEFAULT_NOTE_WIDTH / 2}, ${DEFAULT_NOTE_HEIGHT / 2})`
          );
        }
      });

      // Decay drag velocity when not dragging (creates drift effect)
      if (!groupState.isDragging) {
        groupState.dragVelocity.x *= 0.92;
        groupState.dragVelocity.y *= 0.92;
        if (Math.abs(groupState.dragVelocity.x) > 0.05 || Math.abs(groupState.dragVelocity.y) > 0.05) {
          needsUpdate = true;
        }
      }
    });

    // Continue loop if physics still active
    if (needsUpdate) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    } else {
      animationFrameRef.current = null;
    }
  }, []);

  // Start the physics loop if not already running
  const startPhysicsLoop = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }
  }, [updatePhysics]);

  // Easing function for smooth collapse/expand
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // Animate collapse/expand transition
  const animateCollapse = useCallback((groupId: string, toCollapsed: boolean) => {
    const duration = 350; // ms
    const startTime = performance.now();
    const startProgress = toCollapsed ? 0 : 1;
    const endProgress = toCollapsed ? 1 : 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const progress = startProgress + (endProgress - startProgress) * eased;

      // Update group's collapseProgress during animation
      setState(prev => ({
        ...prev,
        groups: prev.groups.map(g =>
          g.id === groupId ? { ...g, collapseProgress: progress } : g
        ),
      }));

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - set final collapsed state and clear progress
        setState(prev => {
          const newState = {
            ...prev,
            groups: prev.groups.map(g =>
              g.id === groupId ? { ...g, collapsed: toCollapsed, collapseProgress: undefined } : g
            ),
          };
          saveState(newState);
          return newState;
        });
      }
    };

    requestAnimationFrame(animate);
  }, [setState, saveState]);

  // Cleanup physics loop on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    physicsRef,
    startPhysicsLoop,
    animateCollapse,
  };
}
