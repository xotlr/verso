'use client';

import React from 'react';
import Link from 'next/link';
import { Tv, Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SeriesCardData {
  id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  format?: string | null;
  updatedAt: string;
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

interface SeriesCardProps {
  series: SeriesCardData;
  href?: string;
}

export function SeriesCard({ series, href }: SeriesCardProps) {
  const linkHref = href || `/series/${series.id}`;
  const episodeCount = series._count?.episodes || 0;

  return (
    <Link
      href={linkHref}
      className={cn(
        'group block',
        'bg-card rounded-xl border-2 border-blue-500/20',
        'hover:border-blue-500/40 hover:shadow-md',
        'transition-all duration-300',
        'overflow-hidden'
      )}
    >
      {/* Header with TV icon */}
      <div className="p-4 pb-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Tv className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm uppercase tracking-tight truncate group-hover:text-blue-500 transition-colors">
              {series.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}
              </span>
              {series.genre && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  {series.genre}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logline */}
      {series.logline && (
        <div className="px-4 pt-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            <span className="font-bold text-foreground mr-1">LOGLINE:</span>
            {series.logline}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 mt-2 border-t border-border/40">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {series.format && (
            <span className="uppercase tracking-wide">{series.format}</span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {formatTimeCompact(new Date(series.updatedAt))}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Skeleton for loading state
export function SeriesCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border-2 border-border/40 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="h-3 w-16 bg-muted rounded ml-auto" />
      </div>
    </div>
  );
}
