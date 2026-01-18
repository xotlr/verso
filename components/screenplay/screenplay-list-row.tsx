'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Clock, Folder, Layers, Users } from 'lucide-react';
import { HiOutlineRectangleGroup } from 'react-icons/hi2';
import { PiFilmScript } from 'react-icons/pi';
import { cn } from '@/lib/utils';
import { cardStyles, textStyles, badgeStyles, layoutStyles, skeletonStyles } from '@/lib/ui/styles';
import type { ScreenplayListCardData } from './screenplay-list-card';
import type { DisplayScreenplayType } from '@/types/templates';
import { ItemActionsDropdown } from '@/components/common/item-actions-dropdown';

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
  const Icon = {
    TV: Layers,
    FILM: PiFilmScript,
    STAGE: HiOutlineRectangleGroup,
  }[type] || PiFilmScript;

  return (
    <span className="icon-btn-primary">
      <Icon className="h-4 w-4" />
    </span>
  );
}

interface ScreenplayListRowProps {
  screenplay: ScreenplayListCardData;
  href?: string;
  onEdit?: () => void;
  onRename?: () => void;
  onExport?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onMoveToProject?: () => void;
  onRemoveFromProject?: () => void;
  onCreateProject?: () => void;
  onMoveToTeam?: () => void;
  onRemoveFromTeam?: () => void;
  onAddToStack?: () => void;
  onArchive?: () => void;
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
  onRename,
  onExport,
  onToggleFavorite,
  onDelete,
  onMoveToProject,
  onRemoveFromProject,
  onCreateProject,
  onMoveToTeam,
  onRemoveFromTeam,
  onAddToStack,
  onArchive,
}: ScreenplayListRowProps) {
  const linkHref = href || `/screenplay/${screenplay.id}`;
  const isSeries = screenplay.type === 'TV';
  const displayText = screenplay.logline || screenplay.synopsis;
  const title = isSeries && screenplay.episodeTitle ? screenplay.episodeTitle : screenplay.title;
  const hasActions = onEdit || onRename || onExport || onToggleFavorite || onDelete || onMoveToProject || onRemoveFromProject || onCreateProject || onMoveToTeam || onRemoveFromTeam || onAddToStack || onArchive;

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

          {/* Team */}
          {screenplay.team && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-xs">
              <Users className="h-2.5 w-2.5" />
              <span className="truncate max-w-[60px]">{screenplay.team.name}</span>
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

        {/* Team */}
        {screenplay.team && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-xs">
            <Users className="h-2.5 w-2.5" />
            <span className="truncate max-w-[60px]">{screenplay.team.name}</span>
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
        <ItemActionsDropdown
          resourceId={screenplay.id}
          resourceTitle={title}
          resourceType="screenplay"
          isFavorite={screenplay.isFavorite}
          isArchived={screenplay.isArchived}
          hasProject={!!screenplay.project}
          hasTeam={!!screenplay.team}
          onEdit={onEdit}
          onRename={onRename}
          onExport={onExport}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onMoveToProject={onMoveToProject}
          onRemoveFromProject={onRemoveFromProject}
          onCreateProject={onCreateProject}
          onAddToStack={onAddToStack}
          onMoveToTeam={onMoveToTeam}
          onRemoveFromTeam={onRemoveFromTeam}
          onArchive={onArchive}
        />
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
