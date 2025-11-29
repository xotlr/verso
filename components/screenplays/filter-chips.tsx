'use client';

import { Star, Clock, FileText, FolderOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface Filters {
  favorites: boolean;
  recent: boolean;
  standalone: boolean;
  hasProject: boolean;
  genre: string | null;
}

interface FilterChipsProps {
  filters: Filters;
  genres: string[];
  onChange: (filters: Filters) => void;
}

export function FilterChips({ filters, genres, onChange }: FilterChipsProps) {
  const toggleFilter = (key: keyof Omit<Filters, 'genre'>) => {
    onChange({ ...filters, [key]: !filters[key] });
  };

  const setGenre = (genre: string | null) => {
    onChange({ ...filters, genre });
  };

  const clearFilters = () => {
    onChange({
      favorites: false,
      recent: false,
      standalone: false,
      hasProject: false,
      genre: null,
    });
  };

  const hasActiveFilters =
    filters.favorites ||
    filters.recent ||
    filters.standalone ||
    filters.hasProject ||
    filters.genre;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Fixed filter chips */}
      <button
        onClick={() => toggleFilter('favorites')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          filters.favorites
            ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        )}
      >
        <Star className={cn('h-3.5 w-3.5', filters.favorites && 'fill-current')} />
        Favorites
      </button>

      <button
        onClick={() => toggleFilter('recent')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          filters.recent
            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        Recent
      </button>

      <button
        onClick={() => toggleFilter('standalone')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          filters.standalone
            ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        Standalone
      </button>

      <button
        onClick={() => toggleFilter('hasProject')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          filters.hasProject
            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
        )}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        In Project
      </button>

      {/* Dynamic genre chips */}
      {genres.length > 0 && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setGenre(filters.genre === genre ? null : genre)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filters.genre === genre
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {genre}
            </button>
          ))}
        </>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
