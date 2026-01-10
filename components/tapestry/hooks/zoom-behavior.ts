/**
 * Tapestry Zoom Behavior Factory
 *
 * Creates D3 zoom behavior with touch support, right-click panning,
 * and scroll wheel zooming.
 */

import { zoom, type ZoomBehavior } from 'd3-zoom';
import type { Selection } from 'd3-selection';
import type { ZoomTransform } from 'd3-zoom';
import type { TapestryState } from '@/types/tapestry';

interface CreateZoomBehaviorOptions {
  container: Selection<SVGGElement, unknown, null, undefined>;
  transformRef: React.MutableRefObject<ZoomTransform>;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
  updateViewport: () => void;
}

/**
 * Creates zoom behavior for the tapestry canvas.
 * Supports:
 * - Touch gestures for mobile
 * - Right-click drag for panning
 * - Scroll wheel for zooming
 */
export function createZoomBehavior({
  container,
  transformRef,
  setState,
  saveState,
  updateViewport,
}: CreateZoomBehaviorOptions): ZoomBehavior<SVGSVGElement, unknown> {
  return zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 4])
    .touchable(() => true)
    .filter((event) => {
      // Allow touch events
      if (event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend') {
        return true;
      }
      // Allow scroll wheel for zooming
      if (event.type === 'wheel') {
        return true;
      }
      // Allow right-click drag for panning (button 2)
      if (event.type === 'mousedown' || event.type === 'mousemove' || event.type === 'mouseup') {
        return event.button === 2;
      }
      return false;
    })
    .on('zoom', (event) => {
      // Only update D3 transform during zoom (no React state update)
      // DO NOT call updateViewport() here - it triggers re-renders that clear the SVG mid-zoom
      container.attr('transform', event.transform);
      transformRef.current = event.transform;
    })
    .on('end', () => {
      // Save to React state and localStorage when zoom/pan ends
      setState(prev => {
        const newState = {
          ...prev,
          zoom: transformRef.current.k,
          panX: transformRef.current.x,
          panY: transformRef.current.y,
        };
        saveState(newState);
        return newState;
      });
      // Final viewport update
      updateViewport();
    });
}
