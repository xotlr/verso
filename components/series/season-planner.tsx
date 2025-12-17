'use client';

import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';

export interface PlannedSeason {
  seasonNumber: number;
  episodeCount: number;
}

interface SeasonPlannerProps {
  seasons: PlannedSeason[];
  onChange: (seasons: PlannedSeason[]) => void;
  className?: string;
}

export function SeasonPlanner({
  seasons,
  onChange,
  className,
}: SeasonPlannerProps) {
  const addSeason = () => {
    const nextSeasonNumber = seasons.length + 1;
    onChange([
      ...seasons,
      { seasonNumber: nextSeasonNumber, episodeCount: 10 },
    ]);
  };

  const removeSeason = (seasonNumber: number) => {
    if (seasons.length <= 1) return;

    const filtered = seasons.filter(s => s.seasonNumber !== seasonNumber);
    // Renumber seasons
    const renumbered = filtered.map((s, i) => ({
      ...s,
      seasonNumber: i + 1,
    }));
    onChange(renumbered);
  };

  const updateEpisodeCount = (seasonNumber: number, episodeCount: number) => {
    onChange(
      seasons.map(s =>
        s.seasonNumber === seasonNumber ? { ...s, episodeCount } : s
      )
    );
  };

  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodeCount, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Season rows */}
      <div className="space-y-2">
        {seasons.map(season => (
          <div
            key={season.seasonNumber}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              'bg-muted/50 border border-border/50',
              'transition-all duration-200'
            )}
          >
            <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">
              Season {season.seasonNumber}
            </span>

            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Episodes</span>
              <NumberInput
                value={season.episodeCount}
                onChange={(count) => updateEpisodeCount(season.seasonNumber, count)}
                min={1}
                max={30}
                className="w-28"
              />
            </div>

            <button
              type="button"
              onClick={() => removeSeason(season.seasonNumber)}
              disabled={seasons.length <= 1}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                seasons.length <= 1 && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Season Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSeason}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Season
      </Button>

      {/* Summary */}
      <p className="text-sm text-muted-foreground text-center">
        {seasons.length} {seasons.length === 1 ? 'season' : 'seasons'}, {totalEpisodes} episodes planned
      </p>
    </div>
  );
}
