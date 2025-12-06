'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface ScreenplayListCardProps {
  screenplay: ScreenplayListCardData;
  variant?: 'default' | 'compact';
  showFavorite?: boolean;
  showGenre?: boolean;
  showProject?: boolean;
  showWordCount?: boolean;
  href?: string;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onMoveToProject?: () => void;
}

export function ScreenplayListCard({
  screenplay,
  variant = 'default',
  showFavorite = true,
  showGenre = true,
  showProject = true,
  showWordCount = true,
  href,
  onEdit,
  onExport,
  onDelete,
  onToggleFavorite,
  onMoveToProject,
}: ScreenplayListCardProps) {
  const linkHref = href || `/screenplay/${screenplay.id}`;
  const displayText = screenplay.logline || screenplay.synopsis;
  const isCompact = variant === 'compact';

  const hasActions = onEdit || onExport || onDelete || onToggleFavorite || onMoveToProject;

  // Get author display name - prefer custom author field, then user name
  const authorName = screenplay.author || screenplay.user?.name;

  return (
    <div
      className={cn(
        'group relative flex flex-col',
        'bg-card',
        'rounded-lg border border-border/60',
        // Hover effects
        'hover:border-border',
        'hover:-translate-y-1 hover:shadow-md',
        'transition-all duration-300 ease-out',
        'touch-manipulation cursor-pointer overflow-hidden',
        isCompact ? 'min-h-[100px] sm:min-h-[120px]' : 'h-[160px] sm:h-[180px] md:h-[200px]'
      )}
    >

      <Link href={linkHref} className="flex-1 flex flex-col">
        <div className={cn(
          'p-4 sm:p-5 flex flex-col h-full font-mono',
          isCompact && 'p-3'
        )}>
          {/* Header: Title + Menu */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    'font-bold uppercase tracking-tight line-clamp-1',
                    'text-foreground',
                    'group-hover:underline decoration-muted-foreground underline-offset-4',
                    isCompact ? 'text-sm' : 'text-sm sm:text-base'
                  )}
                >
                  {screenplay.title}
                </h3>
                {showFavorite && screenplay.isFavorite && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                )}
              </div>
              {/* Author line */}
              {authorName && (
                <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                  Written by {authorName}
                </div>
              )}
              {/* Subtitle: Genre only */}
              {showGenre && screenplay.genre && (
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
                    className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onToggleFavorite && (
                    <DropdownMenuItem onClick={onToggleFavorite}>
                      <Star className={cn('mr-2 h-4 w-4', screenplay.isFavorite && 'fill-current')} />
                      {screenplay.isFavorite ? 'Unfavorite' : 'Favorite'}
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={onExport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuItem>
                  )}
                  {onMoveToProject && (
                    <DropdownMenuItem onClick={onMoveToProject}>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Move to Project
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
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
              <p className="text-[12px] sm:text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
                <span className="font-bold text-foreground mr-1">LOGLINE:</span>
                {displayText}
              </p>
            </div>
          )}

          {/* Footer: Badge + Timestamp */}
          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            {/* Left: Project badge or word count badge */}
            <div className="flex items-center gap-2">
              {showProject && screenplay.project && (
                <span className="px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] truncate max-w-[100px]">
                  {screenplay.project.name}
                </span>
              )}
              {!screenplay.project && showWordCount && screenplay.wordCount !== undefined && (
                <span className="px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px]">
                  {screenplay.wordCount.toLocaleString()} words
                </span>
              )}
            </div>

            {/* Right: Timestamp */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span className="truncate">
                {formatDistanceToNow(new Date(screenplay.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Paper corner fold effect - reveals primary on hover */}
      <div
        className={cn(
          'absolute bottom-0 right-0 pointer-events-none',
          'w-0 h-0',
          'border-l-[0px] border-l-transparent',
          'border-b-[0px] border-b-primary',
          'transition-all duration-300 ease-out',
          'group-hover:w-0 group-hover:h-0',
          'group-hover:border-l-[28px] group-hover:border-b-[28px]'
        )}
      />
      {/* Fold crease shadow */}
      <div
        className={cn(
          'absolute bottom-0 right-0 pointer-events-none',
          'w-0 h-0',
          'opacity-0 group-hover:opacity-100',
          'transition-all duration-300 ease-out',
          'group-hover:w-[40px] group-hover:h-[40px]'
        )}
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.08) 50%)',
        }}
      />
    </div>
  );
}

// Skeleton loader for the card
export function ScreenplayListCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'relative bg-card rounded-lg border border-border/60',
        isCompact ? 'min-h-[100px] sm:min-h-[120px]' : 'h-[160px] sm:h-[180px] md:h-[200px]'
      )}
    >
      <div className={cn('p-4 sm:p-5 flex flex-col h-full font-mono', isCompact && 'p-3')}>
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
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
