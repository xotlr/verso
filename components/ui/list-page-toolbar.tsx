'use client';

import React from 'react';
import { Search, X, Clock, LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '@/hooks/use-view-mode';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============================================================================
// Types
// ============================================================================

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  activeIcon?: React.ReactNode;
  count?: number;
}

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ListPageToolbarProps {
  /** Tab configuration */
  tabs?: {
    items: TabItem[];
    value: string;
    onChange: (value: string) => void;
  };
  /** Search configuration */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Filter buttons to render */
  filters?: React.ReactNode;
  /** Sort configuration - renders as buttons instead of dropdown */
  sort?: {
    value: string;
    onChange: (value: string) => void;
    options: SortOption[];
  };
  /** View mode toggle (grid/list) */
  viewMode?: {
    value: ViewMode;
    onChange: (value: ViewMode) => void;
  };
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function ListPageToolbar({
  tabs,
  search,
  filters,
  sort,
  viewMode,
  className,
}: ListPageToolbarProps) {
  const mounted = useMounted();
  const hasSearchBar = search || filters || sort || viewMode;

  return (
    <div
      className={cn(
        'flex flex-row flex-wrap items-start gap-3 sm:gap-4',
        className
      )}
    >
      {/* Tabs - render placeholder during SSR, actual Tabs after mount to avoid hydration mismatch */}
      {tabs && (
        mounted ? (
          <Tabs value={tabs.value} onValueChange={tabs.onChange}>
            <TabsList className="w-auto inline-flex">
              {tabs.items.map((tab) => {
                const isActive = tabs.value === tab.value;
                const icon = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                    {icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.count !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {tab.count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        ) : (
          // Static placeholder during SSR to prevent hydration mismatch
          <div className="w-full sm:w-auto h-10 bg-muted/50 rounded-lg animate-pulse" />
        )
      )}

      {/* Unified Search Bar: Search + Filters + Sort in one container */}
      {hasSearchBar && (
        <div className="flex items-center gap-1 flex-1 sm:flex-none bg-muted/50 rounded-lg p-1 border border-border/50">
          {/* Search */}
          {search && (
            <div className="relative flex-1 min-w-0 sm:flex-none sm:w-[160px] md:w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="text"
                placeholder={search.placeholder || 'Search...'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="h-8 pl-8 pr-8 text-sm border-0 bg-transparent focus:ring-0 focus:border-0 focus:bg-transparent hover:bg-transparent"
              />
              {search.value && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => search.onChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground z-10"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Divider */}
          {search && (filters || sort) && (
            <div className="w-px h-5 bg-border/60 mx-0.5" />
          )}

          {/* Filters */}
          {filters && (
            <div className="flex items-center gap-0.5">
              {filters}
            </div>
          )}

          {/* Divider between filters and sort */}
          {filters && sort && (
            <div className="w-px h-5 bg-border/60 mx-0.5" />
          )}

          {/* Sort Buttons */}
          {sort && (
            <div className="flex items-center gap-0.5">
              {sort.options.map((option) => (
                <SortButton
                  key={option.value}
                  active={sort.value === option.value}
                  onClick={() => sort.onChange(option.value)}
                  icon={option.icon}
                  label={option.label}
                />
              ))}
            </div>
          )}

          {/* Divider before view mode */}
          {(sort || filters || search) && viewMode && (
            <div className="w-px h-5 bg-border/60 mx-0.5" />
          )}

          {/* View Mode Toggle */}
          {viewMode && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => viewMode.onChange('grid')}
                className={cn(
                  'h-8 w-8',
                  viewMode.value === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                title="Grid view"
                aria-label="Grid view"
                aria-pressed={viewMode.value === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => viewMode.onChange('list')}
                className={cn(
                  'h-8 w-8',
                  viewMode.value === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
                title="List view"
                aria-label="List view"
                aria-pressed={viewMode.value === 'list'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Filter Pill Button
// ============================================================================

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor?: 'yellow' | 'blue' | 'green' | 'purple' | 'primary';
  /** Compact mode: icon-only with tooltip */
  compact?: boolean;
  className?: string;
}

const colorClasses = {
  yellow: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/20 text-green-600 dark:text-green-400',
  purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  primary: 'bg-primary/20 text-primary',
};

export function FilterPill({
  active,
  onClick,
  icon,
  label,
  activeColor = 'primary',
  compact = false,
  className,
}: FilterPillProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={compact ? label : undefined}
      className={cn(
        'whitespace-nowrap',
        compact ? 'gap-0 px-1.5 h-7' : 'gap-1.5 px-2.5',
        active
          ? colorClasses[activeColor]
          : 'bg-background/50 hover:bg-background/80 text-muted-foreground border border-border/40',
        className
      )}
    >
      {icon}
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </Button>
  );
}

// ============================================================================
// Sort Button
// ============================================================================

interface SortButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  className?: string;
}

export function SortButton({
  active,
  onClick,
  icon,
  label,
  className,
}: SortButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'gap-1.5 px-2.5 whitespace-nowrap',
        active
          ? 'bg-background text-foreground shadow-sm border border-border/40'
          : 'bg-background/50 hover:bg-background/80 text-muted-foreground border border-border/40',
        className
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

// ============================================================================
// Common Sort Options
// ============================================================================

export const SORT_OPTIONS = {
  recent: { value: 'recent', label: 'Recent', icon: <Clock className="h-4 w-4" /> },
  name: { value: 'name', label: 'A-Z' },
  nameDesc: { value: 'nameDesc', label: 'Z-A' },
  words: { value: 'words', label: 'Words' },
  oldest: { value: 'oldest', label: 'Oldest' },
} as const;
