'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Definition for a filter that can be applied to items.
 * Each filter has a key (e.g., 'sceneType', 'timeOfDay') and a predicate
 * that tests if an item matches a specific filter value.
 */
export interface FilterDefinition<T> {
  /** Unique key for this filter (e.g., 'sceneType', 'role') */
  key: string;
  /** Function to test if item matches the filter value */
  predicate: (item: T, value: string) => boolean;
}

export interface UsePanelFiltersOptions<T> {
  /** Array of items to filter */
  items: T[];
  /** Field to search, or function to extract searchable text */
  searchField: keyof T | ((item: T) => string);
  /** Optional filter definitions for categorical filtering */
  filters?: FilterDefinition<T>[];
  /** Initial filter values (optional) */
  initialFilters?: Record<string, Set<string>>;
}

export interface UsePanelFiltersReturn<T> {
  /** Current search query */
  searchQuery: string;
  /** Update search query */
  setSearchQuery: (query: string) => void;
  /** Current filter sets by filter key */
  filterSets: Record<string, Set<string>>;
  /** Toggle a filter value on/off */
  toggleFilter: (filterKey: string, value: string) => void;
  /** Set all values for a specific filter */
  setFilter: (filterKey: string, values: Set<string>) => void;
  /** Clear all filters and search */
  clearFilters: () => void;
  /** Number of active filters (including search) */
  activeFilterCount: number;
  /** Filtered items after applying search and filters */
  filteredItems: T[];
  /** Check if any filters are active */
  hasActiveFilters: boolean;
}

/**
 * Generic hook for panel filtering with search and categorical filters.
 * Replaces duplicate filter logic in ScenesPanel, CharactersPanel, ShotlistPanel, NotesPanel.
 *
 * @example
 * ```tsx
 * const { searchQuery, setSearchQuery, filterSets, toggleFilter, filteredItems } =
 *   usePanelFilters({
 *     items: scenes,
 *     searchField: (s) => `${s.location} ${s.type}`,
 *     filters: [
 *       { key: 'sceneType', predicate: (s, val) => s.type.toUpperCase() === val },
 *       { key: 'timeOfDay', predicate: (s, val) => s.timeOfDay?.toUpperCase() === val },
 *     ],
 *   });
 * ```
 */
export function usePanelFilters<T>({
  items,
  searchField,
  filters = [],
  initialFilters = {},
}: UsePanelFiltersOptions<T>): UsePanelFiltersReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSets, setFilterSets] = useState<Record<string, Set<string>>>(() => {
    // Initialize with empty sets for each filter key
    const initial: Record<string, Set<string>> = {};
    filters.forEach((f) => {
      initial[f.key] = initialFilters[f.key] ?? new Set();
    });
    return initial;
  });

  // Toggle a single filter value
  const toggleFilter = useCallback((filterKey: string, value: string) => {
    setFilterSets((prev) => {
      const currentSet = prev[filterKey] ?? new Set();
      const next = new Set(currentSet);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, [filterKey]: next };
    });
  }, []);

  // Set all values for a filter
  const setFilter = useCallback((filterKey: string, values: Set<string>) => {
    setFilterSets((prev) => ({ ...prev, [filterKey]: values }));
  }, []);

  // Clear all filters and search
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterSets((prev) => {
      const cleared: Record<string, Set<string>> = {};
      Object.keys(prev).forEach((key) => {
        cleared[key] = new Set();
      });
      return cleared;
    });
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = searchQuery ? 1 : 0;
    Object.values(filterSets).forEach((set) => {
      count += set.size;
    });
    return count;
  }, [searchQuery, filterSets]);

  const hasActiveFilters = activeFilterCount > 0;

  // Get searchable text from item
  const getSearchText = useCallback(
    (item: T): string => {
      if (typeof searchField === 'function') {
        return searchField(item);
      }
      const value = item[searchField];
      return typeof value === 'string' ? value : String(value ?? '');
    },
    [searchField]
  );

  // Apply filters and search to items
  const filteredItems = useMemo(() => {
    if (!hasActiveFilters) {
      return items;
    }

    return items.filter((item) => {
      // Check search query
      if (searchQuery) {
        const text = getSearchText(item).toLowerCase();
        if (!text.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Check each filter
      for (const filterDef of filters) {
        const activeValues = filterSets[filterDef.key];
        if (activeValues && activeValues.size > 0) {
          // Item must match at least one of the active filter values
          let matchesAny = false;
          for (const value of activeValues) {
            if (filterDef.predicate(item, value)) {
              matchesAny = true;
              break;
            }
          }
          if (!matchesAny) {
            return false;
          }
        }
      }

      return true;
    });
  }, [items, searchQuery, filterSets, filters, getSearchText, hasActiveFilters]);

  return {
    searchQuery,
    setSearchQuery,
    filterSets,
    toggleFilter,
    setFilter,
    clearFilters,
    activeFilterCount,
    filteredItems,
    hasActiveFilters,
  };
}
