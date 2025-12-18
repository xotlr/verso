'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Tv, Star, Clock, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScreenplayListCardData } from './screenplay-list-card';
import { ScreenplayListCard } from './screenplay-list-card';

// Tab header height (the visible part when stacked)
const TAB_HEIGHT = 32;

// Format time compactly
function formatTimeCompact(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 5) return `${diffWeeks}w`;
  return `${diffMonths}mo`;
}

interface ScreenplayListRowProps {
  screenplay: ScreenplayListCardData;
  href?: string;
  isHovered?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  index?: number;
  totalCount?: number;
}

export function ScreenplayListRow({
  screenplay,
  href,
  isHovered,
  onHover,
  onLeave,
  index = 0,
  totalCount = 1,
}: ScreenplayListRowProps) {
  const linkHref = href || `/screenplay/${screenplay.id}`;
  const isSeries = screenplay.type === 'TV';
  const TypeIcon = isSeries ? Tv : Film;

  return (
    <div
      className={cn(
        "relative transition-all duration-300 ease-out",
        // Heavy overlap - only show tab height of each card (except first)
        index > 0 && `-mt-[calc(100%-${TAB_HEIGHT}px)]`,
        // Hover: pull up to reveal full card
        isHovered && "-translate-y-24 shadow-2xl"
      )}
      style={{ zIndex: isHovered ? 100 : totalCount - index }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Tab Header - Always visible */}
      <Link
        href={linkHref}
        className={cn(
          "flex items-center gap-2 px-3 bg-card border border-border/60 rounded-t-lg",
          "transition-all duration-200",
          // Colored tab indicator
          "border-l-4 border-l-primary",
          isHovered
            ? "bg-accent/50 border-border"
            : "hover:bg-accent/30"
        )}
        style={{ height: `${TAB_HEIGHT}px` }}
      >
        {/* Type Icon */}
        <div className="flex-shrink-0 p-1 rounded bg-primary/10 text-primary">
          <TypeIcon className="h-3.5 w-3.5" />
        </div>

        {/* Title - use episodeTitle for series episodes */}
        <h3 className="flex-1 font-semibold text-sm truncate uppercase tracking-tight">
          {isSeries && screenplay.episodeTitle ? screenplay.episodeTitle : screenplay.title}
        </h3>

        {/* Series info badge */}
        {isSeries && (screenplay.season || screenplay.episode || screenplay.series) && (
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary">
            {screenplay.season && `S${String(screenplay.season).padStart(2, '0')}`}
            {screenplay.episode && `E${String(screenplay.episode).padStart(2, '0')}`}
            {screenplay.series?.title && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="truncate max-w-[80px]">{screenplay.series.title}</span>
              </>
            )}
          </span>
        )}

        {/* Favorite Star */}
        {screenplay.isFavorite && (
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}

        {/* Genre Badge */}
        {screenplay.genre && (
          <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
            {screenplay.genre}
          </span>
        )}

        {/* Project Badge */}
        {screenplay.project && (
          <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
            <Folder className="h-2.5 w-2.5" />
            <span className="truncate max-w-[60px]">{screenplay.project.name}</span>
          </span>
        )}

        {/* Timestamp */}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatTimeCompact(new Date(screenplay.updatedAt))}
        </span>
      </Link>

      {/* Full Card Content - Revealed on hover */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          "border-x border-b border-border/60 rounded-b-lg bg-card",
          isHovered ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 border-b-0"
        )}
      >
        <div className="p-3">
          <ScreenplayListCard screenplay={screenplay} variant="compact" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function ScreenplayListRowSkeleton() {
  return (
    <div
      className="bg-card border border-border/60 rounded-lg border-l-4 border-l-muted animate-pulse"
      style={{ height: `${TAB_HEIGHT}px` }}
    >
      <div className="flex items-center gap-2 px-3 h-full">
        <div className="w-6 h-6 rounded bg-muted" />
        <div className="flex-1 h-4 bg-muted rounded" />
        <div className="w-12 h-3 bg-muted rounded" />
      </div>
    </div>
  );
}
