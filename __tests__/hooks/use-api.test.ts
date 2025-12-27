import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApi, useMutation, clearApiCache, invalidateCache } from '@/hooks/use-api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic fetching', () => {
    it('should fetch data from URL', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useApi<typeof mockData>('/api/test'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useApi('/api/notfound'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('404');
      expect(result.current.data).toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('should not fetch when URL is null', () => {
      const { result } = renderHook(() => useApi(null));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('initialData option', () => {
    it('should use initialData before fetch completes', async () => {
      const initialData = { id: 0, name: 'Initial' };
      const fetchedData = { id: 1, name: 'Fetched' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fetchedData),
      });

      const { result } = renderHook(() =>
        useApi<typeof initialData>('/api/test', { initialData })
      );

      expect(result.current.data).toEqual(initialData);

      await waitFor(() => {
        expect(result.current.data).toEqual(fetchedData);
      });
    });
  });

  describe('skip option', () => {
    it('should not fetch when skip is true', () => {
      const { result } = renderHook(() =>
        useApi('/api/test', { skip: true })
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch when skip changes to false', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result, rerender } = renderHook(
        ({ skip }) => useApi('/api/test', { skip }),
        { initialProps: { skip: true } }
      );

      expect(mockFetch).not.toHaveBeenCalled();

      rerender({ skip: false });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });
    });
  });

  describe('caching', () => {
    it('should use cached data within cacheTime', async () => {
      const mockData = { id: 1, name: 'Cached' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      // First render - should fetch
      const { result: result1, unmount } = renderHook(() =>
        useApi<typeof mockData>('/api/cached', { cacheTime: 60000 })
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      unmount();

      // Second render - should use cache
      const { result: result2 } = renderHook(() =>
        useApi<typeof mockData>('/api/cached', { cacheTime: 60000 })
      );

      // Cache hit should set data immediately without additional fetch
      await waitFor(() => {
        expect(result2.current.data).toEqual(mockData);
      });

      // Should not have made another fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const mockData1 = { id: 1 };
      const mockData2 = { id: 2 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData2),
        });

      const { result } = renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on refetch', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() =>
        useApi('/api/cached', { cacheTime: 60000 })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      await act(async () => {
        await result.current.refetch();
      });

      // Should have fetched twice (initial + refetch)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('mutate', () => {
    it('should update data optimistically', async () => {
      const initialData = { id: 1, name: 'Initial' };
      const updatedData = { id: 1, name: 'Updated' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialData),
      });

      const { result } = renderHook(() => useApi<typeof initialData>('/api/test'));

      await waitFor(() => {
        expect(result.current.data).toEqual(initialData);
      });

      act(() => {
        result.current.mutate(updatedData);
      });

      expect(result.current.data).toEqual(updatedData);
    });
  });

  describe('refetchOnFocus', () => {
    it('should refetch when window gains focus', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      renderHook(() =>
        useApi('/api/test', { refetchOnFocus: true })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Simulate window focus
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should not refetch on focus when refetchOnFocus is false', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      renderHook(() => useApi('/api/test'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Wait a bit to ensure no additional fetch happens
      await new Promise((r) => setTimeout(r, 50));
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic mutation', () => {
    it('should execute mutation and return data', async () => {
      const mockData = { id: 1, created: true };
      const mutationFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useMutation(mutationFn));

      expect(result.current.isLoading).toBe(false);

      let mutationResult;
      await act(async () => {
        mutationResult = await result.current.mutate({ name: 'Test' });
      });

      expect(mutationResult).toEqual(mockData);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(mutationFn).toHaveBeenCalledWith({ name: 'Test' });
    });

    it('should handle mutation errors', async () => {
      const mutationFn = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid data' }),
      });

      const { result } = renderHook(() => useMutation(mutationFn));

      await act(async () => {
        await result.current.mutate({ invalid: true });
      });

      expect(result.current.error?.message).toBe('Invalid data');
      expect(result.current.data).toBeNull();
    });

    it('should handle network errors', async () => {
      const mutationFn = vi.fn().mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useMutation(mutationFn));

      await act(async () => {
        await result.current.mutate({});
      });

      expect(result.current.error?.message).toBe('Network failure');
    });

    it('should return null on error', async () => {
      const mutationFn = vi.fn().mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useMutation(mutationFn));

      let returnValue;
      await act(async () => {
        returnValue = await result.current.mutate({});
      });

      expect(returnValue).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess on successful mutation', async () => {
      const mockData = { id: 1 };
      const onSuccess = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() =>
        useMutation(mutationFn, { onSuccess })
      );

      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData, { name: 'Test' });
    });

    it('should call onError on failed mutation', async () => {
      const onError = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { result } = renderHook(() =>
        useMutation(mutationFn, { onError })
      );

      await act(async () => {
        await result.current.mutate({ data: 'test' });
      });

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toBe('Server error');
      expect(onError.mock.calls[0][1]).toEqual({ data: 'test' });
    });
  });

  describe('reset', () => {
    it('should reset error and data state', async () => {
      const mockData = { id: 1 };
      const mutationFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useMutation(mutationFn));

      await act(async () => {
        await result.current.mutate({});
      });

      expect(result.current.data).toEqual(mockData);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle response with no JSON body', async () => {
      const mutationFn = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('No JSON')),
      });

      const { result } = renderHook(() => useMutation(mutationFn));

      await act(async () => {
        await result.current.mutate({});
      });

      // Should fallback to status code error
      expect(result.current.error?.message).toContain('500');
    });
  });
});

describe('clearApiCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiCache();
  });

  it('should clear all cached data', async () => {
    const mockData = { id: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Populate cache
    const { unmount } = renderHook(() =>
      useApi('/api/cached-clear', { cacheTime: 60000 })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    unmount();

    // Clear cache
    clearApiCache();

    // Should fetch again since cache is cleared
    renderHook(() => useApi('/api/cached-clear', { cacheTime: 60000 }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('invalidateCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiCache();
  });

  it('should invalidate cache entries matching string pattern', async () => {
    const mockData = { id: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Populate cache for users URL
    const { unmount: unmount1 } = renderHook(() =>
      useApi('/api/users/1', { cacheTime: 60000 })
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    unmount1();

    // Populate cache for posts URL
    const { unmount: unmount2 } = renderHook(() =>
      useApi('/api/posts/1', { cacheTime: 60000 })
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    unmount2();

    // Invalidate only users cache
    invalidateCache('/api/users');

    // Users should refetch
    const { unmount: unmount3 } = renderHook(() =>
      useApi('/api/users/1', { cacheTime: 60000 })
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
    unmount3();

    // Posts should use cache (no additional fetch)
    renderHook(() => useApi('/api/posts/1', { cacheTime: 60000 }));

    // Give it time to potentially fetch
    await new Promise(r => setTimeout(r, 50));
    expect(mockFetch).toHaveBeenCalledTimes(3); // Still 3, no new fetch for posts
  });

  it('should invalidate cache entries matching regex pattern', async () => {
    const mockData = { id: 1 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Populate cache
    const { unmount } = renderHook(() =>
      useApi('/api/users/123', { cacheTime: 60000 })
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    unmount();

    // Invalidate using regex
    invalidateCache(/\/api\/users\/\d+/);

    // Should refetch
    renderHook(() => useApi('/api/users/123', { cacheTime: 60000 }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
