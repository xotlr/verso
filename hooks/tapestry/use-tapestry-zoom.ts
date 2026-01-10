/**
 * Tapestry Zoom Controls Hook
 *
 * Provides zoom in, zoom out, fit view, and reset layout functionality.
 */

import { useCallback, type RefObject } from 'react';
import { select } from 'd3-selection';
import { zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import {
  TapestryState,
  createEmptyTapestry,
  getTapestryStorageKey,
} from '@/types/tapestry';
import { safeRemoveItem } from '@/lib/storage';

interface UseTapestryZoomOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  zoomRef: RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
  transformRef: RefObject<ZoomTransform>;
  screenplayId: string;
  resetState: (state: TapestryState) => void;
  setResetTrigger: React.Dispatch<React.SetStateAction<number>>;
}

interface UseTapestryZoomReturn {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitView: () => void;
  handleResetLayout: () => void;
}

/**
 * Provides zoom control handlers for the tapestry canvas.
 */
export function useTapestryZoom({
  svgRef,
  zoomRef,
  transformRef,
  screenplayId,
  resetState,
  setResetTrigger,
}: UseTapestryZoomOptions): UseTapestryZoomReturn {
  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.3);
    }
  }, [svgRef, zoomRef]);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  }, [svgRef, zoomRef]);

  const handleFitView = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, zoomIdentity);
    }
  }, [svgRef, zoomRef]);

  const handleResetLayout = useCallback(() => {
    const storageKey = getTapestryStorageKey(screenplayId);
    safeRemoveItem(storageKey);

    // Clear state first, then trigger regeneration
    resetState(createEmptyTapestry());
    setResetTrigger(prev => prev + 1);

    // Reset zoom to default
    (transformRef as { current: ZoomTransform }).current = zoomIdentity;
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
    }
  }, [screenplayId, resetState, setResetTrigger, svgRef, zoomRef, transformRef]);

  return {
    handleZoomIn,
    handleZoomOut,
    handleFitView,
    handleResetLayout,
  };
}
