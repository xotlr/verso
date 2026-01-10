'use client';

/**
 * usePanZoom - Pan and zoom interactions for the Tapestry canvas
 *
 * Replaces d3-zoom with native pointer events for better performance
 * and smaller bundle size.
 *
 * Supports:
 * - Mouse wheel zoom (centered on cursor)
 * - Right-click/middle-click pan
 * - Programmatic zoom controls
 */

import { useCallback, useRef, useEffect, type RefObject } from 'react';
import type { Transform } from '../state/TapestryContext';

// ============================================================================
// Types
// ============================================================================

export interface UsePanZoomOptions {
  /** Reference to the SVG container */
  containerRef: RefObject<SVGSVGElement | null>;
  /** Reference to the content group that gets transformed */
  contentRef: RefObject<SVGGElement | null>;
  /** Current transform (from context or state) */
  transform: Transform;
  /** Mutable ref for transform (for 60fps updates) */
  transformRef: RefObject<Transform>;
  /** Update transform ref only (no React re-render) */
  updateTransformRef: (transform: Transform) => void;
  /** Commit transform to React state (triggers re-render) */
  setTransform: (transform: Transform) => void;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Zoom sensitivity (higher = faster zoom) */
  zoomSensitivity?: number;
  /** Callback when panning starts */
  onPanStart?: () => void;
  /** Callback when panning ends */
  onPanEnd?: () => void;
  /** Whether interactions are enabled */
  enabled?: boolean;
}

