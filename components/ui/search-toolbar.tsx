'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SearchToolbarProps {
  /** Current search value */
  searchValue: string;
  /** Callback when search value changes */
  onSearchChange: (value: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Filter buttons/dropdowns to render */
  filters?: React.ReactNode;
  /** Right-side action buttons */
  actions?: React.ReactNode;
  /** Number of active filters (shows badge) */
  activeFilterCount?: number;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Additional class names */
  className?: string;
}

export function SearchToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  activeFilterCount = 0,
  onClearFilters,
  className,
}: SearchToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center',
        className
      )}
    >
      {/* Search input */}
      <div className="relative flex-1 min-w-0 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters section */}
      {filters && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters}

          {/* Active filter badge + clear */}
          {activeFilterCount > 0 && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      )}

      {/* Actions section */}
      {actions && (
        <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface FilterToggleButtonProps {
  /** Whether the filter is active */
  active: boolean;
  /** Callback when clicked */
  onClick: () => void;
  /** Icon to display */
  icon: React.ReactNode;
  /** Label text */
  label: string;
  /** Color scheme when active */
  activeColor?: 'yellow' | 'blue' | 'green' | 'purple' | 'primary';
  /** Additional class names */
  className?: string;
}

const colorClasses = {
  yellow: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  green: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  primary: 'bg-primary/20 text-primary border-primary/30',
};

export function FilterToggleButton({
  active,
  onClick,
  icon,
  label,
  activeColor = 'primary',
  className,
}: FilterToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
        active
          ? colorClasses[activeColor]
          : 'bg-muted hover:bg-muted/80 text-muted-foreground border-transparent'
      , className)}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
