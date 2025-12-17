'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tv, Plus, Edit3, Trash2, MoreHorizontal, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SeriesBannerProps {
  series: {
    id: string;
    title: string;
    logline: string | null;
    genre: string | null;
    format: string | null;
    updatedAt: string;
    _count: { episodes: number };
  };
  seasonCount: number;
  onAddEpisode: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SeriesBanner({
  series,
  seasonCount,
  onAddEpisode,
  onEdit,
  onDelete,
}: SeriesBannerProps) {
  // Parse genres from comma-separated string
  const genres = series.genre
    ? series.genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  // Format display
  const formatDisplay = series.format
    ? series.format.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null;

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-muted/60 to-muted/20 border border-border/50 overflow-hidden">
      {/* Content */}
      <div className="relative px-6 sm:px-8 py-8 sm:py-10">
        {/* Top row: Type badge + Actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <Tv className="h-3.5 w-3.5" />
              Series
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Series
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Series
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          {series.title}
        </h1>

        {/* Genre Pills */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {genres.map(genre => (
              <span
                key={genre}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground border border-border/50"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Logline */}
        {series.logline && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-3xl">
            &ldquo;{series.logline}&rdquo;
          </p>
        )}

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
          <span className="font-semibold text-foreground">
            {seasonCount} {seasonCount === 1 ? 'Season' : 'Seasons'}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            {series._count.episodes} {series._count.episodes === 1 ? 'Episode' : 'Episodes'}
          </span>
          {formatDisplay && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{formatDisplay}</span>
            </>
          )}
          <span className="text-muted-foreground/50">·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated {formatDistanceToNow(new Date(series.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={onAddEpisode} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Episode
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit Series
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
