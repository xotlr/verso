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
import { FilterPill } from '@/components/ui/list-page-toolbar';
import { Badge } from '@/components/ui/badge';
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
    <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
      <PanelSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search scenes..."
      />

      {/* Scene Type Filters - Compact */}
      <div className="flex flex-wrap gap-1">
        <FilterPill
          compact
          active={sceneTypeFilters.has('INT')}
          onClick={() => onToggleSceneType('INT')}
          icon={<Building className="h-3 w-3" />}
          label="INT"
          activeColor="blue"
        />
        <FilterPill
          compact
          active={sceneTypeFilters.has('EXT')}
          onClick={() => onToggleSceneType('EXT')}
          icon={<TreePine className="h-3 w-3" />}
          label="EXT"
          activeColor="green"
        />
        <FilterPill
          compact
          active={sceneTypeFilters.has('INT/EXT')}
          onClick={() => onToggleSceneType('INT/EXT')}
          icon={<Building2 className="h-3 w-3" />}
          label="INT/EXT"
          activeColor="purple"
        />
        <span className="w-px h-4 bg-border/60 mx-0.5" />
        <FilterPill
          compact
          active={timeOfDayFilters.has('DAY')}
          onClick={() => onToggleTimeOfDay('DAY')}
          icon={<Sun className="h-3 w-3" />}
          label="DAY"
          activeColor="yellow"
        />
        <FilterPill
          compact
          active={timeOfDayFilters.has('NIGHT')}
          onClick={() => onToggleTimeOfDay('NIGHT')}
          icon={<Moon className="h-3 w-3" />}
          label="NIGHT"
          activeColor="blue"
        />
        <FilterPill
          compact
          active={timeOfDayFilters.has('DAWN')}
          onClick={() => onToggleTimeOfDay('DAWN')}
          icon={<Sunrise className="h-3 w-3" />}
          label="DAWN"
          activeColor="yellow"
        />
        <FilterPill
          compact
          active={timeOfDayFilters.has('DUSK')}
          onClick={() => onToggleTimeOfDay('DUSK')}
          icon={<Sunset className="h-3 w-3" />}
          label="DUSK"
          activeColor="purple"
        />
        <FilterPill
          compact
          active={timeOfDayFilters.has('CONTINUOUS')}
          onClick={() => onToggleTimeOfDay('CONTINUOUS')}
          icon={<RotateCw className="h-3 w-3" />}
          label="CONTINUOUS"
          activeColor="primary"
        />
      </div>

      {/* Active filter count & clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {activeFilterCount} active
          </Badge>
          <button
            onClick={onClearFilters}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="h-2.5 w-2.5" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
