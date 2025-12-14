'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from '@/lib/classic-editor/types';
import type { RenderedPage } from '@/lib/classic-editor/types';

interface PagePreviewPanelProps {
  pages: RenderedPage[];
  currentPage?: number;
  onPageClick?: (pageNumber: number) => void;
  className?: string;
}

export function PagePreviewPanel({
  pages,
  currentPage = 1,
  onPageClick,
  className,
}: PagePreviewPanelProps) {
  const thumbnailRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Auto-scroll to current page thumbnail
  useEffect(() => {
    const thumbnail = thumbnailRefs.current.get(currentPage);
    if (thumbnail) {
      thumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPage]);

  const THUMBNAIL_SCALE = 0.15; // 15% of original size
  const thumbnailWidth = PAGE_WIDTH_PX * THUMBNAIL_SCALE;
  const thumbnailHeight = PAGE_HEIGHT_PX * THUMBNAIL_SCALE;

  return (
    <div
      className={cn(
        'hidden xl:flex flex-col border-l border-border bg-muted/20',
        'w-[200px] flex-shrink-0 relative',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Pages</h3>
        <p className="text-xs text-muted-foreground">{pages.length + 1} pages</p>
      </div>

      {/* Thumbnail scroll area - absolute positioned for proper scroll */}
      <div className="absolute top-[53px] bottom-0 left-0 right-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="p-2 space-y-2">
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              ref={(el) => {
                if (el) thumbnailRefs.current.set(page.pageNumber, el);
              }}
              className={cn(
                'relative cursor-pointer rounded border-2 transition-all',
                'hover:border-primary hover:shadow-md',
                currentPage === page.pageNumber
                  ? 'border-primary shadow-lg ring-2 ring-primary/20'
                  : 'border-border'
              )}
              onClick={() => onPageClick?.(page.pageNumber)}
              style={{
                width: `${thumbnailWidth}px`,
                height: `${thumbnailHeight}px`,
              }}
            >
              {/* Thumbnail content - scaled down version */}
              <div
                className="absolute inset-0 overflow-hidden bg-card"
                style={{
                  transform: `scale(${THUMBNAIL_SCALE})`,
                  transformOrigin: 'top left',
                  width: `${PAGE_WIDTH_PX}px`,
                  height: `${PAGE_HEIGHT_PX}px`,
                }}
              >
                {/* Page number */}
                {page.pageNumber > 1 && (
                  <div className="absolute text-foreground/80 font-mono text-[16px] right-[96px] top-[48px]">
                    {page.pageNumber}.
                  </div>
                )}

                {/* Mini blocks preview - simplified */}
                <div className="p-[144px_96px_48px_144px]">
                  {page.blocks.slice(0, 10).map((block, idx) => (
                    <div
                      key={idx}
                      className="h-[16px] bg-foreground/20 rounded mb-[4px]"
                      style={{
                        width: `${60 + Math.random() * 40}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Page number badge */}
              <div className="absolute bottom-1 right-1 bg-background/90 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {page.pageNumber}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
