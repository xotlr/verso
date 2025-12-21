'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Clock, Folder, Layers, MoreVertical, Edit3, Download, Trash2 } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, createMenuHandler } from '@/lib/utils';
import { cardStyles, textStyles, badgeStyles, layoutStyles, skeletonStyles } from '@/lib/styles';
import type { ScreenplayListCardData } from './screenplay-list-card';
import type { DisplayScreenplayType } from '@/types/templates';

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

// Format word count as compact
function formatWordCount(count: number): string {
  if (count >= 1000) {
    const k = Math.floor((count / 1000) * 10) / 10;
    return `${k.toFixed(1)}k`;
  }
  return count.toString();
}

// Type badge component - icon only, larger
function TypeBadge({ type }: { type: DisplayScreenplayType }) {
  const isSeries = type === 'TV';
  const Icon = isSeries ? Layers : PiFilmScript;

  return (
    <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20">
      <Icon className="h-4 w-4" />
    </span>
  );
}

interface ScreenplayListRowProps {
  screenplay: ScreenplayListCardData;
  href?: string;
  onEdit?: () => void;
  onExport?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  // Keep these for backwards compatibility but they're no longer used
  isHovered?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  index?: number;
  totalCount?: number;
}

export function ScreenplayListRow({
  screenplay,
  href,
  onEdit,
  onExport,
  onToggleFavorite,
  onDelete,
}: ScreenplayListRowProps) {
  const linkHref = href || `/screenplay/${screenplay.id}`;
  const isSeries = screenplay.type === 'TV';
  const displayText = screenplay.logline || screenplay.synopsis;
  const title = isSeries && screenplay.episodeTitle ? screenplay.episodeTitle : screenplay.title;
  const hasActions = onEdit || onExport || onToggleFavorite || onDelete;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 p-3 sm:p-4",
        cardStyles.interactive,
        "touch-manipulation"
      )}
    >
      <Link href={linkHref} className="flex-1 min-w-0">
      {/* Desktop: Horizontal layout */}
      <div className={layoutStyles.listRow}>
        {/* Left: Type Badge */}
        <div className="flex-shrink-0 pt-0.5">
          {screenplay.type && <TypeBadge type={screenplay.type} />}
        </div>

        {/* Middle: Title & Logline */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className={cn(layoutStyles.rowGap2, 'flex-wrap')}>
            <h3 className={cn(textStyles.boldTitle, 'truncate max-w-full sm:max-w-[300px] md:max-w-[400px]')}>
              {title}
            </h3>

            {/* Favorite star */}
            {screenplay.isFavorite && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}

            {/* Series info badge */}
            {isSeries && (screenplay.season || screenplay.episode) && (
              <span className={badgeStyles.inline}>
                {screenplay.season && `S${String(screenplay.season).padStart(2, '0')}`}
                {screenplay.episode && `E${String(screenplay.episode).padStart(2, '0')}`}
              </span>
            )}

            {/* Series title */}
            {isSeries && screenplay.series?.title && (
              <span className="hidden sm:inline text-[10px] text-muted-foreground truncate max-w-[100px]">
                {screenplay.series.title}
              </span>
            )}
          </div>

          {/* Logline - visible by default */}
          <p className={textStyles.listDescription}>
            {displayText || "No description"}
          </p>
        </div>

        {/* Right: Metadata badges - hidden on mobile, shown on sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {/* Genre */}
          {screenplay.genre && (
            <span className={badgeStyles.secondary}>
              {screenplay.genre}
            </span>
          )}

          {/* Project */}
          {screenplay.project && (
            <span className={cn(badgeStyles.secondary, 'hidden md:inline-flex items-center gap-1')}>
              <Folder className="h-2.5 w-2.5" />
              <span className="truncate max-w-[60px]">{screenplay.project.name}</span>
            </span>
          )}

          {/* Word count */}
          {screenplay.wordCount !== undefined && screenplay.wordCount > 0 && (
            <span className={badgeStyles.secondary}>
              {formatWordCount(screenplay.wordCount)}
            </span>
          )}

          {/* Timestamp */}
          <span className={textStyles.iconTextXs}>
            <Clock className="h-2.5 w-2.5" />
            {formatTimeCompact(new Date(screenplay.updatedAt))}
          </span>
        </div>
      </div>

      {/* Mobile: Metadata row below */}
      <div className={cn(layoutStyles.rowGap2, 'sm:hidden mt-2 flex-wrap')}>
        {/* Genre */}
        {screenplay.genre && (
          <span className={badgeStyles.secondary}>
            {screenplay.genre}
          </span>
        )}

        {/* Project */}
        {screenplay.project && (
          <span className={cn(badgeStyles.secondary, 'inline-flex items-center gap-1')}>
            <Folder className="h-2.5 w-2.5" />
            <span className="truncate max-w-[60px]">{screenplay.project.name}</span>
          </span>
        )}

        {/* Word count */}
        {screenplay.wordCount !== undefined && screenplay.wordCount > 0 && (
          <span className={badgeStyles.secondary}>
            {formatWordCount(screenplay.wordCount)}
          </span>
        )}

        {/* Timestamp */}
        <span className={cn(textStyles.iconTextXs, 'ml-auto')}>
          <Clock className="h-2.5 w-2.5" />
          {formatTimeCompact(new Date(screenplay.updatedAt))}
        </span>
      </div>
      </Link>

      {/* Dropdown Menu */}
      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={createMenuHandler()}
              className="p-2 sm:p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center flex-shrink-0"
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
                <Star className={cn("mr-2 h-4 w-4", screenplay.isFavorite && "fill-yellow-500 text-yellow-500")} />
                {screenplay.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem onClick={createMenuHandler(onExport)}>
                <Download className="mr-2 h-4 w-4" />
                Export
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
  );
}

// Skeleton for loading state
export function ScreenplayListRowSkeleton() {
  return (
    <div className={cn('p-3 sm:p-4', cardStyles.skeleton)}>
      <div className={layoutStyles.listRow}>
        {/* Type badge skeleton */}
        <div className={cn(skeletonStyles.base, 'w-12 h-5 flex-shrink-0')} />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          <div className={cn(skeletonStyles.text3_4, 'mb-2')} />
          <div className={skeletonStyles.textFull} />
        </div>

        {/* Metadata skeleton */}
        <div className="hidden sm:flex items-center gap-2">
          <div className={cn(skeletonStyles.base, 'h-5 w-16')} />
          <div className={cn(skeletonStyles.base, 'h-5 w-12')} />
        </div>
      </div>
    </div>
  );
}
