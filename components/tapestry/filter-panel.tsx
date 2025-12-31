'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Search, X } from 'lucide-react';
import { TapestryNodeType, NODE_TYPE_COLORS } from '@/types/tapestry';
import { cn } from '@/lib/utils';
import { toolbarStyles, getToolbarButtonClasses } from '@/components/editor/toolbar-styles';

export interface TapestryFilters {
  types: TapestryNodeType[];
  search: string;
  characters: string[];
}

interface FilterPanelProps {
  filters: TapestryFilters;
  onFiltersChange: (filters: TapestryFilters) => void;
  availableCharacters: string[];
}

const NODE_TYPES: Array<{ type: TapestryNodeType; label: string }> = [
  { type: 'scene', label: 'Scenes' },
  { type: 'character', label: 'Characters' },
  { type: 'item', label: 'Items' },
  { type: 'note', label: 'Notes' },
];

export function FilterPanel({
  filters,
  onFiltersChange,
  availableCharacters,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount =
    (NODE_TYPES.length - filters.types.length) +
    (filters.search ? 1 : 0) +
    filters.characters.length;

  const toggleType = (type: TapestryNodeType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const toggleCharacter = (char: string) => {
    const newCharacters = filters.characters.includes(char)
      ? filters.characters.filter(c => c !== char)
      : [...filters.characters, char];
    onFiltersChange({ ...filters, characters: newCharacters });
  };

  const clearFilters = () => {
    onFiltersChange({
      types: NODE_TYPES.map(t => t.type),
      search: '',
      characters: [],
    });
  };

  return (
    <div className="flex items-center gap-1">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="Search..."
          className="h-8 w-36 pl-8 pr-8 text-xs bg-sidebar border-border/50 rounded-lg"
        />
        {filters.search && (
          <button
            onClick={() => onFiltersChange({ ...filters, search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              getToolbarButtonClasses(activeFilterCount > 0, false),
              'relative'
            )}
          >
            <Filter className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span className={cn(toolbarStyles.badge.base, toolbarStyles.badge.size, toolbarStyles.badge.style)}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 rounded-2xl" align="start">
          <div className="space-y-4">
            {/* Node types */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Node Types
                </Label>
                <button
                  onClick={() => onFiltersChange({
                    ...filters,
                    types: filters.types.length === NODE_TYPES.length ? [] : NODE_TYPES.map(t => t.type)
                  })}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {filters.types.length === NODE_TYPES.length ? 'None' : 'All'}
                </button>
              </div>
              <div className="space-y-1.5">
                {NODE_TYPES.map(({ type, label }) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.types.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <Label
                      htmlFor={`type-${type}`}
                      className="text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                      />
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Character filter */}
            {availableCharacters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Filter by Character
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {availableCharacters.slice(0, 10).map((char) => (
                    <div key={char} className="flex items-center gap-2">
                      <Checkbox
                        id={`char-${char}`}
                        checked={filters.characters.includes(char)}
                        onCheckedChange={() => toggleCharacter(char)}
                      />
                      <Label
                        htmlFor={`char-${char}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {char}
                      </Label>
                    </div>
                  ))}
                  {availableCharacters.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      +{availableCharacters.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function createDefaultFilters(): TapestryFilters {
  return {
    types: NODE_TYPES.map(t => t.type),
    search: '',
    characters: [],
  };
}
