'use client';

import { useCallback } from 'react';
import { useTimelapsePlayer, type UseTimelapsePlayerReturn } from './use-timelapse-player';
import type { TimelapseOperation, FetchOperationsResult } from './types';

interface UseTimelapsePlaybackOptions {
  screenplayId: string;
  onOperationChange?: (operation: TimelapseOperation, content: string) => void;
}

/**
 * Hook for authenticated timelapse playback.
 * Fetches operations from the authenticated screenplay timelapse endpoint.
 */
export function useTimelapsePlayback({
  screenplayId,
  onOperationChange,
}: UseTimelapsePlaybackOptions): Omit<UseTimelapsePlayerReturn, 'screenplay'> {
  const fetchOperations = useCallback(async (
    onProgress: (loaded: number, total: number) => void
  ): Promise<FetchOperationsResult[]> => {
    const results: FetchOperationsResult[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let totalLoaded = 0;
    let totalCount = 0;

    while (hasMore) {
      const url = new URL(
        `/api/screenplays/${screenplayId}/timelapse/operations`,
        window.location.origin
      );
      if (cursor) url.searchParams.set('cursor', cursor);
      url.searchParams.set('limit', '1000');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load timelapse data');
      }

      const data = await response.json();
      results.push({
        operations: data.operations,
        totalCount: data.totalCount,
        timelapseStarted: data.timelapseStarted,
        nextCursor: data.nextCursor,
      });

      // Track progress
      totalCount = data.totalCount;
      totalLoaded += data.operations.length;
      onProgress(totalLoaded, totalCount);

      cursor = data.nextCursor;
      hasMore = !!cursor;
    }

    return results;
  }, [screenplayId]);

  const playerState = useTimelapsePlayer({
    fetchOperations,
    onOperationChange,
  });

  // Exclude screenplay (not relevant for authenticated playback)
  const { screenplay: _screenplay, ...rest } = playerState;
  return rest;
}

// Re-export types for convenience
export type { TimelapseOperation } from './types';
