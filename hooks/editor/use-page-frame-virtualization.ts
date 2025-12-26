'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PAGE_HEIGHT_PX } from '@/lib/constants';
import { PAGE_GAP_PX } from '@/lib/prosemirror/plugins/page-frames';

export interface UsePageFrameVirtualizationOptions {
  /** Total number of page frames */
  totalFrames: number;
  /** Current zoom scale factor */
  scale: number;
  /** Reference to scroll container element */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Buffer pages above/below viewport (default: 3) */
  bufferPages?: number;
  /** Minimum frames to enable virtualization (default: 10) */
  minFramesForVirtualization?: number;
}

export interface UsePageFrameVirtualizationReturn {
  /** Start index of visible range (inclusive) */
  startIndex: number;
  /** End index of visible range (exclusive) */
  endIndex: number;
  /** Total height of all pages in pixels */
  totalHeight: number;
  /** Whether virtualization is active */
  isVirtualized: boolean;
}

/**
 * Hook for virtualizing page frame rendering
 *
 * Only renders page frames that are visible in the viewport (plus a buffer).
 * This dramatically improves performance for 300+ page scripts.
 *
 * Key calculations:
 * - Scroll position is divided by scale to get document coordinates
 * - Each page occupies PAGE_HEIGHT_PX + PAGE_GAP_PX vertical space
 * - Buffer pages ensure smooth scrolling without visible pop-in
 */
export function usePageFrameVirtualization({
  totalFrames,
  scale,
  scrollContainerRef,
  bufferPages = 3,
  minFramesForVirtualization = 10,
}: UsePageFrameVirtualizationOptions): UsePageFrameVirtualizationReturn {
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: totalFrames });
  const rafIdRef = useRef<number | null>(null);

  // Total height of all pages (unscaled)
  const pageWithGap = PAGE_HEIGHT_PX + PAGE_GAP_PX;
  const totalHeight = totalFrames > 0
    ? totalFrames * PAGE_HEIGHT_PX + (totalFrames - 1) * PAGE_GAP_PX
    : PAGE_HEIGHT_PX;

  // Don't virtualize for small documents
  const isVirtualized = totalFrames >= minFramesForVirtualization;

  const calculateVisibleRange = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isVirtualized) {
      return { startIndex: 0, endIndex: totalFrames };
    }

    const scrollTop = scrollContainer.scrollTop;
    const viewportHeight = scrollContainer.clientHeight;

    // Convert viewport scroll position to document coordinates
    // The content is scaled, so we need to adjust
    const documentScrollTop = scrollTop / scale;
    const documentViewportHeight = viewportHeight / scale;

    // Calculate which pages are visible
    // Each page occupies pageWithGap pixels (except last page has no gap after it)
    const firstVisiblePage = Math.floor(documentScrollTop / pageWithGap);
    const lastVisiblePage = Math.ceil((documentScrollTop + documentViewportHeight) / pageWithGap);

    // Apply buffer for smooth scrolling
    const startIndex = Math.max(0, firstVisiblePage - bufferPages);
    const endIndex = Math.min(totalFrames, lastVisiblePage + bufferPages + 1);

    return { startIndex, endIndex };
  }, [scrollContainerRef, scale, totalFrames, pageWithGap, bufferPages, isVirtualized]);

  // Update visible range on scroll with RAF throttling
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isVirtualized) {
      // Reset to full range when not virtualized
      setVisibleRange({ startIndex: 0, endIndex: totalFrames });
      return;
    }

    const handleScroll = () => {
      // Cancel any pending RAF to avoid stacking
      if (rafIdRef.current !== null) {
        return; // Already scheduled
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const range = calculateVisibleRange();
        setVisibleRange((prev) => {
          // Only update if range actually changed
          if (prev.startIndex !== range.startIndex || prev.endIndex !== range.endIndex) {
            return range;
          }
          return prev;
        });
      });
    };

    // Initial calculation
    setVisibleRange(calculateVisibleRange());

    // Listen for scroll events (passive for performance)
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // Also recalculate on resize
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scrollContainerRef, isVirtualized, totalFrames, calculateVisibleRange]);

  // Recalculate when scale changes
  useEffect(() => {
    if (isVirtualized) {
      setVisibleRange(calculateVisibleRange());
    }
  }, [scale, isVirtualized, calculateVisibleRange]);

  return {
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    totalHeight,
    isVirtualized,
  };
}
