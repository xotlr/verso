'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EpisodeRow } from './episode-row';

interface Episode {
  id: string;
  title: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  wordCount: number;
  updatedAt: string;
}

interface SeasonSectionProps {
  seasonNumber: number;
  episodes: Episode[];
  onAddEpisode: (season: number) => void;
  onEditEpisode?: (id: string) => void;
  onDeleteEpisode?: (id: string) => void;
}

export function SeasonSection({
  seasonNumber,
  episodes,
  onAddEpisode,
  onEditEpisode,
  onDeleteEpisode,
}: SeasonSectionProps) {
  // Sort episodes by episode number
  const sortedEpisodes = [...episodes].sort(
    (a, b) => (a.episode || 0) - (b.episode || 0)
  );

  // Calculate total words for the season
  const totalWords = episodes.reduce((sum, ep) => sum + ep.wordCount, 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Season Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Season {seasonNumber}</h3>
          <span className="text-xs text-muted-foreground">
            {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddEpisode(seasonNumber)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

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
            onClick={() => onAddEpisode(seasonNumber)}
            className="ml-1 h-auto p-0"
          >
            Add the first one
          </Button>
        </div>
      )}
    </div>
  );
}
