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
import { Tv, Clock, FileText, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SeriesCardData } from './series-card';

// Get border thickness based on episode count
function getThickness(count?: number): string {
  if (!count || count < 1) return 'border-l-2';
  if (count < 5) return 'border-l-[3px]';
  if (count < 10) return 'border-l-4';
  if (count < 20) return 'border-l-[5px]';
  return 'border-l-[6px]';
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

interface SeriesListRowProps {
  series: SeriesCardData;
  href?: string;
  isHovered?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SeriesListRow({
  series,
  href,
  isHovered,
  onHover,
  onLeave,
  onEdit,
  onDelete,
}: SeriesListRowProps) {
  const linkHref = href || `/series/${series.id}`;
  const episodeCount = series._count?.episodes || 0;
  const thickness = getThickness(episodeCount);
  const hasActions = onEdit || onDelete;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3',
        'bg-card border border-border/60 rounded-lg',
        'transition-all duration-150',
        thickness,
        'border-l-blue-500',
        isHovered
          ? 'bg-accent/50 border-border shadow-sm translate-x-1'
          : 'hover:bg-accent/30 hover:border-border/80'
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Link href={linkHref} className="flex items-center gap-3 flex-1 min-w-0">
        {/* TV Icon */}
        <div className="flex-shrink-0 p-1.5 rounded-md bg-blue-500/10 text-blue-500">
          <Tv className="h-4 w-4" />
        </div>

        {/* Title + Logline */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate uppercase tracking-tight">
            {series.title}
          </h3>
          {series.logline && (
            <p className="text-xs text-muted-foreground truncate">
              {series.logline}
            </p>
          )}
        </div>

        {/* Episode Count */}
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <FileText className="h-3 w-3" />
          {episodeCount} {episodeCount === 1 ? 'ep' : 'eps'}
        </span>

        {/* Genre Badge */}
        {series.genre && (
          <Badge variant="secondary" className="hidden md:inline-flex text-[10px]">
            {series.genre}
          </Badge>
        )}

        {/* Format */}
        {series.format && (
          <span className="hidden lg:inline text-xs text-muted-foreground uppercase">
            {series.format}
          </span>
        )}

        {/* Timestamp */}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTimeCompact(new Date(series.updatedAt))}
        </span>
      </Link>

      {/* Dropdown menu */}
      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit();
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
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
  );
}

// Skeleton for loading state
export function SeriesListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-lg border-l-2 border-l-muted animate-pulse">
      <div className="w-8 h-8 rounded-md bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-3 w-56 bg-muted rounded" />
      </div>
      <div className="hidden sm:block h-5 w-16 bg-muted rounded-full" />
      <div className="h-4 w-10 bg-muted rounded" />
    </div>
  );
}
