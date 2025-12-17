'use client';

import { cn } from '@/lib/utils';
import { genreOptions } from '@/types/templates';

interface GenrePillSelectProps {
  selected: string[];
  onChange: (genres: string[]) => void;
  maxSelection?: number;
  className?: string;
}

export function GenrePillSelect({
  selected,
  onChange,
  maxSelection = 3,
  className,
}: GenrePillSelectProps) {
  const toggleGenre = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter(g => g !== genre));
    } else if (selected.length < maxSelection) {
      onChange([...selected, genre]);
    }
  };

  const isAtLimit = selected.length >= maxSelection;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Select up to {maxSelection}
        </span>
        <span className={cn(
          'text-sm font-medium tabular-nums',
          isAtLimit ? 'text-blue-500' : 'text-muted-foreground'
        )}>
          {selected.length}/{maxSelection}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {genreOptions.map(genre => {
          const isSelected = selected.includes(genre);
          const isDisabled = !isSelected && isAtLimit;

          return (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              disabled={isDisabled}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full',
                'text-sm font-medium transition-all duration-150',
                'select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  : isDisabled
                    ? 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              )}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );
}
