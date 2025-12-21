'use client';

import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Layers, Clock, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { cn, createMenuHandler } from '@/lib/utils';

export interface SeriesCardData {
  id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  format?: string | null;
  updatedAt: string;
  _count?: { episodes: number };
}

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

// Calculate number of seasons based on episode count (rough estimate)
function estimateSeasonCount(episodeCount: number): number {
  if (episodeCount === 0) return 1;
  if (episodeCount <= 10) return 1;
  if (episodeCount <= 22) return 2;
  if (episodeCount <= 35) return 3;
  return Math.min(Math.ceil(episodeCount / 12), 5);
}

interface SeriesCardProps {
  series: SeriesCardData;
  href?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SeriesCard({ series, href, onEdit, onDelete }: SeriesCardProps) {
  const linkHref = href || `/series/${series.id}`;
  const episodeCount = series._count?.episodes || 0;
  const seasonCount = estimateSeasonCount(episodeCount);
  const hasActions = onEdit || onDelete;

  // Calculate stack layers based on season count (min 1, max 3)
  const stackLayers = Math.min(Math.max(seasonCount, 1), 3);

  // Card height - use min-h so card can grow to fit content on mobile
  const cardHeight = 'min-h-[180px] sm:min-h-[200px] md:min-h-[220px]';

  return (
    <div className="group/stack relative transition-all duration-300 ease-out hover:-translate-y-1">
      {/* Stacked paper layers - vertical only (like a bound book) */}
      {/* Use inset-0 to match main card height, no explicit cardHeight */}
      {stackLayers >= 3 && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-muted border border-border shadow-sm',
            'translate-y-[3px] sm:translate-y-1.5',
            'group-hover/stack:translate-y-3 sm:group-hover/stack:translate-y-6',
            'transition-transform duration-300'
          )}
        />
      )}
      {stackLayers >= 2 && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-muted border border-border shadow-sm',
            'translate-y-[2px] sm:translate-y-1',
            'group-hover/stack:translate-y-2 sm:group-hover/stack:translate-y-4',
            'transition-transform duration-300'
          )}
        />
      )}
      {stackLayers >= 1 && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-muted border border-border shadow-sm',
            'translate-y-px sm:translate-y-0.5',
            'group-hover/stack:translate-y-1 sm:group-hover/stack:translate-y-2.5',
            'transition-transform duration-300'
          )}
        />
      )}

      {/* Main card */}
      <div
        className={cn(
          'group relative flex flex-col',
          'bg-card rounded-xl',
          'border border-border/60',
          'hover:border-border hover:shadow-md',
          'transition-all duration-300 ease-out',
          'touch-manipulation cursor-pointer overflow-hidden',
          cardHeight
        )}
      >
        <Link href={linkHref} className="flex-1 flex flex-col">
          <div className="p-5 sm:p-6 flex flex-col h-full font-mono">
            {/* Header: Type Badge + Title + Menu */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                {/* Type badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    <Layers className="h-2.5 w-2.5" />
                    SERIES
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold uppercase tracking-tight line-clamp-1 text-foreground group-hover/stack:text-primary group-hover/stack:underline transition-colors text-base sm:text-lg md:text-xl">
                  {series.title}
                </h3>

                {/* Season/Episode info - compact on mobile */}
                <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="font-semibold">
                    <span className="sm:hidden">S{seasonCount}</span>
                    <span className="hidden sm:inline">{seasonCount} {seasonCount === 1 ? 'Season' : 'Seasons'}</span>
                  </span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>
                    <span className="sm:hidden">{episodeCount} EPs</span>
                    <span className="hidden sm:inline">{episodeCount} {episodeCount === 1 ? 'Episode' : 'Episodes'}</span>
                  </span>
                  {series.genre && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{series.genre}</span>
                    </>
                  )}
                </div>
              </div>

              {hasActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={createMenuHandler()}
                      className="p-2 sm:p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={createMenuHandler(onEdit)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={createMenuHandler(onDelete)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Logline */}
            {series.logline && (
              <div className="flex-grow">
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  <span className="font-bold text-foreground mr-1">LOGLINE:</span>
                  {series.logline}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border/40">
            <div className="px-5 sm:px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              {/* Left: Episode count badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                {episodeCount} eps
              </span>

              {/* Right: Timestamp */}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeCompact(new Date(series.updatedAt))}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function SeriesCardSkeleton() {
  return (
    <div className="relative">
      {/* Shadow layers - vertical only */}
      <div className="absolute inset-0 rounded-xl bg-muted border border-border translate-y-1 min-h-[180px] sm:min-h-[200px] md:min-h-[220px]" />
      <div className="absolute inset-0 rounded-xl bg-muted border border-border translate-y-0.5 min-h-[180px] sm:min-h-[200px] md:min-h-[220px]" />

      {/* Main card */}
      <div className="relative bg-card rounded-xl border border-border/60 min-h-[180px] sm:min-h-[200px] md:min-h-[220px]">
        <div className="p-5 sm:p-6 flex flex-col h-full font-mono">
          {/* Header skeleton */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="h-4 w-16 bg-muted rounded animate-pulse mb-2" />
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Logline skeleton */}
          <div className="flex-grow">
            <div className="h-3 w-full bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
          </div>

          {/* Footer skeleton */}
          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
