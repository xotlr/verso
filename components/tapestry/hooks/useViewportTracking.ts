'use client';

/**
 * useViewportTracking - Track and manage viewport for virtualization
 *
 * Calculates visible area from transform and container size,
 * with debouncing to prevent excessive re-renders during pan/zoom.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import type { Viewport } from '@/lib/tapestry/virtualization';
import { hasViewportChanged } from '@/lib/tapestry/virtualization';
import type { Transform } from '../state/TapestryContext';

// ============================================================================
// Types
// ============================================================================

export interface UseViewportTrackingOptions {
  /** Current transform */
  transform: Transform;
  /** Container width */
  containerWidth: number;
  /** Container height */
  containerHeight: number;
  /** Debounce time in ms (default: 16ms = 60fps) */
  debounceMs?: number;
  /** Change threshold in pixels (default: 10) */
  changeThreshold?: number;
}

export interface UseViewportTrackingReturn {
  /** Current viewport in canvas coordinates */
  viewport: Viewport;
  /** Whether the viewport is currently changing (during pan/zoom) */
  isChanging: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useViewportTracking({
  transform,
  containerWidth,
  containerHeight,
  debounceMs = 16,
  changeThreshold = 10,
}: UseViewportTrackingOptions): UseViewportTrackingReturn {
  // Track whether we're in the middle of a change
  const [isChanging, setIsChanging] = useState(false);
  const changeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastViewportRef = useRef<Viewport | null>(null);

  // Calculate viewport from transform
  const calculateViewport = useCallback((): Viewport => {
    if (containerWidth === 0 || containerHeight === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: -transform.x / transform.scale,
      y: -transform.y / transform.scale,
      width: containerWidth / transform.scale,
      height: containerHeight / transform.scale,
    };
  }, [transform.x, transform.y, transform.scale, containerWidth, containerHeight]);

  // Debounced viewport state
  const [viewport, setViewport] = useState<Viewport>(() => calculateViewport());

  // Update viewport with debouncing
  useEffect(() => {
    const newViewport = calculateViewport();

    // Check if change is significant
    if (hasViewportChanged(lastViewportRef.current, newViewport, changeThreshold)) {
      setIsChanging(true);

      // Clear existing timeout
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }

      // Debounce the viewport update
      changeTimeoutRef.current = setTimeout(() => {
        lastViewportRef.current = newViewport;
        setViewport(newViewport);
        setIsChanging(false);
      }, debounceMs);
    }

    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [calculateViewport, changeThreshold, debounceMs]);

  return { viewport, isChanging };
}

// ============================================================================
// Immediate viewport (no debounce)
// ============================================================================

/**
 * Get viewport immediately without debouncing.
 * Use this for real-time calculations that need current viewport.
 */
export function calculateViewportImmediate(
  transform: Transform,
  containerWidth: number,
  containerHeight: number
): Viewport {
  if (containerWidth === 0 || containerHeight === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: -transform.x / transform.scale,
    y: -transform.y / transform.scale,
    width: containerWidth / transform.scale,
    height: containerHeight / transform.scale,
  };
}
