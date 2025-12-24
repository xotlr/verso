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
import { Clock, MoreVertical, Edit3, Trash2, Folder } from 'lucide-react';
import { HiRectangleGroup, HiOutlineRectangleGroup } from 'react-icons/hi2';
import { cn, createMenuHandler } from '@/lib/utils';
import { cardStyles, textStyles, layoutStyles, skeletonStyles } from '@/lib/ui/styles';
import type { StackCardData } from '@/components/stack-card';

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

interface StackListRowProps {
  stack: StackCardData;
  href?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
}

export function StackListRow({
  stack,
  href,
  onClick,
  onEdit,
  onUngroup,
  onDelete,
}: StackListRowProps) {
  const linkHref = href || '#';
  const screenplayCount = stack._count?.screenplays || stack.screenplays?.length || 0;
  const hasActions = onEdit || onUngroup || onDelete;

  // Get first few screenplay titles for preview
  const previewTitles = stack.screenplays?.slice(0, 2).map((s) => s.title) || [];

  const content = (
    <>
      {/* Desktop: Horizontal layout */}
      <div className={layoutStyles.listRow}>
        {/* Left: Type Badge - icon only */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <HiRectangleGroup className="h-4 w-4" />
          </span>
        </div>

        {/* Middle: Title & Description */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn(textStyles.boldTitle, 'truncate max-w-full sm:max-w-[300px] md:max-w-[400px]')}>
              {stack.name}
            </h3>

            {/* Script count badge */}
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-semibold">
              {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
            </span>
          </div>

          {/* Preview of contained scripts */}
          <p className={textStyles.listDescription}>
            {previewTitles.length > 0
              ? previewTitles.join(', ') + (screenplayCount > 2 ? ` +${screenplayCount - 2} more` : '')
              : 'Empty stack'}
          </p>
        </div>

        {/* Right: Metadata badges - hidden on mobile, shown on sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {/* Project */}
          {stack.project && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-medium">
              <Folder className="h-2.5 w-2.5" />
              <span className="truncate max-w-[60px]">{stack.project.name}</span>
            </span>
          )}

          {/* Timestamp */}
          <span className={textStyles.iconTextXs}>
            <Clock className="h-2.5 w-2.5" />
            {formatTimeCompact(new Date(stack.updatedAt))}
          </span>
        </div>
      </div>

      {/* Mobile: Metadata row below */}
      <div className={cn(layoutStyles.rowGap2, 'sm:hidden mt-2 flex-wrap ml-10')}>
        {/* Project */}
        {stack.project && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-medium">
            <Folder className="h-2.5 w-2.5" />
            <span className="truncate max-w-[60px]">{stack.project.name}</span>
          </span>
        )}

        {/* Timestamp */}
        <span className={cn(textStyles.iconTextXs, 'ml-auto')}>
          <Clock className="h-2.5 w-2.5" />
          {formatTimeCompact(new Date(stack.updatedAt))}
        </span>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        layoutStyles.groupRow,
        cardStyles.interactive,
        "flex items-center gap-2"
      )}
    >
      {onClick ? (
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          {content}
        </button>
      ) : (
        <Link href={linkHref} className="flex-1 min-w-0">
          {content}
        </Link>
      )}

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
                Rename
              </DropdownMenuItem>
            )}
            {onUngroup && (
              <DropdownMenuItem onClick={createMenuHandler(onUngroup)}>
                <HiOutlineRectangleGroup className="mr-2 h-4 w-4" />
                Ungroup
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
export function StackListRowSkeleton() {
  return (
    <div className={cn('p-3 sm:p-4', cardStyles.skeleton)}>
      <div className={layoutStyles.listRow}>
        {/* Type badge skeleton */}
        <div className={cn(skeletonStyles.base, 'w-8 h-8 rounded-lg flex-shrink-0')} />

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
