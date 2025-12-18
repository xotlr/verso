'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface TimelapseOperation {
  id: string;
  operationType: 'insert' | 'delete' | 'replace';
  position: number | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  sequenceNumber: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface UseTimelapsePlaybackOptions {
  screenplayId: string;
  onOperationChange?: (operation: TimelapseOperation, content: string) => void;
}

type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

export function useTimelapsePlayback({
  screenplayId,
  onOperationChange,
}: UseTimelapsePlaybackOptions) {
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

  // Load operations from API
  const loadOperations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let allOperations: TimelapseOperation[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const url = new URL(`/api/screenplays/${screenplayId}/timelapse/operations`, window.location.origin);
        if (cursor) url.searchParams.set('cursor', cursor);
        url.searchParams.set('limit', '1000');

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load timelapse data');
        }

        const data = await response.json();
        allOperations = [...allOperations, ...data.operations];
        cursor = data.nextCursor;
        hasMore = !!cursor;

        setTotalCount(data.totalCount);
        setTimelapseStarted(data.timelapseStarted);
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
  }, [screenplayId]);

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

    // Calculate interval based on speed and timestamp differences
    const getInterval = () => {
      // Base interval: 100ms at 1x speed
      // At 10x speed: 10ms per operation
      // At 0.5x speed: 200ms per operation
      return Math.round(100 / speed);
    };

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
