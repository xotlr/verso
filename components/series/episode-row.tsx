'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, MoreHorizontal, Edit3, Trash2, ExternalLink } from 'lucide-react';

interface Episode {
  id: string;
  title: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  wordCount: number;
  updatedAt: string;
}

interface EpisodeRowProps {
  episode: Episode;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function EpisodeRow({ episode, onEdit, onDelete }: EpisodeRowProps) {
  const episodeNumber = episode.episode || 1;
  const displayTitle = episode.episodeTitle || episode.title || 'Untitled';

  return (
    <Link
      href={`/screenplay/${episode.id}`}
      className="group flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Episode Number */}
        <span className="text-sm font-mono text-muted-foreground tabular-nums w-10 shrink-0">
          E{String(episodeNumber).padStart(2, '0')}
        </span>

        {/* Title and Meta */}
        <div className="min-w-0">
          <h4 className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
            {displayTitle}
          </h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{episode.wordCount.toLocaleString()} words</span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(episode.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile: Show timestamp */}
        <span className="sm:hidden text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(episode.updatedAt), { addSuffix: false })}
        </span>

        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={e => {
                e.preventDefault();
                window.location.href = `/screenplay/${episode.id}`;
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem
                onClick={e => {
                  e.preventDefault();
                  onEdit(episode.id);
                }}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={e => {
                    e.preventDefault();
                    onDelete(episode.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}
