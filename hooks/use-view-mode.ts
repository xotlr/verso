'use client';

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'grid' | 'list';
export type PageType = 'screenplays' | 'projects' | 'series' | 'home';

const STORAGE_KEY = 'viewModePreferences';

function getStorageKey(pageType: PageType): string {
  return `${STORAGE_KEY}_${pageType}`;
}

function getStoredViewMode(pageType: PageType): ViewMode {
  if (typeof window === 'undefined') return 'grid';

  try {
    const stored = localStorage.getItem(getStorageKey(pageType));
    if (stored === 'grid' || stored === 'list') {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }

  return 'grid';
}

function setStoredViewMode(pageType: PageType, mode: ViewMode): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(getStorageKey(pageType), mode);
  } catch {
    // localStorage might be unavailable
  }
}

export function useViewMode(pageType: PageType): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>('grid');
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setViewModeState(getStoredViewMode(pageType));
    setIsHydrated(true);
  }, [pageType]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    setStoredViewMode(pageType, mode);
  }, [pageType]);

  // Return grid during SSR to avoid hydration mismatch
  return [isHydrated ? viewMode : 'grid', setViewMode];
}
