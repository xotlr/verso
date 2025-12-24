import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import { flushSync } from 'react-dom';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.25;
const WHEEL_SENSITIVITY = 0.002;

// Zoom preset values
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

interface UseEditorZoomOptions {
  containerRef: RefObject<HTMLElement | null>;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  fitToWidthScale: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

interface UseEditorZoomReturn {
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  isZoomed: boolean;
  fitToWidthScale: number;
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Find the next zoom preset going up.
 */
function getNextZoomUp(currentZoom: number): number {
  for (const preset of ZOOM_PRESETS) {
    if (preset > currentZoom + 0.01) {
      return preset;
    }
  }
  return MAX_ZOOM;
}

/**
 * Find the next zoom preset going down.
 */
function getNextZoomDown(currentZoom: number): number {
  for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
    if (ZOOM_PRESETS[i] < currentZoom - 0.01) {
      return ZOOM_PRESETS[i];
    }
  }
  return MIN_ZOOM;
}

/**
 * Hook for managing editor zoom with gesture support.
 *
 * Features:
 * - Ctrl/Cmd + scroll wheel zoom
 * - Pinch-to-zoom on touch devices
 * - Zoom in/out buttons
 * - Reset to fit-to-width
 */
export function useEditorZoom({
  containerRef,
  scrollContainerRef,
  fitToWidthScale,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM,
  onZoomChange,
}: UseEditorZoomOptions): UseEditorZoomReturn {
  // Start with fit-to-width scale as the default
  const [zoom, setZoomState] = useState(fitToWidthScale);
  const [isUserZoomed, setIsUserZoomed] = useState(false);

  // Keep a ref to current zoom for use in scroll adjustment without stale closures
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  /**
   * Adjust scroll position instantly when zoom changes.
   * Temporarily disables smooth scroll to ensure instant adjustment.
   */
  const adjustScrollForZoom = useCallback((oldZoom: number, newZoom: number) => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer || oldZoom === newZoom) return;

    // Disable smooth scroll temporarily (CSS has scroll-behavior: smooth)
    const originalBehavior = scrollContainer.style.scrollBehavior;
    scrollContainer.style.scrollBehavior = 'auto';

    const ratio = newZoom / oldZoom;
    scrollContainer.scrollTop = scrollContainer.scrollTop * ratio;

    // Restore after a frame
    requestAnimationFrame(() => {
      scrollContainer.style.scrollBehavior = originalBehavior;
    });
  }, [scrollContainerRef]);

  // Track pinch gesture state
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    pointers: Map<number, { x: number; y: number }>;
  }>({
    initialDistance: 0,
    initialZoom: 1,
    pointers: new Map(),
  });

  // Update zoom when fit-to-width changes (window resize) - but only if user hasn't manually zoomed
  useEffect(() => {
    if (!isUserZoomed) {
      setZoomState(fitToWidthScale);
    }
  }, [fitToWidthScale, isUserZoomed]);

  // Set zoom with clamping and scroll adjustment
  const setZoom = useCallback((newZoom: number) => {
    const oldZoom = zoomRef.current;
    const clampedZoom = clamp(newZoom, minZoom, maxZoom);
    zoomRef.current = clampedZoom; // Update immediately for rapid events
    flushSync(() => {
      setZoomState(clampedZoom);
      setIsUserZoomed(true);
    });
    adjustScrollForZoom(oldZoom, clampedZoom);
    onZoomChange?.(clampedZoom);
  }, [minZoom, maxZoom, onZoomChange, adjustScrollForZoom]);

  // Zoom in to next preset
  const zoomIn = useCallback(() => {
    setZoom(getNextZoomUp(zoom));
  }, [zoom, setZoom]);

  // Zoom out to next preset
  const zoomOut = useCallback(() => {
    setZoom(getNextZoomDown(zoom));
  }, [zoom, setZoom]);

  // Reset to fit-to-width
  const resetZoom = useCallback(() => {
    const oldZoom = zoomRef.current;
    zoomRef.current = fitToWidthScale; // Update immediately for rapid events
    flushSync(() => {
      setZoomState(fitToWidthScale);
      setIsUserZoomed(false);
    });
    adjustScrollForZoom(oldZoom, fitToWidthScale);
    onZoomChange?.(fitToWidthScale);
  }, [fitToWidthScale, onZoomChange, adjustScrollForZoom]);

  // Handle wheel zoom (Ctrl/Cmd + scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom when Ctrl (Windows/Linux) or Cmd (Mac) is held
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate zoom delta based on scroll amount
      const oldZoom = zoomRef.current;
      const delta = -e.deltaY * WHEEL_SENSITIVITY;
      const newZoom = clamp(oldZoom + delta, minZoom, maxZoom);

      zoomRef.current = newZoom; // Update immediately for rapid events
      flushSync(() => {
        setZoomState(newZoom);
        setIsUserZoomed(true);
      });
      adjustScrollForZoom(oldZoom, newZoom);
      onZoomChange?.(newZoom);
    };

    // Use passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, minZoom, maxZoom, onZoomChange, adjustScrollForZoom]);

  // Handle pinch-to-zoom gestures
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handlePointerDown = (e: PointerEvent) => {
      pinchStateRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // If we now have 2 pointers, start pinch
      if (pinchStateRef.current.pointers.size === 2) {
        const [p1, p2] = Array.from(pinchStateRef.current.pointers.values());
        pinchStateRef.current.initialDistance = getDistance(p1, p2);
        pinchStateRef.current.initialZoom = zoomRef.current;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pinchStateRef.current.pointers.has(e.pointerId)) return;

      pinchStateRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Only process if we have exactly 2 pointers (pinch gesture)
      if (pinchStateRef.current.pointers.size !== 2) return;

      const [p1, p2] = Array.from(pinchStateRef.current.pointers.values());
      const currentDistance = getDistance(p1, p2);
      const { initialDistance, initialZoom } = pinchStateRef.current;

      if (initialDistance === 0) return;

      // Calculate zoom based on pinch scale
      const oldZoom = zoomRef.current;
      const scale = currentDistance / initialDistance;
      const newZoom = clamp(initialZoom * scale, minZoom, maxZoom);

      zoomRef.current = newZoom; // Update immediately for rapid events
      flushSync(() => {
        setZoomState(newZoom);
        setIsUserZoomed(true);
      });
      adjustScrollForZoom(oldZoom, newZoom);
    };

    const handlePointerUp = (e: PointerEvent) => {
      pinchStateRef.current.pointers.delete(e.pointerId);

      // Reset initial values when gesture ends
      if (pinchStateRef.current.pointers.size < 2) {
        pinchStateRef.current.initialDistance = 0;
        pinchStateRef.current.initialZoom = zoomRef.current;
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      handlePointerUp(e);
    };

    // Add pointer event listeners
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerCancel);
    container.addEventListener('pointerleave', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerCancel);
      container.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [containerRef, minZoom, maxZoom, adjustScrollForZoom]);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    isZoomed: isUserZoomed,
    fitToWidthScale,
  };
}
