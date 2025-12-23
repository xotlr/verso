'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  TimelapseOperation,
  PlaybackSpeed,
  TimelapsePlayerState,
  TimelapsePlayerActions,
  FetchOperationsResult,
  ScreenplayInfo,
} from './types';
import type { PaginationResult } from '@/lib/verso';
import {
  serializeDocument,
  runPagination,
  DEFAULT_FEATURE_FILM_CONFIG,
} from '@/lib/verso';
import { deserializeFromStorage } from '@/lib/prosemirror';

interface UseTimelapsePlayerOptions {
  /** Function to fetch operations from API. Should handle pagination and call onProgress. */
  fetchOperations: (onProgress: (loaded: number, total: number) => void) => Promise<FetchOperationsResult[]>;
  onOperationChange?: (operation: TimelapseOperation, content: string) => void;
}

export interface UseTimelapsePlayerReturn extends TimelapsePlayerState, TimelapsePlayerActions {
  screenplay?: ScreenplayInfo;
  /** Pre-computed pagination results for each frame index */
  paginationCache: Map<number, PaginationResult>;
}

/**
 * Core hook for timelapse playback functionality.
 * Provides all playback controls and state management.
 */
export function useTimelapsePlayer({
  fetchOperations,
  onOperationChange,
}: UseTimelapsePlayerOptions): UseTimelapsePlayerReturn {
  const [screenplay, setScreenplay] = useState<ScreenplayInfo | undefined>();
  const [operations, setOperations] = useState<TimelapseOperation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState<'fetching' | 'computing' | 'done'>('fetching');
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentContent, setCurrentContent] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [timelapseStarted, setTimelapseStarted] = useState<string | null>(null);
  const [paginationCache, setPaginationCache] = useState<Map<number, PaginationResult>>(new Map());

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Progress callback for loading (uses first 50% for fetching)
  const handleLoadingProgress = useCallback((loaded: number, total: number) => {
    const percent = total > 0 ? Math.round((loaded / total) * 50) : 0;
    setLoadingProgress(percent);
  }, []);

  // Load operations using provided fetcher
  const loadOperations = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus('fetching');
    setError(null);
    setPaginationCache(new Map());

    try {
      const results = await fetchOperations(handleLoadingProgress);

      // Combine all paginated results
      const allOperations: TimelapseOperation[] = [];
      for (const result of results) {
        allOperations.push(...result.operations);

        // Set metadata from first result
        if (result === results[0]) {
          setTotalCount(result.totalCount);
          setTimelapseStarted(result.timelapseStarted);
          if (result.screenplay) {
            setScreenplay(result.screenplay);
          }
        }
      }

      setOperations(allOperations);
      setLoadingProgress(50);

      // Initialize with first operation content if available
      if (allOperations.length > 0 && allOperations[0].content) {
        setCurrentContent(allOperations[0].content);
      }

      // Pre-compute pagination for all operations
      setLoadingStatus('computing');
      const cache = new Map<number, PaginationResult>();

      // For very large timelapses, sample every Nth operation
      const maxPaginationOps = 500;
      const step = allOperations.length > maxPaginationOps
        ? Math.ceil(allOperations.length / maxPaginationOps)
        : 1;

      for (let i = 0; i < allOperations.length; i += step) {
        const op = allOperations[i];
        if (op.content) {
          try {
            const doc = deserializeFromStorage(op.content);
            const elements = serializeDocument(doc);
            const hasTitlePage = doc.firstChild?.type.name === 'title_page';
            const paginationResult = await runPagination(elements, DEFAULT_FEATURE_FILM_CONFIG, hasTitlePage);
            cache.set(i, paginationResult);
          } catch (paginationError) {
            // Silently skip failed pagination - we'll fall back to live computation
            console.warn(`[Timelapse] Failed to pre-compute pagination for op ${i}:`, paginationError);
          }
        }

        // Update progress (50-100% range for pagination)
        const paginationProgress = 50 + ((i / allOperations.length) * 50);
        setLoadingProgress(Math.round(paginationProgress));

        // Yield to UI every 10 operations to keep it responsive
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      setPaginationCache(cache);
      setLoadingProgress(100);
      setLoadingStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOperations, handleLoadingProgress]);

  // Load on mount
  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  // Update content when index changes
  useEffect(() => {
    if (operations.length === 0) return;

    const operation = operations[currentIndex];
    if (!operation) return;

    // For 'replace' operations, just use the content directly
    if (operation.operationType === 'replace' && operation.content !== null) {
      setCurrentContent(operation.content);
    }

    if (onOperationChange) {
      onOperationChange(operation, currentContent);
    }
  }, [currentIndex, operations, currentContent, onOperationChange]);

  // Play/Pause toggle
  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  // Jump to specific index
  const seekTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, operations.length - 1));
    setCurrentIndex(clampedIndex);
  }, [operations.length]);

  // Step forward/backward
  const stepForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, operations.length - 1));
  }, [operations.length]);

  const stepBackward = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Change playback speed
  const changeSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed);
  }, []);

  // Playback loop with operation skipping for fast speeds
  useEffect(() => {
    if (!isPlaying || operations.length === 0) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    // Get step size based on speed - skip operations at very high speeds
    // This allows smooth playback even at extreme speeds
    const getStepSize = () => {
      if (speed >= 100) return 10;  // Skip 10 ops at a time at 100x
      if (speed >= 50) return 5;    // Skip 5 at 50x
      if (speed >= 20) return 2;    // Skip 2 at 20x
      return 1;                      // Play each at lower speeds
    };

    // Calculate interval based on speed
    // Minimum 16ms (60fps) for smooth rendering, max effectiveness through skipping
    const getInterval = () => Math.max(16, Math.round(100 / speed));

    const stepSize = getStepSize();

    playbackIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + stepSize;
        if (next >= operations.length - 1) {
          setIsPlaying(false);
          return operations.length - 1;
        }
        return next;
      });
    }, getInterval());

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, speed, operations.length]);

  // Calculate progress percentage (handle single operation case to avoid NaN)
  const progress = operations.length > 1
    ? (currentIndex / (operations.length - 1)) * 100
    : (operations.length === 1 ? 100 : 0);

  // Get current operation
  const currentOperation = operations[currentIndex] || null;

  // Calculate elapsed time from start
  const getElapsedTime = useCallback(() => {
    if (!timelapseStarted || !currentOperation) return 0;
    const start = new Date(timelapseStarted).getTime();
    const current = new Date(currentOperation.timestamp).getTime();
    return current - start;
  }, [timelapseStarted, currentOperation]);

  // Get total duration
  const getTotalDuration = useCallback(() => {
    if (operations.length < 2) return 0;
    const first = new Date(operations[0].timestamp).getTime();
    const last = new Date(operations[operations.length - 1].timestamp).getTime();
    return last - first;
  }, [operations]);

  return {
    // Screenplay info (for public timelapse)
    screenplay,

    // State
    operations,
    currentIndex,
    currentContent,
    currentOperation,
    isPlaying,
    isLoading,
    loadingProgress,
    loadingStatus,
    error,
    speed,
    progress,
    totalCount,
    timelapseStarted,

    // Pre-computed pagination
    paginationCache,

    // Time calculations
    elapsedTime: getElapsedTime(),
    totalDuration: getTotalDuration(),

    // Actions
    togglePlayback,
    stop,
    seekTo,
    stepForward,
    stepBackward,
    changeSpeed,
    reload: loadOperations,
  };
}
