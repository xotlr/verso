'use client';

import React from 'react';
import {
  X,
  Building,
  TreePine,
  Building2,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelSearch } from './PanelSearch';

interface SceneFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sceneTypeFilters: Set<string>;
  timeOfDayFilters: Set<string>;
  onToggleSceneType: (type: string) => void;
  onToggleTimeOfDay: (time: string) => void;
  onClearFilters: () => void;
}

const SCENE_TYPE_FILTERS = [
  { key: 'INT', icon: Building, label: 'INT' },
  { key: 'EXT', icon: TreePine, label: 'EXT' },
  { key: 'INT/EXT', icon: Building2, label: 'I/E' },
] as const;

const TIME_OF_DAY_FILTERS = [
  { key: 'DAY', icon: Sun, label: 'DAY' },
  { key: 'NIGHT', icon: Moon, label: 'NIGHT' },
  { key: 'DAWN', icon: Sunrise, label: 'DAWN' },
  { key: 'DUSK', icon: Sunset, label: 'DUSK' },
  { key: 'CONTINUOUS', icon: RotateCw, label: 'CONT' },
] as const;

export function SceneFilters({
  searchQuery,
  onSearchChange,
  sceneTypeFilters,
  timeOfDayFilters,
  onToggleSceneType,
  onToggleTimeOfDay,
  onClearFilters,
}: SceneFiltersProps) {
  const activeFilterCount = sceneTypeFilters.size + timeOfDayFilters.size + (searchQuery ? 1 : 0);

  return (
    <div className="px-3 py-2 space-y-2 shrink-0">
      <PanelSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search scenes..."
      />

      {/* Scene Type & Time of Day Filters */}
      <div className="flex flex-wrap gap-1">
        {SCENE_TYPE_FILTERS.map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant={sceneTypeFilters.has(key) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToggleSceneType(key)}
            className="h-7 px-2 text-[10px] gap-1"
          >
            <Icon className="h-3 w-3" />
            {label}
          </Button>
        ))}
        {TIME_OF_DAY_FILTERS.map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant={timeOfDayFilters.has(key) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToggleTimeOfDay(key)}
            className="h-7 px-2 text-[10px] gap-1"
          >
            <Icon className="h-3 w-3" />
            {label}
          </Button>
        ))}
      </div>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-7 px-2 text-[10px] text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
