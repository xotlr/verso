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
import {
  Clock,
  MoreVertical,
  Trash2,
  Edit3,
  Download,
  Star,
  FolderInput,
  FolderPlus,
  Film,
  Tv,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DisplayScreenplayType } from '@/types/templates';

export interface ScreenplayListCardData {
  id: string;
  title: string;
  logline?: string | null;
  synopsis?: string | null;
  updatedAt: string;
  wordCount?: number;
  genre?: string | null;
  isFavorite?: boolean;
  project?: { id: string; name: string } | null;
  author?: string | null;
  user?: { id: string; name: string | null } | null;
  // Type-specific fields
  type?: DisplayScreenplayType;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
  series?: { id: string; title: string } | null;
}

interface ScreenplayListCardProps {
  screenplay: ScreenplayListCardData;
  variant?: 'default' | 'compact';
  showFavorite?: boolean;
  showGenre?: boolean;
  showProject?: boolean;
  showWordCount?: boolean;
  showType?: boolean;
  href?: string;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onMoveToProject?: () => void;
  onCreateProject?: () => void;
}

// Helper to calculate stacked paper count based on word count
function getStackedPaperCount(wordCount?: number): number {
  if (!wordCount || wordCount < 250) return 0; // < 1 page
  if (wordCount < 2500) return 1; // 2-10 pages
  if (wordCount < 12500) return 2; // 10-50 pages
  return 3; // 50+ pages
}

// Format word count as compact (2.7k instead of 2739) - truncates, doesn't round
function formatWordCount(count: number): string {
  if (count >= 1000) {
    const k = Math.floor((count / 1000) * 10) / 10;
    return `${k.toFixed(1)}k`;
  }
  return count.toString();
}

// Format time as compact (2d, 3h, 5m instead of "2 days ago")
function formatTimeCompact(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 5) return `${diffWeeks}w`;
  if (diffMonths < 12) return `${diffMonths}mo`;
  return `${diffYears}y`;
}

// Type badge component
function TypeBadge({ type }: { type: DisplayScreenplayType }) {
  const isSeries = type === 'TV';
  const Icon = isSeries ? Tv : Film;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20"
    >
      <Icon className="h-2.5 w-2.5" />
      {isSeries ? 'SERIES' : 'FILM'}
    </span>
  );
}

// Series info: season/episode + series title
function SeriesInfo({ season, episode, seriesTitle }: { season?: number | null; episode?: number | null; seriesTitle?: string | null }) {
  if (!season && !episode && !seriesTitle) return null;

  const parts: string[] = [];
  if (season) parts.push(`S${String(season).padStart(2, '0')}`);
  if (episode) parts.push(`E${String(episode).padStart(2, '0')}`);

  return (
    <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
      {parts.length > 0 && (
        <span className="font-semibold text-primary">{parts.join('')}</span>
      )}
      {seriesTitle && (
        <>
          {parts.length > 0 && <span className="text-muted-foreground/50">·</span>}
          <span className="truncate">{seriesTitle}</span>
        </>
      )}
    </div>
  );
}

