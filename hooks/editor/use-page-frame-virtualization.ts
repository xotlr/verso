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
  /** Buffer pages above/below viewport (default: 5) */
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
 * - Scroll container scrolls through scaled content, so scrollTop / scale = document position
 * - Each page occupies PAGE_HEIGHT_PX + PAGE_GAP_PX vertical space
 * - Buffer pages ensure smooth scrolling without visible pop-in
 */
export function usePageFrameVirtualization({
  totalFrames,
  scale,
  scrollContainerRef,
  bufferPages = 5, // Increased buffer for safety margin
  minFramesForVirtualization = 10,
}: UsePageFrameVirtualizationOptions): UsePageFrameVirtualizationReturn {
  // Track scroll container availability for reactive updates
  const [hasScrollContainer, setHasScrollContainer] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: Infinity });
  const rafIdRef = useRef<number | null>(null);
  const prevTotalFramesRef = useRef(totalFrames);

  // Total height of all pages (unscaled) - N pages with N-1 gaps between them
  const pageWithGap = PAGE_HEIGHT_PX + PAGE_GAP_PX;
  const totalHeight = totalFrames > 0
    ? totalFrames * PAGE_HEIGHT_PX + (totalFrames - 1) * PAGE_GAP_PX
    : PAGE_HEIGHT_PX;

  // Only virtualize when: enough frames AND scroll container is ready
  const canVirtualize = totalFrames >= minFramesForVirtualization && hasScrollContainer;

  /**
   * Find which page contains a given Y position in document coordinates.
   * Page i starts at position i * pageWithGap.
   */
  const getPageAtPosition = useCallback((yPosition: number): number => {
    if (yPosition <= 0 || totalFrames === 0) return 0;
    // Each page starts at pageIndex * pageWithGap
    // So the page at position y is floor(y / pageWithGap)
    const page = Math.floor(yPosition / pageWithGap);
    // Clamp to valid range
    return Math.min(Math.max(0, page), totalFrames - 1);
  }, [pageWithGap, totalFrames]);

  const calculateVisibleRange = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || totalFrames === 0) {
      return { startIndex: 0, endIndex: Math.max(1, totalFrames) };
    }

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    // Convert scroll position to document coordinates
    // When content is scaled, scrollTop is in scaled space
    // To get document position: scrollTop / scale
    const documentScrollTop = scrollTop / scale;
    const documentViewportHeight = viewportHeight / scale;

    // Calculate which pages are visible in document space
    const firstVisiblePage = getPageAtPosition(documentScrollTop);
    const lastVisiblePage = getPageAtPosition(documentScrollTop + documentViewportHeight);

    // Apply generous buffer for smooth scrolling
    const startIndex = Math.max(0, firstVisiblePage - bufferPages);
    const endIndex = Math.min(totalFrames, lastVisiblePage + bufferPages + 1);

    // Safety: ensure we always return a valid range
    if (endIndex <= startIndex) {
      return { startIndex: 0, endIndex: totalFrames };
    }

    return { startIndex, endIndex };
  }, [scrollContainerRef, scale, totalFrames, bufferPages, getPageAtPosition]);

  // Check for scroll container availability
  useEffect(() => {
    const checkContainer = () => {
      const hasContainer = scrollContainerRef.current !== null;
      setHasScrollContainer(hasContainer);
    };

    // Check immediately
    checkContainer();

    // Also check after a short delay (handles late ref assignment)
    const timeoutId = setTimeout(checkContainer, 100);

    return () => clearTimeout(timeoutId);
  }, [scrollContainerRef]);

  // Force recalculate when totalFrames changes significantly
  useEffect(() => {
    if (canVirtualize && prevTotalFramesRef.current !== totalFrames) {
      prevTotalFramesRef.current = totalFrames;
      setVisibleRange(calculateVisibleRange());
    }
  }, [totalFrames, canVirtualize, calculateVisibleRange]);

  // Update visible range on scroll with RAF throttling
  useEffect(() => {
    // When not virtualizing, we don't need scroll listeners
    if (!canVirtualize) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
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
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Also recalculate on resize
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [canVirtualize, scrollContainerRef, calculateVisibleRange]);

  // Recalculate when scale changes (only when virtualizing)
  useEffect(() => {
    if (canVirtualize) {
      setVisibleRange(calculateVisibleRange());
    }
  }, [scale, canVirtualize, calculateVisibleRange]);

  // When not virtualizing, return full range
  if (!canVirtualize) {
    return {
      startIndex: 0,
      endIndex: totalFrames,
      totalHeight,
      isVirtualized: false,
    };
  }

  // Clamp visible range to valid bounds
  const clampedStartIndex = Math.max(0, Math.min(visibleRange.startIndex, totalFrames - 1));
  const clampedEndIndex = Math.min(Math.max(visibleRange.endIndex, clampedStartIndex + 1), totalFrames);

  return {
    startIndex: clampedStartIndex,
    endIndex: clampedEndIndex,
    totalHeight,
    isVirtualized: true,
  };
}
