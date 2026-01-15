'use client';

/**
 * useCollapseAnimation - Smooth collapse/expand transitions for groups
 *
 * Provides animated transitions when groups collapse or expand,
 * with easeOutCubic easing for a natural feel.
 */

import { useCallback, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface CollapseAnimationState {
  /** Group ID being animated */
  groupId: string;
  /** Animation progress (0 = expanded, 1 = collapsed) */
  progress: number;
  /** Target state */
  toCollapsed: boolean;
}

export interface UseCollapseAnimationOptions {
  /** Animation duration in ms */
  duration?: number;
  /** Callback when animation completes */
  onAnimationComplete?: (groupId: string, collapsed: boolean) => void;
}

export interface UseCollapseAnimationResult {
  /** Start collapse/expand animation */
  animateCollapse: (groupId: string, toCollapsed: boolean) => void;
  /** Get current collapse progress for a group (undefined if not animating) */
  getCollapseProgress: (groupId: string) => number | undefined;
  /** Check if a group is currently animating */
  isAnimating: (groupId: string) => boolean;
  /** Cancel animation for a group */
  cancelAnimation: (groupId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 350; // ms

// ============================================================================
// Easing Functions
// ============================================================================

/**
 * Ease out cubic - decelerating to zero velocity
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ============================================================================
// Hook
// ============================================================================

export function useCollapseAnimation({
  duration = DEFAULT_DURATION,
  onAnimationComplete,
}: UseCollapseAnimationOptions = {}): UseCollapseAnimationResult {
  // Track animation state for each group
  const [animatingGroups, setAnimatingGroups] = useState<Map<string, CollapseAnimationState>>(
    new Map()
  );

  // Animation frame refs per group
  const frameRefs = useRef<Map<string, number>>(new Map());

  // Cancel animation for a group
  const cancelAnimation = useCallback((groupId: string) => {
    const frameId = frameRefs.current.get(groupId);
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameRefs.current.delete(groupId);
    }
    setAnimatingGroups(prev => {
      const next = new Map(prev);
      next.delete(groupId);
      return next;
    });
  }, []);

  // Start collapse/expand animation
  const animateCollapse = useCallback(
    (groupId: string, toCollapsed: boolean) => {
      // Cancel any existing animation for this group
      cancelAnimation(groupId);

      const startTime = performance.now();
      const startProgress = toCollapsed ? 0 : 1;
      const endProgress = toCollapsed ? 1 : 0;

      // Initialize animation state
      setAnimatingGroups(prev => {
        const next = new Map(prev);
        next.set(groupId, {
          groupId,
          progress: startProgress,
          toCollapsed,
        });
        return next;
      });

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(t);
        const progress = startProgress + (endProgress - startProgress) * eased;

        if (t < 1) {
          // Update progress
          setAnimatingGroups(prev => {
            const next = new Map(prev);
            const state = next.get(groupId);
            if (state) {
              next.set(groupId, { ...state, progress });
            }
            return next;
          });

          // Schedule next frame
          frameRefs.current.set(groupId, requestAnimationFrame(animate));
        } else {
          // Animation complete
          frameRefs.current.delete(groupId);
          setAnimatingGroups(prev => {
            const next = new Map(prev);
            next.delete(groupId);
            return next;
          });

          onAnimationComplete?.(groupId, toCollapsed);
        }
      };

      // Start animation
      frameRefs.current.set(groupId, requestAnimationFrame(animate));
    },
    [duration, onAnimationComplete, cancelAnimation]
  );

  // Get current collapse progress for a group
  const getCollapseProgress = useCallback(
    (groupId: string): number | undefined => {
      return animatingGroups.get(groupId)?.progress;
    },
    [animatingGroups]
  );

  // Check if a group is currently animating
  const isAnimating = useCallback(
    (groupId: string): boolean => {
      return animatingGroups.has(groupId);
    },
    [animatingGroups]
  );

  return {
    animateCollapse,
    getCollapseProgress,
    isAnimating,
    cancelAnimation,
  };
}
