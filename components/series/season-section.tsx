'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { EpisodeRow } from './episode-row';

interface Episode {
  id: string;
  title: string;
  season?: number | null;
  episode: number | null;
  episodeTitle: string | null;
  wordCount: number;
  updatedAt: string;
  isFavorite?: boolean;
}

interface Season {
  id: string;
  number: number;
  title: string | null;
  description: string | null;
  status: string;
  episodes: Episode[];
  _count: { episodes: number };
}

interface SeasonSectionProps {
  season: Season;
  onAddEpisode: () => void;
  onEditSeason?: () => void;
  onDeleteSeason?: () => void;
  onEditEpisode?: (id: string) => void;
  onDeleteEpisode?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  planning: { label: 'Planning', variant: 'outline' },
  writing: { label: 'Writing', variant: 'secondary' },
  complete: { label: 'Complete', variant: 'default' },
};

export function SeasonSection({
  season,
  onAddEpisode,
  onEditSeason,
  onDeleteSeason,
  onEditEpisode,
  onDeleteEpisode,
}: SeasonSectionProps) {
  // Sort episodes by episode number
  const sortedEpisodes = [...season.episodes].sort(
    (a, b) => (a.episode || 0) - (b.episode || 0)
  );

  // Calculate total words for the season
  const totalWords = season.episodes.reduce((sum, ep) => sum + ep.wordCount, 0);

  const statusInfo = statusConfig[season.status] || statusConfig.planning;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Season Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              Season {season.number}
              {season.title && (
                <span className="text-muted-foreground font-normal ml-1">
                  – {season.title}
                </span>
              )}
            </h3>
            <Badge variant={statusInfo.variant} className="text-xs">
              {statusInfo.label}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {season._count.episodes} {season._count.episodes === 1 ? 'episode' : 'episodes'}
          </span>
          {totalWords > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">
                {totalWords.toLocaleString()} words
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddEpisode}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Episode
          </Button>

          {(onEditSeason || onDeleteSeason) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditSeason && (
                  <DropdownMenuItem onClick={onEditSeason}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Season
                  </DropdownMenuItem>
                )}
                {onDeleteSeason && (
                  <>
                    {onEditSeason && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={onDeleteSeason}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Season
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Season Description (if exists) */}
      {season.description && (
        <div className="px-4 sm:px-5 py-3 border-b border-border/30 bg-muted/10">
          <p className="text-sm text-muted-foreground">{season.description}</p>
        </div>
      )}

      {/* Episode List */}
      {sortedEpisodes.length > 0 ? (
        <div className="divide-y divide-border/40">
          {sortedEpisodes.map(episode => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              onEdit={onEditEpisode}
              onDelete={onDeleteEpisode}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No episodes in this season yet.
          <Button
            variant="link"
            size="sm"
            onClick={onAddEpisode}
            className="ml-1 h-auto p-0"
          >
            Add the first one
          </Button>
        </div>
      )}
    </div>
  );
}
