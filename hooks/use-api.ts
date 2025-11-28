'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  /** Initial data before fetch */
  initialData?: T;
  /** Skip initial fetch (useful for conditional fetching) */
  skip?: boolean;
  /** Cache time in milliseconds (default: 0 = no cache) */
  cacheTime?: number;
  /** Refetch on window focus */
  refetchOnFocus?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

export function useApi<T>(
  url: string | null,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const {
    initialData,
    skip = false,
    cacheTime = 0,
    refetchOnFocus = false,
    refetchInterval,
  } = options;

  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!skip && !!url);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || skip) return;

    // Check cache
    if (cacheTime > 0) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data as T);
        setIsLoading(false);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);

      // Update cache
      if (cacheTime > 0) {
        cache.set(url, { data: result, timestamp: Date.now() });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [url, skip, cacheTime]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const intervalId = setInterval(fetchData, refetchInterval);
    return () => clearInterval(intervalId);
  }, [refetchInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(async () => {
    // Clear cache for this URL before refetching
    if (url && cacheTime > 0) {
      cache.delete(url);
    }
    await fetchData();
  }, [url, cacheTime, fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    // Update cache if caching is enabled
    if (url && cacheTime > 0) {
      cache.set(url, { data: newData, timestamp: Date.now() });
    }
  }, [url, cacheTime]);

  return { data, isLoading, error, refetch, mutate };
}

// Hook for mutations (POST, PUT, DELETE)
interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  isLoading: boolean;
  error: Error | null;
  data: TData | null;
  reset: () => void;
}

export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<Response>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mutationFn(variables);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      options.onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      options.onError?.(error, variables);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

// Utility to clear all cached data
export function clearApiCache() {
  cache.clear();
}

// Utility to invalidate specific cache entries
export function invalidateCache(urlPattern: string | RegExp) {
  for (const key of cache.keys()) {
    if (typeof urlPattern === 'string') {
      if (key.includes(urlPattern)) {
        cache.delete(key);
      }
    } else {
      if (urlPattern.test(key)) {
        cache.delete(key);
      }
    }
  }
}