export interface UsePanZoomReturn {
  /** Zoom to a specific level */
  zoomTo: (scale: number, center?: { x: number; y: number }) => void;
  /** Zoom in by a step */
  zoomIn: (step?: number) => void;
  /** Zoom out by a step */
  zoomOut: (step?: number) => void;
  /** Reset to initial transform */
  resetView: () => void;
  /** Fit all content in view */
  fitToContent: (bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding?: number) => void;
  /** Pan to center on a point */
  panTo: (x: number, y: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ZOOM_SENSITIVITY = 0.002;
const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

// ============================================================================
// Hook
// ============================================================================

export function usePanZoom({
  containerRef,
  contentRef,
  transform: _transform,
  transformRef,
  updateTransformRef,
  setTransform,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomSensitivity = DEFAULT_ZOOM_SENSITIVITY,
  onPanStart,
  onPanEnd,
  enabled = true,
}: UsePanZoomOptions): UsePanZoomReturn {
  // Track panning state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Apply transform to DOM directly (no React re-render)
  const applyTransform = useCallback((t: Transform) => {
    const content = contentRef.current;
    if (content) {
      content.setAttribute('transform', `translate(${t.x}, ${t.y}) scale(${t.scale})`);
    }
  }, [contentRef]);

  // Clamp zoom to bounds
  const clampZoom = useCallback(
    (scale: number) => Math.min(maxZoom, Math.max(minZoom, scale)),
    [minZoom, maxZoom]
  );

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!enabled) return;

      // Prevent page scroll
      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Get cursor position relative to container
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;

      // Current transform
      const current = transformRef.current;

      // Calculate zoom factor (negative deltaY = zoom in)
      const delta = -event.deltaY * zoomSensitivity;
      const factor = 1 + delta;
      const newScale = clampZoom(current.scale * factor);

      // If scale didn't change (at limits), bail
      if (newScale === current.scale) return;

      // Zoom toward cursor:
      // We want the point under the cursor to stay under the cursor
      // newX = cursorX - (cursorX - oldX) * (newScale / oldScale)
      const scaleRatio = newScale / current.scale;
      const newX = cursorX - (cursorX - current.x) * scaleRatio;
      const newY = cursorY - (cursorY - current.y) * scaleRatio;

      const newTransform: Transform = { x: newX, y: newY, scale: newScale };

      // Update ref and apply to DOM (60fps)
      updateTransformRef(newTransform);
      applyTransform(newTransform);

      // Debounced commit to React state
      // (could add a debounce here for virtualization updates)
      setTransform(newTransform);
    },
    [enabled, containerRef, transformRef, clampZoom, zoomSensitivity, updateTransformRef, applyTransform, setTransform]
  );

  // Handle pointer down for panning
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      // Right-click or middle-click to pan
      if (event.button !== 2 && event.button !== 1) return;

      // Prevent context menu on right-click
      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      // Capture pointer for smooth tracking
      container.setPointerCapture(event.pointerId);

      isPanningRef.current = true;
      panStartRef.current = { x: event.clientX, y: event.clientY };

      onPanStart?.();
    },
    [enabled, containerRef, onPanStart]
  );

  // Handle pointer move for panning
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isPanningRef.current) return;

      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;

      panStartRef.current = { x: event.clientX, y: event.clientY };

      const current = transformRef.current;
      const newTransform: Transform = {
        x: current.x + dx,
        y: current.y + dy,
        scale: current.scale,
      };

      // Update ref and apply to DOM (60fps)
      updateTransformRef(newTransform);
      applyTransform(newTransform);
    },
    [transformRef, updateTransformRef, applyTransform]
  );

  // Handle pointer up to end panning
  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!isPanningRef.current) return;

      const container = containerRef.current;
      if (container) {
        container.releasePointerCapture(event.pointerId);
      }

      isPanningRef.current = false;

      // Commit final position to React state
      setTransform(transformRef.current);

      onPanEnd?.();
    },
    [containerRef, transformRef, setTransform, onPanEnd]
  );

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
  }, []);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Wheel for zoom
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Pointer events for pan
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    // Context menu
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    containerRef,
    enabled,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleContextMenu,
  ]);

  // Public methods
  const zoomTo = useCallback(
    (scale: number, center?: { x: number; y: number }) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = center?.x ?? rect.width / 2;
      const centerY = center?.y ?? rect.height / 2;

      const current = transformRef.current;
      const newScale = clampZoom(scale);
      const scaleRatio = newScale / current.scale;

      const newTransform: Transform = {
        x: centerX - (centerX - current.x) * scaleRatio,
        y: centerY - (centerY - current.y) * scaleRatio,
        scale: newScale,
      };

      updateTransformRef(newTransform);
      applyTransform(newTransform);
      setTransform(newTransform);
    },
    [containerRef, transformRef, clampZoom, updateTransformRef, applyTransform, setTransform]
  );

  const zoomIn = useCallback(
    (step = ZOOM_STEP) => {
      zoomTo(transformRef.current.scale * step);
    },
    [zoomTo, transformRef]
  );

  const zoomOut = useCallback(
    (step = ZOOM_STEP) => {
      zoomTo(transformRef.current.scale / step);
    },
    [zoomTo, transformRef]
  );

  const resetView = useCallback(() => {
    const newTransform: Transform = { x: 0, y: 0, scale: 1 };
    updateTransformRef(newTransform);
    applyTransform(newTransform);
    setTransform(newTransform);
  }, [updateTransformRef, applyTransform, setTransform]);

  const fitToContent = useCallback(
    (bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding = 50) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const contentWidth = bounds.maxX - bounds.minX + padding * 2;
      const contentHeight = bounds.maxY - bounds.minY + padding * 2;

      if (contentWidth <= 0 || contentHeight <= 0) return;

      // Calculate scale to fit content
      const scaleX = rect.width / contentWidth;
      const scaleY = rect.height / contentHeight;
      const newScale = clampZoom(Math.min(scaleX, scaleY));

      // Center the content
      const newX = (rect.width - contentWidth * newScale) / 2 - (bounds.minX - padding) * newScale;
      const newY = (rect.height - contentHeight * newScale) / 2 - (bounds.minY - padding) * newScale;

      const newTransform: Transform = { x: newX, y: newY, scale: newScale };
      updateTransformRef(newTransform);
      applyTransform(newTransform);
      setTransform(newTransform);
    },
    [containerRef, clampZoom, updateTransformRef, applyTransform, setTransform]
  );

  const panTo = useCallback(
    (x: number, y: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const current = transformRef.current;

      // Center the point in the viewport
      const newX = rect.width / 2 - x * current.scale;
      const newY = rect.height / 2 - y * current.scale;

      const newTransform: Transform = { x: newX, y: newY, scale: current.scale };
      updateTransformRef(newTransform);
      applyTransform(newTransform);
      setTransform(newTransform);
    },
    [containerRef, transformRef, updateTransformRef, applyTransform, setTransform]
  );

  return {
    zoomTo,
    zoomIn,
    zoomOut,
    resetView,
    fitToContent,
    panTo,
  };
}
