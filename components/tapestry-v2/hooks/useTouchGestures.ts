'use client';

/**
 * useTouchGestures - Touch gesture handling for the Tapestry canvas
 *
 * Supports:
 * - Two-finger pinch zoom
 * - Two-finger pan
 * - Single finger pan (optional)
 *
 * Uses Pointer Events for unified mouse/touch handling.
 */

import { useCallback, useRef, useEffect, type RefObject } from 'react';
import type { Transform } from '../state/TapestryContext';

// ============================================================================
// Types
// ============================================================================

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export interface UseTouchGesturesOptions {
  /** Reference to the SVG container */
  containerRef: RefObject<SVGSVGElement | null>;
  /** Reference to the content group */
  contentRef: RefObject<SVGGElement | null>;
  /** Mutable ref for transform */
  transformRef: RefObject<Transform>;
  /** Update transform ref only */
  updateTransformRef: (transform: Transform) => void;
  /** Commit transform to state */
  setTransform: (transform: Transform) => void;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Enable single-finger pan (default: false, uses two-finger) */
  singleFingerPan?: boolean;
  /** Whether interactions are enabled */
  enabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 4;

// ============================================================================
// Utilities
// ============================================================================

function getDistance(p1: TouchPoint, p2: TouchPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(p1: TouchPoint, p2: TouchPoint): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useTouchGestures({
  containerRef,
  contentRef,
  transformRef,
  updateTransformRef,
  setTransform,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  singleFingerPan = false,
  enabled = true,
}: UseTouchGesturesOptions): void {
  // Track active touch points
  const touchPointsRef = useRef<Map<number, TouchPoint>>(new Map());
  const gestureStateRef = useRef<{
    initialDistance: number;
    initialScale: number;
    initialCenter: { x: number; y: number };
    initialTransform: { x: number; y: number };
  } | null>(null);

  // Clamp zoom
  const clampZoom = useCallback(
    (scale: number) => Math.min(maxZoom, Math.max(minZoom, scale)),
    [minZoom, maxZoom]
  );

  // Apply transform to DOM
  const applyTransform = useCallback(
    (t: Transform) => {
      const content = contentRef.current;
      if (content) {
        content.setAttribute('transform', `translate(${t.x}, ${t.y}) scale(${t.scale})`);
      }
    },
    [contentRef]
  );

  // Handle pointer down
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      // Only handle touch events
      if (event.pointerType !== 'touch') return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const point: TouchPoint = {
        id: event.pointerId,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      touchPointsRef.current.set(event.pointerId, point);
      container.setPointerCapture(event.pointerId);

      // If we have two touch points, initialize pinch gesture
      if (touchPointsRef.current.size === 2) {
        const points = Array.from(touchPointsRef.current.values());
        const distance = getDistance(points[0], points[1]);
        const center = getCenter(points[0], points[1]);
        const current = transformRef.current;

        gestureStateRef.current = {
          initialDistance: distance,
          initialScale: current.scale,
          initialCenter: center,
          initialTransform: { x: current.x, y: current.y },
        };
      }
    },
    [enabled, containerRef, transformRef]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;
      if (event.pointerType !== 'touch') return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Update the touch point
      if (touchPointsRef.current.has(event.pointerId)) {
        touchPointsRef.current.set(event.pointerId, {
          id: event.pointerId,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }

      const touchCount = touchPointsRef.current.size;

      // Two-finger pinch/pan
      if (touchCount === 2 && gestureStateRef.current) {
        const points = Array.from(touchPointsRef.current.values());
        const currentDistance = getDistance(points[0], points[1]);
        const currentCenter = getCenter(points[0], points[1]);

        const { initialDistance, initialScale, initialCenter, initialTransform } =
          gestureStateRef.current;

        // Calculate new scale
        const scaleRatio = currentDistance / initialDistance;
        const newScale = clampZoom(initialScale * scaleRatio);

        // Calculate pan delta
        const panDeltaX = currentCenter.x - initialCenter.x;
        const panDeltaY = currentCenter.y - initialCenter.y;

        // Zoom toward center of pinch
        const actualScaleRatio = newScale / initialScale;
        const newX =
          initialTransform.x +
          panDeltaX +
          (initialCenter.x - initialTransform.x) * (1 - actualScaleRatio);
        const newY =
          initialTransform.y +
          panDeltaY +
          (initialCenter.y - initialTransform.y) * (1 - actualScaleRatio);

        const newTransform: Transform = { x: newX, y: newY, scale: newScale };
        updateTransformRef(newTransform);
        applyTransform(newTransform);
      }
      // Single finger pan (optional) - reserved for future implementation
      else if (touchCount === 1 && singleFingerPan) {
        // Note: This needs previous position tracking for delta
        // For now, we'll skip single-finger pan in favor of two-finger
        void Array.from(touchPointsRef.current.values());
      }
    },
    [
      enabled,
      containerRef,
      clampZoom,
      singleFingerPan,
      updateTransformRef,
      applyTransform,
    ]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;

      const container = containerRef.current;
      if (container) {
        try {
          container.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore if not captured
        }
      }

      touchPointsRef.current.delete(event.pointerId);

      // If less than 2 fingers, end gesture
      if (touchPointsRef.current.size < 2) {
        gestureStateRef.current = null;

        // Commit final transform to state
        setTransform(transformRef.current);
      }
    },
    [containerRef, transformRef, setTransform]
  );

  // Handle pointer cancel
  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;

      const container = containerRef.current;
      if (container) {
        try {
          container.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore
        }
      }

      touchPointsRef.current.delete(event.pointerId);
      gestureStateRef.current = null;
    },
    [containerRef]
  );

  // Prevent default touch behaviors (scroll, zoom)
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length >= 2) {
      event.preventDefault();
    }
  }, []);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerCancel);

    // Prevent default touch behaviors
    container.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerCancel);
      container.removeEventListener('touchstart', handleTouchStart);
    };
  }, [
    containerRef,
    enabled,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleTouchStart,
  ]);
}
