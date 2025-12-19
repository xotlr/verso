'use client';

import { useCallback } from 'react';
import { useTimelapsePlayer, type UseTimelapsePlayerReturn } from './use-timelapse-player';
import type { TimelapseOperation, FetchOperationsResult, ScreenplayInfo } from './types';

interface UsePublicTimelapseOptions {
  shareId: string;
  onOperationChange?: (operation: TimelapseOperation, content: string) => void;
}

interface UsePublicTimelapseReturn extends Omit<UseTimelapsePlayerReturn, 'screenplay'> {
  screenplay: ScreenplayInfo | null;
}

/**
 * Hook for public timelapse playback.
 * Fetches operations from the public timelapse endpoint using share ID.
 */
export function usePublicTimelapse({
  shareId,
  onOperationChange,
}: UsePublicTimelapseOptions): UsePublicTimelapseReturn {
  const fetchOperations = useCallback(async (): Promise<FetchOperationsResult[]> => {
    const results: FetchOperationsResult[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`/api/timelapse/${shareId}`, window.location.origin);
      if (cursor) url.searchParams.set('cursor', cursor);
      url.searchParams.set('limit', '1000');

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This timelapse does not exist or has been removed');
        }
        throw new Error('Failed to load timelapse data');
      }

      const data = await response.json();
      results.push({
        operations: data.operations,
        totalCount: data.totalCount,
        timelapseStarted: data.timelapseStarted,
        nextCursor: data.nextCursor,
        screenplay: data.screenplay,
      });

      cursor = data.nextCursor;
      hasMore = !!cursor;
    }

    return results;
  }, [shareId]);

  const playerState = useTimelapsePlayer({
    fetchOperations,
    onOperationChange,
  });

  return {
    ...playerState,
    screenplay: playerState.screenplay || null,
  };
}

// Re-export types for convenience
export type { TimelapseOperation, ScreenplayInfo } from './types';