export function ScreenplayListCard({
  screenplay,
  variant = 'default',
  showFavorite = true,
  showGenre = true,
  showProject = true,
  showWordCount = true,
  showType = true,
  href,
  onEdit,
  onExport,
  onDelete,
  onToggleFavorite,
  onMoveToProject,
  onCreateProject,
}: ScreenplayListCardProps) {
  const linkHref = href || `/screenplay/${screenplay.id}`;
  const displayText = screenplay.logline || screenplay.synopsis;
  const isCompact = variant === 'compact';
  const isSeries = screenplay.type === 'TV';

  const hasActions = onEdit || onExport || onDelete || onToggleFavorite || onMoveToProject || onCreateProject;

  // Get author display name - prefer custom author field, then user name
  const authorName = screenplay.author || screenplay.user?.name;

  // Stacked paper effect based on word count
  const stackedPaperCount = getStackedPaperCount(screenplay.wordCount);

  // Card height classes - increased base height for single column mobile layout
  const cardHeight = isCompact ? 'min-h-[120px] sm:min-h-[140px]' : 'h-[180px] sm:h-[200px] md:h-[220px]';

  // Series cards are more rounded (like a bound book)
  const cardRadius = isSeries ? 'rounded-xl' : 'rounded-lg';

  return (
    <div
      className="group/stack relative transition-all duration-300 ease-out hover:-translate-y-1"
    >
      {/* Stacked paper layers - same size, shifted position, spread on hover */}
      {stackedPaperCount >= 3 && (
        <div
          className={cn(
            'absolute bg-muted border border-border shadow-sm transition-transform duration-300',
            'translate-x-1.5 translate-y-1.5 group-hover/stack:translate-x-3 group-hover/stack:translate-y-3',
            cardRadius,
            cardHeight,
          )}
          style={{ inset: 0 }}
        />
      )}
      {stackedPaperCount >= 2 && (
        <div
          className={cn(
            'absolute bg-muted border border-border shadow-sm transition-transform duration-300',
            'translate-x-1 translate-y-1 group-hover/stack:translate-x-2 group-hover/stack:translate-y-2',
            cardRadius,
            cardHeight,
          )}
          style={{ inset: 0 }}
        />
      )}
      {stackedPaperCount >= 1 && (
        <div
          className={cn(
            'absolute bg-muted border border-border shadow-sm transition-transform duration-300',
            'translate-x-0.5 translate-y-0.5 group-hover/stack:translate-x-1 group-hover/stack:translate-y-1',
            cardRadius,
            cardHeight,
          )}
          style={{ inset: 0 }}
        />
      )}

      {/* Main card */}
      <div
        className={cn(
          'group relative flex flex-col',
          'bg-card',
          cardRadius,
          'border border-border/60',
          // Hover effects
          'hover:border-border',
          'hover:shadow-md',
          'transition-all duration-300 ease-out',
          'touch-manipulation cursor-pointer overflow-hidden',
          cardHeight
        )}
      >

      <Link href={linkHref} className="flex-1 flex flex-col">
        <div className={cn(
          'p-5 sm:p-6 flex flex-col h-full font-mono',
          isCompact && 'p-4'
        )}>
          {/* Header: Type Badge + Title + Menu */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              {/* Type badge and title row */}
              <div className="flex items-center gap-2 mb-1">
                {showType && screenplay.type && (
                  <TypeBadge type={screenplay.type} />
                )}
                {showFavorite && screenplay.isFavorite && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
              </div>

              {/* Title - use episodeTitle for series episodes */}
              <h3
                className={cn(
                  'font-bold uppercase tracking-tight line-clamp-1',
                  'text-foreground group-hover/stack:text-primary group-hover/stack:underline transition-colors',
                  isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg md:text-xl'
                )}
              >
                {isSeries && screenplay.episodeTitle ? screenplay.episodeTitle : screenplay.title}
              </h3>

              {/* Series-specific: Season/Episode + Series Title */}
              {isSeries && (
                <SeriesInfo
                  season={screenplay.season}
                  episode={screenplay.episode}
                  seriesTitle={screenplay.series?.title}
                />
              )}

              {/* Author line */}
              {authorName && (
                <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Written by {authorName}</span>
                  {/* Genre inline for TV to save space */}
                  {showGenre && screenplay.genre && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{screenplay.genre}</span>
                    </>
                  )}
                </div>
              )}

              {/* Genre on its own line for Film (if no author) */}
              {!authorName && showGenre && screenplay.genre && (
                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                  {screenplay.genre}
                </div>
              )}
            </div>

            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="p-2 sm:p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onEdit();
                    }}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onToggleFavorite && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onToggleFavorite();
                    }}>
                      <Star className={cn('mr-2 h-4 w-4', screenplay.isFavorite && 'fill-current')} />
                      {screenplay.isFavorite ? 'Unfavorite' : 'Favorite'}
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onExport();
                    }}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuItem>
                  )}
                  {onMoveToProject && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onMoveToProject();
                    }}>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Move to Project
                    </DropdownMenuItem>
                  )}
                  {onCreateProject && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onCreateProject();
                    }}>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create Project
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDelete();
                        }}
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

          {/* Logline/Synopsis with "LOGLINE:" label */}
          {displayText && !isCompact && (
            <div className="flex-grow">
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground line-clamp-2">
                <span className="font-bold text-foreground mr-1">LOGLINE:</span>
                {displayText}
              </p>
            </div>
          )}
        </div>

        {/* Footer: Edge-to-edge divider */}
        <div className="mt-auto border-t border-border/40">
          <div className={cn(
            'px-5 sm:px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground',
            isCompact && 'px-4'
          )}>
            {/* Left: Project badge and/or word count */}
            <div className="flex items-center gap-2">
              {showProject && screenplay.project && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs truncate max-w-[100px]">
                  <Folder className="h-3 w-3" />
                  {screenplay.project.name}
                </span>
              )}
              {showWordCount && screenplay.wordCount !== undefined && (
                <span className="px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                  {formatWordCount(screenplay.wordCount)}
                </span>
              )}
            </div>

            {/* Right: Timestamp */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTimeCompact(new Date(screenplay.updatedAt))}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Paper corner peel effect - curved */}
      <div
        className={cn(
          'absolute bottom-0 right-0 pointer-events-none',
          'w-0 h-0 bg-primary rounded-tl-xl',
          'transition-all duration-300 ease-out',
          'group-hover:w-5 group-hover:h-5',
        )}
      />
      </div>
    </div>
  );
}

// Skeleton loader for the card
export function ScreenplayListCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact';

  return (
    <div
      suppressHydrationWarning
      className={cn(
        'relative bg-card rounded-lg border border-border/60',
        isCompact ? 'min-h-[120px] sm:min-h-[140px]' : 'h-[180px] sm:h-[200px] md:h-[220px]'
      )}
    >
      <div className={cn('p-5 sm:p-6 flex flex-col h-full font-mono', isCompact && 'p-4')}>
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            {/* Type badge skeleton */}
            <div className="h-4 w-12 bg-muted rounded animate-pulse mb-2" />
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Logline skeleton */}
        {!isCompact && (
          <div className="flex-grow">
            <div className="h-3 w-full bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
          </div>
        )}

        {/* Footer skeleton */}
        <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
