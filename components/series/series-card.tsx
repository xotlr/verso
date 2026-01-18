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
import { Layers, Clock, MoreVertical, Edit3, Pencil, FolderInput, Unlink, Trash2, Archive, Star } from 'lucide-react';
import { cn, createMenuHandler, stopPointerPropagation } from '@/lib/utils';

export interface SeriesCardData {
  id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  format?: string | null;
  updatedAt: string;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  isArchived?: boolean;
  isFavorite?: boolean;
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
  onRename?: () => void;
  onMoveToProject?: () => void;
  onRemoveFromProject?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

export function SeriesCard({ series, href, onEdit, onRename, onMoveToProject, onRemoveFromProject, onArchive, onDelete, onToggleFavorite }: SeriesCardProps) {
  const linkHref = href || `/series/${series.id}`;
  const episodeCount = series._count?.episodes || 0;
  const seasonCount = estimateSeasonCount(episodeCount);
  const hasActions = onEdit || onRename || onMoveToProject || onRemoveFromProject || onArchive || onDelete || onToggleFavorite;

  // Calculate stack layers based on season count (min 1, max 3)
  const stackLayers = Math.min(Math.max(seasonCount, 1), 3);

  // Card height - responsive sizing, more compact on mobile
  const cardHeight = 'min-h-[100px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px]';

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
        {/* Dropdown Menu - positioned absolutely, OUTSIDE the Link */}
        {hasActions && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={createMenuHandler()}
                  onPointerDown={stopPointerPropagation}
                  className="card-action-btn"
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
                {onToggleFavorite && (
                  <DropdownMenuItem onClick={createMenuHandler(onToggleFavorite)}>
                    <Star className={cn("mr-2 h-4 w-4", series.isFavorite && "text-yellow-500 fill-yellow-500")} />
                    {series.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </DropdownMenuItem>
                )}
                {onRename && (
                  <DropdownMenuItem onClick={createMenuHandler(onRename)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                )}
                {(onMoveToProject || onRemoveFromProject) && (onEdit || onToggleFavorite || onRename) && (
                  <DropdownMenuSeparator />
                )}
                {onMoveToProject && (
                  <DropdownMenuItem onClick={createMenuHandler(onMoveToProject)}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Move to Project
                  </DropdownMenuItem>
                )}
                {onRemoveFromProject && (
                  <DropdownMenuItem onClick={createMenuHandler(onRemoveFromProject)}>
                    <Unlink className="mr-2 h-4 w-4" />
                    Remove from Project
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={createMenuHandler(onArchive)}>
                    <Archive className="mr-2 h-4 w-4" />
                    {series.isArchived ? 'Unarchive' : 'Archive'}
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
          </div>
        )}

        <Link href={linkHref} className="flex-1 flex flex-col">
          <div className="p-2.5 sm:p-4 md:p-5 flex flex-col h-full font-mono">
            {/* Header: Type Badge + Title */}
            <div className={cn('mb-2', hasActions && 'pr-10 sm:pr-8')}>
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-primary">
                  <Layers className="h-2.5 w-2.5" />
                  SERIES
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold uppercase tracking-tight line-clamp-1 text-foreground group-hover/stack:text-primary group-hover/stack:underline transition-colors text-base sm:text-lg md:text-xl flex items-center gap-1.5">
                {series.isFavorite && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
                <span className="truncate">{series.title}</span>
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

            {/* Logline - hidden on tiny screens */}
            {series.logline && (
              <div className="flex-grow hidden sm:block">
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide line-clamp-2">
                  <span className="font-semibold text-muted-foreground mr-1">LOGLINE:</span>
                  {series.logline}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border/40">
            <div className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-3 flex items-center justify-between text-[10px] sm:text-xs md:text-sm text-muted-foreground">
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
      <div className="absolute inset-0 rounded-xl bg-muted border border-border translate-y-1 min-h-[100px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px]" />
      <div className="absolute inset-0 rounded-xl bg-muted border border-border translate-y-0.5 min-h-[100px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px]" />

      {/* Main card */}
      <div className="relative bg-card rounded-xl border border-border/60 min-h-[100px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px]">
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col h-full font-mono">
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
          <div className="card-footer">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
