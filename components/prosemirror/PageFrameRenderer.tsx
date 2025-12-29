'use client';

import React, { memo } from 'react';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from '@/lib/constants';
import { PageFrame, PAGE_GAP_PX } from '@/lib/prosemirror/plugins/page-frames';
import { usePageFrameVirtualization } from '@/hooks/editor/use-page-frame-virtualization';
import type { PageStyle } from '@/types/settings';

interface PageFrameRendererProps {
  /** Page frames to render */
  frames: PageFrame[];
  /** Current scale factor */
  scale: number;
  /** Whether discrete mode is enabled */
  discreteMode: boolean;
  /** Page style: 'themed' or 'plain' */
  pageStyle?: PageStyle;
  /** Whether to show page numbers */
  showPageNumbers?: boolean;
  /** Reference to scroll container for virtualization */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Single page frame component
 */
const PageFrameCard = memo(function PageFrameCard({
  frame,
  showPageNumbers = true,
}: {
  frame: PageFrame;
  showPageNumbers?: boolean;
}) {
  // Show page number on all pages except first (title page or page 1)
  const showPageNumber = showPageNumbers && !frame.isFirstPage && frame.pageNumber > 1;

  return (
    <div
      className="pm-page-frame"
      style={{
        top: `${frame.yOffset}px`,
        width: `${PAGE_WIDTH_PX}px`,
        height: `${PAGE_HEIGHT_PX}px`,
      }}
      data-page={frame.pageNumber}
    >
      {showPageNumber && (
        <span className="pm-page-frame-number">{frame.pageNumber}</span>
      )}
    </div>
  );
});

/**
 * Renders page frames as visual overlays
 *
 * These frames provide the "discrete page" appearance by rendering
 * white card backgrounds with shadows. The actual content flows
 * through ProseMirror on top.
 */
export const PageFrameRenderer = memo(function PageFrameRenderer({
  frames,
  scale,
  discreteMode,
  pageStyle = 'themed',
  showPageNumbers = true,
  scrollContainerRef,
}: PageFrameRendererProps) {
  // Use virtualization to only render visible frames
  const { startIndex, endIndex, totalHeight, isVirtualized } = usePageFrameVirtualization({
    totalFrames: frames.length,
    scale,
    scrollContainerRef: scrollContainerRef ?? { current: null },
    bufferPages: 3,
    minFramesForVirtualization: 10,
  });

  if (!discreteMode || frames.length === 0) {
    return null;
  }

  // Get only the visible frames (or all frames if not virtualized)
  const visibleFrames = isVirtualized ? frames.slice(startIndex, endIndex) : frames;

  return (
    <div
      className="pm-page-frames-container"
      data-page-style={pageStyle}
      style={{
        height: `${totalHeight}px`,
        // No transform needed - parent container handles centering and scaling
      }}
    >
      {visibleFrames.map((frame) => (
        <PageFrameCard key={`page-${frame.pageNumber}`} frame={frame} showPageNumbers={showPageNumbers} />
      ))}
    </div>
  );
});

/**
 * Renders gaps between pages
 * These cover the space between page frames to show the editor background
 *
 * Uses CSS transform for scaling (matching PageFrameRenderer) so that
 * all visual elements animate together during zoom transitions.
 */
export const PageGapRenderer = memo(function PageGapRenderer({
  frames,
  scale,
  discreteMode,
  scrollContainerRef,
}: PageFrameRendererProps) {
  // Use virtualization for gaps too (gaps are between pages, so totalFrames = frames.length - 1)
  const { startIndex, endIndex, totalHeight, isVirtualized } = usePageFrameVirtualization({
    totalFrames: frames.length,
    scale,
    scrollContainerRef: scrollContainerRef ?? { current: null },
    bufferPages: 3,
    minFramesForVirtualization: 10,
  });

  if (!discreteMode || frames.length <= 1) {
    return null;
  }

  // Get visible gaps - gaps exist between pages, so we need frames from startIndex+1 to endIndex
  // Each gap is positioned based on the page BEFORE it
  const visibleGapFrames = isVirtualized
    ? frames.slice(Math.max(1, startIndex), endIndex)
    : frames.slice(1);

  return (
    <div
      className="pm-page-gaps-container"
      style={{
        height: `${totalHeight}px`,
        // No transform needed - parent container handles centering and scaling
      }}
    >
      {visibleGapFrames.map((frame) => {
        // Gap index is page number - 1 (gap after page 1 is index 0)
        const gapIndex = frame.pageNumber - 2;
        return (
          <div
            key={`gap-${frame.pageNumber}`}
            className="pm-page-gap-overlay"
            style={{
              // Position in unscaled coordinates - CSS transform handles scaling
              top: `${(gapIndex + 1) * PAGE_HEIGHT_PX + gapIndex * PAGE_GAP_PX}px`,
              height: `${PAGE_GAP_PX}px`,
            }}
          />
        );
      })}
    </div>
  );
});
