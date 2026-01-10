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
import { Clock, MoreVertical, Edit3, Pencil, FolderInput, Unlink, Trash2, Layers, Archive } from 'lucide-react';
import { cn, createMenuHandler, stopPointerPropagation } from '@/lib/utils';
import { cardStyles, textStyles, layoutStyles, skeletonStyles, badgeStyles } from '@/lib/ui/styles';
import type { SeriesCardData } from './series-card';

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

interface SeriesListRowProps {
  series: SeriesCardData;
  href?: string;
  // Keep for backwards compatibility but no longer used
  isHovered?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  onEdit?: () => void;
  onRename?: () => void;
  onMoveToProject?: () => void;
  onRemoveFromProject?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function SeriesListRow({
  series,
  href,
  onEdit,
  onRename,
  onMoveToProject,
  onRemoveFromProject,
  onArchive,
  onDelete,
}: SeriesListRowProps) {
  const linkHref = href || `/series/${series.id}`;
  const episodeCount = series._count?.episodes || 0;
  const hasActions = onEdit || onRename || onMoveToProject || onRemoveFromProject || onArchive || onDelete;

  return (
    <div
      className={cn(layoutStyles.groupRow, cardStyles.interactive)}
    >
      <Link href={linkHref} className="flex-1 min-w-0">
        {/* Desktop: Horizontal layout */}
        <div className={layoutStyles.listRow}>
          {/* Left: Type Badge - icon only */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-4 w-4" />
            </span>
          </div>

          {/* Middle: Title & Logline */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(textStyles.boldTitle, 'truncate max-w-full sm:max-w-[300px] md:max-w-[400px]')}>
                {series.title}
              </h3>

              {/* Episode count badge - clean format */}
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-semibold">
                {episodeCount} EP
              </span>
            </div>

            {/* Logline - visible by default */}
            <p className={textStyles.listDescription}>
              {series.logline || "No description"}
            </p>
          </div>

          {/* Right: Metadata badges - hidden on mobile, shown on sm+ */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {/* Genre */}
            {series.genre && (
              <span className={badgeStyles.secondary}>
                {series.genre}
              </span>
            )}

            {/* Format */}
            {series.format && (
              <span className={cn(badgeStyles.secondary, 'hidden md:inline-flex')}>
                {series.format}
              </span>
            )}

            {/* Timestamp */}
            <span className={textStyles.iconTextXs}>
              <Clock className="h-2.5 w-2.5" />
              {formatTimeCompact(new Date(series.updatedAt))}
            </span>
          </div>
        </div>

        {/* Mobile: Metadata row below */}
        <div className={cn(layoutStyles.rowGap2, 'sm:hidden mt-2 flex-wrap ml-10')}>
          {/* Genre */}
          {series.genre && (
            <span className={badgeStyles.secondary}>
              {series.genre}
            </span>
          )}

          {/* Format */}
          {series.format && (
            <span className={badgeStyles.secondary}>
              {series.format}
            </span>
          )}

          {/* Timestamp */}
          <span className={cn(textStyles.iconTextXs, 'ml-auto')}>
            <Clock className="h-2.5 w-2.5" />
            {formatTimeCompact(new Date(series.updatedAt))}
          </span>
        </div>
      </Link>

      {/* Dropdown menu */}
      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={createMenuHandler()}
              onPointerDown={stopPointerPropagation}
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
            {onRename && (
              <DropdownMenuItem onClick={createMenuHandler(onRename)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}
            {(onMoveToProject || onRemoveFromProject) && (onEdit || onRename) && (
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
      )}
    </div>
  );
}

// Skeleton for loading state
export function SeriesListRowSkeleton() {
  return (
    <div className={cn('p-3 sm:p-4', cardStyles.skeleton)}>
      <div className={layoutStyles.listRow}>
        {/* Type badge skeleton */}
        <div className={cn(skeletonStyles.base, 'w-10 h-5 flex-shrink-0')} />

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
