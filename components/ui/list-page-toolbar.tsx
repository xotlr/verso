'use client';

import React from 'react';
import { Search, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============================================================================
// Types
// ============================================================================

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
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
  className,
}: ListPageToolbarProps) {
  const mounted = useMounted();
  const hasSearchBar = search || filters || sort;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4',
        className
      )}
    >
      {/* Tabs - render placeholder during SSR, actual Tabs after mount to avoid hydration mismatch */}
      {tabs && (
        mounted ? (
          <Tabs value={tabs.value} onValueChange={tabs.onChange}>
            <TabsList className="w-full sm:w-auto grid sm:inline-flex" style={{ gridTemplateColumns: `repeat(${tabs.items.length}, 1fr)` }}>
              {tabs.items.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
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
                <button
                  onClick={() => search.onChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
  className,
}: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? colorClasses[activeColor]
          : 'bg-background/50 hover:bg-background/80 text-muted-foreground border border-border/40',
        className
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
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
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'bg-background text-foreground shadow-sm border border-border/40'
          : 'bg-background/50 hover:bg-background/80 text-muted-foreground border border-border/40',
        className
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
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
