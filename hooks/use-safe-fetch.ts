import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Result type for useSafeFetch hook.
 */
interface UseSafeFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Options for useSafeFetch hook.
 */
interface UseSafeFetchOptions<T> {
  /** Initial data value */
  initialData?: T | null;
  /** Whether to fetch immediately on mount */
  immediate?: boolean;
  /** Transform the response JSON */
  transform?: (data: unknown) => T;
  /** Callback when fetch succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when fetch fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for safe data fetching with automatic abort on unmount/dependency change.
 * Prevents memory leaks and state updates on unmounted components.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSafeFetch<User>(
 *   userId ? `/api/users/${userId}` : null
 * );
 * ```
 */
export function useSafeFetch<T>(
  url: string | null,
  options: UseSafeFetchOptions<T> = {}
): UseSafeFetchResult<T> {
  const {
    initialData = null,
    immediate = true,
    transform,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(immediate && url !== null);

  // Track the current abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch function that can be called manually
  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const result = transform ? transform(json) : (json as T);

      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setData(result);
        setIsLoading(false);
        onSuccess?.(result);
      }
    } catch (err) {
      // Ignore abort errors - they're expected when component unmounts
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));

      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setError(error);
        setIsLoading(false);
        onError?.(error);
      }
    }
  }, [url, transform, onSuccess, onError]);

  // Fetch on mount and when URL changes
  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    // Cleanup: abort any in-flight request
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  return {
    data,
    error,
    isLoading,
    refetch: fetchData,
  };
}

/**
 * Creates an abort-safe fetch function for use in callbacks.
 * Returns a cleanup function that should be called from useEffect cleanup.
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const { fetch: safeFetch, abort } = createAbortableFetch();
 *
 *   safeFetch('/api/data')
 *     .then(res => res.json())
 *     .then(setData)
 *     .catch(err => {
 *       if (err.name !== 'AbortError') setError(err);
 *     });
 *
 *   return abort;
 * }, [dependency]);
 * ```
 */
export function createAbortableFetch() {
  const controller = new AbortController();

  return {
    fetch: (url: string, init?: RequestInit) =>
      fetch(url, { ...init, signal: controller.signal }),
    abort: () => controller.abort(),
    signal: controller.signal,
  };
}

/**
 * Hook that returns an abort controller that's automatically aborted on unmount.
 * Useful for manual fetch calls in event handlers or effects.
 *
 * @example
 * ```tsx
 * const getAbortSignal = useAbortSignal();
 *
 * const handleClick = async () => {
 *   const signal = getAbortSignal();
 *   const res = await fetch('/api/data', { signal });
 *   // ...
 * };
 * ```
 */
export function useAbortSignal() {
  const controllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return useCallback(() => {
    // Abort previous request
    controllerRef.current?.abort();
    // Create new controller
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);
}
