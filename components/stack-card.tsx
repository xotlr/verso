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
import { Layers, Clock, MoreVertical, Edit3, Trash2, Ungroup } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StackCardData {
  id: string;
  name: string;
  updatedAt: string;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  screenplays?: { id: string; title: string; wordCount?: number }[];
  _count?: { screenplays: number };
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

interface StackCardProps {
  stack: StackCardData;
  href?: string;
  onEdit?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
}

export function StackCard({ stack, href, onEdit, onUngroup, onDelete }: StackCardProps) {
  const linkHref = href || `/stack/${stack.id}`;
  const screenplayCount = stack._count?.screenplays || stack.screenplays?.length || 0;
  const hasActions = onEdit || onUngroup || onDelete;

  // Calculate stack layers based on screenplay count (min 1, max 3)
  const stackLayers = Math.min(Math.max(screenplayCount, 1), 3);

  // Get first few screenplay titles for preview
  const previewTitles = stack.screenplays?.slice(0, 3).map((s) => s.title) || [];

  // Card height - use min-height for responsiveness
  const cardHeight = 'min-h-[180px] sm:min-h-[200px] md:min-h-[220px]';

  return (
    <div className="group/stack relative transition-all duration-300 ease-out hover:-translate-y-1">
      {/* Stacked paper layers - visual indicator of multiple scripts */}
      {stackLayers >= 3 && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-muted border border-border shadow-sm',
            'translate-x-1.5 translate-y-1.5',
            'group-hover/stack:translate-x-3 group-hover/stack:translate-y-3',
            'transition-transform duration-300',
            cardHeight
          )}
        />
      )}
      {stackLayers >= 2 && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-muted border border-border shadow-sm',
            'translate-x-1 translate-y-1',
            'group-hover/stack:translate-x-2 group-hover/stack:translate-y-2',
            'transition-transform duration-300',
            cardHeight
          )}
        />
      )}
      {stackLayers >= 1 && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-muted border border-border shadow-sm',
            'translate-x-0.5 translate-y-0.5',
            'group-hover/stack:translate-x-1 group-hover/stack:translate-y-1',
            'transition-transform duration-300',
            cardHeight
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
          <div className="p-4 sm:p-5 md:p-6 flex flex-col h-full font-mono">
            {/* Header: Type Badge + Title + Menu */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                {/* Type badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-secondary/80 text-secondary-foreground border border-border/40">
                    <Layers className="h-2.5 w-2.5" />
                    STACK
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold uppercase tracking-tight line-clamp-1 text-foreground group-hover/stack:text-primary group-hover/stack:underline transition-colors text-base sm:text-lg md:text-xl">
                  {stack.name}
                </h3>

                {/* Script count and project info */}
                <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="font-semibold">
                    {screenplayCount} {screenplayCount === 1 ? 'Script' : 'Scripts'}
                  </span>
                  {stack.project && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="truncate">{stack.project.name}</span>
                    </>
                  )}
                </div>
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
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onEdit();
                        }}
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                    )}
                    {onUngroup && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onUngroup();
                        }}
                      >
                        <Ungroup className="mr-2 h-4 w-4" />
                        Ungroup
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

            {/* Preview of contained scripts */}
            {previewTitles.length > 0 && (
              <div className="flex-grow">
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground/70">
                  <span className="font-semibold text-muted-foreground mr-1">CONTAINS:</span>
                  <span className="line-clamp-2">
                    {previewTitles.join(', ')}
                    {screenplayCount > 3 && ` +${screenplayCount - 3} more`}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-border/40">
            <div className="px-4 sm:px-5 md:px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              {/* Left: Script count badge */}
              <span className="inline-flex items-center px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                {screenplayCount} scripts
              </span>

              {/* Right: Timestamp */}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeCompact(new Date(stack.updatedAt))}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function StackCardSkeleton() {
  return (
    <div className="relative">
      {/* Shadow layers */}
      <div className="absolute inset-0 rounded-xl bg-muted border border-border translate-x-1 translate-y-1 min-h-[180px] sm:min-h-[200px] md:min-h-[220px]" />
      <div className="absolute inset-0 rounded-xl bg-muted border border-border translate-x-0.5 translate-y-0.5 min-h-[180px] sm:min-h-[200px] md:min-h-[220px]" />

      {/* Main card */}
      <div className="relative bg-card rounded-xl border border-border/60 min-h-[180px] sm:min-h-[200px] md:min-h-[220px] overflow-hidden">
        <div className="p-4 sm:p-5 md:p-6 flex flex-col h-full font-mono">
          {/* Header skeleton */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="h-4 w-16 bg-muted rounded animate-pulse mb-2" />
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="flex-grow">
            <div className="h-3 w-full bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
          </div>

          {/* Footer skeleton */}
          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
