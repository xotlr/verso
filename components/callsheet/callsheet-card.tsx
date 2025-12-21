'use client';

import React from 'react';
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
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react';
import { PiClipboard } from 'react-icons/pi';
import { cn, createMenuHandler } from '@/lib/utils';
import { CallsheetStatus, CALLSHEET_STATUS_CONFIG, CallsheetCardData } from '@/types/callsheet';

export interface CallsheetCardProps {
  callsheet: CallsheetCardData;
  variant?: 'default' | 'compact';
  onView?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

// Format date for display
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format time for display
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format relative time
function formatTimeCompact(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 5) return `${diffWeeks}w`;
  return `${diffMonths}mo`;
}

// Status badge component
function StatusBadge({ status }: { status: CallsheetStatus }) {
  const config = CALLSHEET_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
        config.bg,
        config.text,
        config.border
      )}
    >
      {config.label}
    </span>
  );
}

export function CallsheetCard({
  callsheet,
  variant = 'default',
  onView,
  onEdit,
  onExport,
  onDelete,
}: CallsheetCardProps) {
  const isCompact = variant === 'compact';
  const hasActions = onView || onEdit || onExport || onDelete;

  // Determine if date is in past, today, or future
  const shootDate = new Date(callsheet.shootDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  shootDate.setHours(0, 0, 0, 0);
  const isPast = shootDate < today;
  const isToday = shootDate.getTime() === today.getTime();

  // Card height
  const cardHeight = isCompact ? 'min-h-[120px] sm:min-h-[140px]' : 'min-h-[160px] sm:min-h-[180px]';

  return (
    <div
      className="group/card relative transition-all duration-300 ease-out hover:-translate-y-1"
    >
      <div
        className={cn(
          'group relative flex flex-col',
          'bg-card rounded-lg border border-border/60',
          'hover:border-border hover:shadow-md',
          'transition-all duration-300 ease-out',
          'touch-manipulation cursor-pointer overflow-hidden',
          cardHeight,
          isPast && 'opacity-75'
        )}
        onClick={onView}
      >
        <div
          className={cn(
            'p-4 sm:p-5 flex flex-col h-full',
            isCompact && 'p-3 sm:p-4'
          )}
        >
          {/* Header: Icon + Title + Status + Menu */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              {/* Status badge row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  <PiClipboard className="h-2.5 w-2.5" />
                  Callsheet
                </span>
                <StatusBadge status={callsheet.status} />
                {isToday && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 dark:text-orange-400">
                    Today
                  </span>
                )}
              </div>

              {/* Title */}
              <h3
                className={cn(
                  'font-bold uppercase tracking-tight line-clamp-1',
                  'text-foreground group-hover/card:text-primary transition-colors',
                  isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
                )}
              >
                {callsheet.title}
              </h3>

              {/* Date and Time */}
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground uppercase tracking-wide">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(callsheet.shootDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(callsheet.callTime)}
                </span>
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
                  {onView && (
                    <DropdownMenuItem onClick={createMenuHandler(onView)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={createMenuHandler(onEdit)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
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

          {/* Location & Weather */}
          {!isCompact && (callsheet.primaryLocation || callsheet.weatherForecast) && (
            <div className="flex-grow">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {callsheet.primaryLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{callsheet.primaryLocation}</span>
                  </span>
                )}
                {callsheet.weatherForecast && (
                  <span className="truncate max-w-[120px]">
                    {callsheet.weatherForecast}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-border/40">
          <div
            className={cn(
              'px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs text-muted-foreground',
              isCompact && 'px-3 sm:px-4'
            )}
          >
            <span className="text-[10px] uppercase tracking-wider">
              Updated {formatTimeCompact(new Date(callsheet.updatedAt))} ago
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader
export function CallsheetCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact';

  return (
    <div
      suppressHydrationWarning
      className={cn(
        'relative bg-card rounded-lg border border-border/60',
        isCompact ? 'min-h-[120px] sm:min-h-[140px]' : 'min-h-[160px] sm:min-h-[180px]'
      )}
    >
      <div className={cn('p-4 sm:p-5 flex flex-col h-full', isCompact && 'p-3 sm:p-4')}>
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex gap-2 mb-2">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Content skeleton */}
        {!isCompact && (
          <div className="flex-grow">
            <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
          </div>
        )}

        {/* Footer skeleton */}
        <div className="mt-auto pt-2.5 border-t border-border/40">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
