'use client';

/**
 * Shared utilities for editor panels.
 * Provides composable components for common panel patterns.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Plus } from 'lucide-react';

/**
 * Panel header with title, search, and optional add button.
 */
interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  itemCount?: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PanelHeader({
  title,
  icon,
  itemCount,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onAdd,
  addLabel = 'Add',
  className,
  children,
}: PanelHeaderProps) {
  const [isSearching, setIsSearching] = useState(false);

  return (
    <div className={cn('p-3 border-b space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-sm">{title}</h3>
          {typeof itemCount === 'number' && (
            <span className="text-xs text-muted-foreground">({itemCount})</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isSearching ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsSearching(true)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          {onAdd && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onAdd}
              title={addLabel}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {isSearching && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 pr-8 text-sm"
            autoFocus
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={() => {
                onSearchChange('');
                setIsSearching(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * Empty state for panels when no items exist.
 */
interface PanelEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PanelEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: PanelEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-6 text-center', className)}>
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onAction}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Container for panel content with scroll area.
 */
interface PanelContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelContent({ children, className }: PanelContentProps) {
  return (
    <ScrollArea className={cn('flex-1', className)}>
      <div className="p-2">
        {children}
      </div>
    </ScrollArea>
  );
}

/**
 * Panel container with consistent styling.
 */
interface PanelContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelContainer({ children, className }: PanelContainerProps) {
  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {children}
    </div>
  );
}

/**
 * Hook for filtering panel items with search.
 */
export function usePanelSearch<T>(
  items: T[],
  searchValue: string,
  getSearchableText: (item: T) => string
) {
  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return items;
    const search = searchValue.toLowerCase();
    return items.filter(item =>
      getSearchableText(item).toLowerCase().includes(search)
    );
  }, [items, searchValue, getSearchableText]);

  return filteredItems;
}

/**
 * Hook for managing panel search state.
 */
export function usePanelSearchState() {
  const [searchValue, setSearchValue] = useState('');

  const clearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  return {
    searchValue,
    setSearchValue,
    clearSearch,
  };
}
