'use client';

import { useState, useCallback, useRef } from 'react';

interface CachedScreenplay {
  id: string;
  title: string;
}

interface ScreenplayCacheState {
  data: CachedScreenplay[] | null;
  timestamp: number;
}

const CACHE_DURATION = 60000; // 1 minute

/**
 * Hook for caching screenplay list data.
 * Replaces mutable module-level globals with proper React state.
 *
 * The cache is stored in a ref to persist across re-renders without
 * causing unnecessary re-renders when only the cache changes.
 */
export function useScreenplayCache() {
  const [screenplays, setScreenplays] = useState<CachedScreenplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<ScreenplayCacheState>({ data: null, timestamp: 0 });

  const fetchScreenplays = useCallback(async (): Promise<CachedScreenplay[]> => {
    const now = Date.now();
    const cache = cacheRef.current;

    // Return cached data if still valid
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      setScreenplays(cache.data);
      return cache.data;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/screenplays');
      if (!response.ok) {
        setScreenplays([]);
        return [];
      }

      const screenplayList: CachedScreenplay[] = await response.json();
      const mapped = screenplayList.map(s => ({ id: s.id, title: s.title }));

      // Update cache
      cacheRef.current = { data: mapped, timestamp: now };
      setScreenplays(mapped);
      return mapped;
    } catch {
      setScreenplays([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const invalidateCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 };
    setScreenplays([]);
  }, []);

  return {
    screenplays,
    isLoading,
    fetchScreenplays,
    invalidateCache,
  };
}

/**
 * Shared cache instance for use across components.
 * This provides a way to invalidate the cache from anywhere in the app.
 */
let sharedCacheInvalidator: (() => void) | null = null;

export function setSharedCacheInvalidator(invalidator: (() => void) | null) {
  sharedCacheInvalidator = invalidator;
}

export function invalidateScreenplayCache() {
  sharedCacheInvalidator?.();
}
