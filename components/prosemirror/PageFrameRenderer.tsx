'use client';

import React, { memo } from 'react';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from '@/lib/constants';
import { PageFrame, PAGE_GAP_PX } from '@/lib/prosemirror/plugins/page-frames';
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
}: PageFrameRendererProps) {
  if (!discreteMode || frames.length === 0) {
    return null;
  }

  // Calculate total height for the container
  const totalHeight = frames.length * PAGE_HEIGHT_PX + (frames.length - 1) * PAGE_GAP_PX;

  return (
    <div
      className="pm-page-frames-container"
      data-page-style={pageStyle}
      style={{
        height: `${totalHeight}px`,
        width: `${PAGE_WIDTH_PX}px`,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: 'top center',
      }}
    >
      {frames.map((frame) => (
        <PageFrameCard key={frame.pageNumber} frame={frame} showPageNumbers={showPageNumbers} />
      ))}
    </div>
  );
});

/**
 * Renders gaps between pages
 * These cover the space between page frames to show the editor background
 */
export const PageGapRenderer = memo(function PageGapRenderer({
  frames,
  scale,
  discreteMode,
}: PageFrameRendererProps) {
  if (!discreteMode || frames.length <= 1) {
    return null;
  }

  return (
    <>
      {frames.slice(1).map((frame, index) => (
        <div
          key={`gap-${frame.pageNumber}`}
          className="pm-page-gap-overlay"
          style={{
            top: `${(index + 1) * PAGE_HEIGHT_PX * scale + index * PAGE_GAP_PX * scale}px`,
            height: `${PAGE_GAP_PX * scale}px`,
          }}
        />
      ))}
    </>
  );
});

export default PageFrameRenderer;
