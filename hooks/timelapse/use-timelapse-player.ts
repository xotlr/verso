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

interface UseTimelapsePlayerOptions {
  /** Function to fetch operations from API. Should handle pagination internally. */
  fetchOperations: () => Promise<FetchOperationsResult[]>;
  onOperationChange?: (operation: TimelapseOperation, content: string) => void;
}

export interface UseTimelapsePlayerReturn extends TimelapsePlayerState, TimelapsePlayerActions {
  screenplay?: ScreenplayInfo;
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
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentContent, setCurrentContent] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [timelapseStarted, setTimelapseStarted] = useState<string | null>(null);

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load operations using provided fetcher
  const loadOperations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await fetchOperations();

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

      // Initialize with first operation content if available
      if (allOperations.length > 0 && allOperations[0].content) {
        setCurrentContent(allOperations[0].content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOperations]);

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

  // Playback loop
  useEffect(() => {
    if (!isPlaying || operations.length === 0) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    // Calculate interval based on speed
    // Base interval: 100ms at 1x speed
    const getInterval = () => Math.round(100 / speed);

    playbackIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= operations.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
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
    error,
    speed,
    progress,
    totalCount,
    timelapseStarted,

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
