'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UsePersistentListOptions<T> {
  /** Unique identifier for the data (e.g., screenplayId) */
  entityId: string | undefined;
  /** Key suffix for localStorage (full key will be `${key}-${entityId}`) */
  storageKey: string;
  /** API endpoint for fetching/saving data */
  apiEndpoint: string;
  /** Default value when no data exists */
  defaultValue: T;
  /** Transform data from API response (optional) */
  parseFromApi?: (data: unknown) => T;
  /** Transform data for API request body (optional) */
  serializeForApi?: (data: T) => unknown;
  /** Debounce delay in ms for API saves (default: 1000) */
  debounceMs?: number;
  /** Whether to skip API calls (useful for local-only data) */
  localOnly?: boolean;
}

export interface UsePersistentListReturn<T> {
  /** Current data */
  data: T;
  /** Update data (triggers save) */
  setData: React.Dispatch<React.SetStateAction<T>>;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether a save is pending */
  isSaving: boolean;
  /** Last error encountered */
  error: Error | null;
  /** Manually refresh data from API */
  refresh: () => Promise<void>;
  /** Force save immediately (bypasses debounce) */
  saveNow: () => Promise<void>;
}

/**
 * Generic hook for persisting panel data with localStorage + API sync.
 * Provides immediate local display with background API synchronization.
 *
 * Pattern:
 * 1. Load from localStorage first for instant display
 * 2. Fetch from API for authoritative data
 * 3. Save to localStorage immediately on change
 * 4. Debounce API saves to reduce network traffic
 *
 * @example
 * ```tsx
 * const { data: characterRoles, setData: setCharacterRoles, isLoading } =
 *   usePersistentList<Map<string, CharacterRole>>({
 *     entityId: screenplayId,
 *     storageKey: 'character-roles',
 *     apiEndpoint: `/api/screenplays/${screenplayId}/characters`,
 *     defaultValue: new Map(),
 *     parseFromApi: (data) => new Map(Object.entries(data.roles || {})),
 *     serializeForApi: (data) => ({ roles: Object.fromEntries(data) }),
 *   });
 * ```
 */
export function usePersistentList<T>({
  entityId,
  storageKey,
  apiEndpoint,
  defaultValue,
  parseFromApi,
  serializeForApi,
  debounceMs = 1000,
  localOnly = false,
}: UsePersistentListOptions<T>): UsePersistentListReturn<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastSavedDataRef = useRef<string>('');

  // Full localStorage key
  const fullStorageKey = entityId ? `${storageKey}-${entityId}` : null;

  // Load data from localStorage and API
  const loadData = useCallback(async () => {
    if (!entityId || !fullStorageKey) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, load from localStorage for immediate display
      const localData = localStorage.getItem(fullStorageKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setData(parsed);
          lastSavedDataRef.current = localData;
        } catch (e) {
          console.error(`Failed to parse ${storageKey} from localStorage:`, e);
        }
      }

      // Then load from API for authoritative data (unless localOnly)
      if (!localOnly) {
        const response = await fetch(apiEndpoint);
        if (response.ok) {
          const apiData = await response.json();
          const transformedData = parseFromApi ? parseFromApi(apiData) : apiData;

          // Only update if we got meaningful data
          if (transformedData !== null && transformedData !== undefined) {
            setData(transformedData);
            // Update localStorage with API data
            const serialized = JSON.stringify(transformedData);
            localStorage.setItem(fullStorageKey, serialized);
            lastSavedDataRef.current = serialized;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to load ${storageKey}:`, e);
      setError(e instanceof Error ? e : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [entityId, fullStorageKey, storageKey, apiEndpoint, parseFromApi, localOnly]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save to API
  const saveToApi = useCallback(async (dataToSave: T) => {
    if (!entityId || localOnly) return;

    setIsSaving(true);
    try {
      const body = serializeForApi ? serializeForApi(dataToSave) : dataToSave;
      await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setError(null);
    } catch (e) {
      console.error(`Failed to save ${storageKey} to API:`, e);
      setError(e instanceof Error ? e : new Error('Failed to save data'));
    } finally {
      setIsSaving(false);
    }
  }, [entityId, storageKey, apiEndpoint, serializeForApi, localOnly]);

  // Save immediately (bypass debounce)
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await saveToApi(data);
  }, [data, saveToApi]);

  // Watch for data changes and persist
  useEffect(() => {
    if (!entityId || !fullStorageKey || isInitialLoadRef.current) return;

    const serialized = JSON.stringify(data);

    // Skip if data hasn't actually changed
    if (serialized === lastSavedDataRef.current) return;

    // Save to localStorage immediately
    localStorage.setItem(fullStorageKey, serialized);
    lastSavedDataRef.current = serialized;

    // Debounce API save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToApi(data);
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, entityId, fullStorageKey, debounceMs, saveToApi]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    setData,
    isLoading,
    isSaving,
    error,
    refresh: loadData,
    saveNow,
  };
}
