'use client';

import { useCallback, useRef, useEffect } from 'react';

interface TimelapseOperation {
  operationType: 'insert' | 'delete' | 'replace';
  position?: number | null;
  content?: string | null;
  metadata?: Record<string, unknown>;
}

interface UseTimelapseRecorderOptions {
  screenplayId: string;
  enabled?: boolean;
  batchSize?: number;
  flushIntervalMs?: number;
}

/**
 * Hook for recording timelapse operations.
 * Batches operations and sends them to the server periodically.
 */
export function useTimelapseRecorder({
  screenplayId,
  enabled = true,
  batchSize = 50,
  flushIntervalMs = 5000,
}: UseTimelapseRecorderOptions) {
  const operationQueueRef = useRef<TimelapseOperation[]>([]);
  const isFlushingRef = useRef(false);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  // Flush operations to the server
  const flush = useCallback(async () => {
    if (isFlushingRef.current || operationQueueRef.current.length === 0) {
      return;
    }

    isFlushingRef.current = true;
    const operations = [...operationQueueRef.current];
    operationQueueRef.current = [];

    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/timelapse/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations }),
      });

      if (!response.ok) {
        console.error('Failed to flush timelapse operations');
        operationQueueRef.current = [...operations, ...operationQueueRef.current];
      }
    } catch (error) {
      console.error('Error flushing timelapse operations:', error);
      operationQueueRef.current = [...operations, ...operationQueueRef.current];
    } finally {
      isFlushingRef.current = false;
    }
  }, [screenplayId]);

  // Schedule next flush
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = setTimeout(() => {
      flush();
    }, flushIntervalMs);
  }, [flush, flushIntervalMs]);

  // Record a single operation
  const recordOperation = useCallback((operation: TimelapseOperation) => {
    if (!enabled) return;

    operationQueueRef.current.push(operation);

    if (operationQueueRef.current.length >= batchSize) {
      flush();
    } else {
      scheduleFlush();
    }
  }, [enabled, batchSize, flush, scheduleFlush]);

  // Record a content change (computes diff and creates operations)
  const recordContentChange = useCallback((
    newContent: string,
    cursorPosition?: number
  ) => {
    if (!enabled) return;

    const oldContent = lastContentRef.current;
    lastContentRef.current = newContent;

    if (oldContent === newContent) return;

    recordOperation({
      operationType: 'replace',
      position: cursorPosition ?? 0,
      content: newContent,
      metadata: {
        contentLength: newContent.length,
        previousLength: oldContent.length,
      },
    });
  }, [enabled, recordOperation]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      if (operationQueueRef.current.length > 0) {
        const operations = [...operationQueueRef.current];
        fetch(`/api/screenplays/${screenplayId}/timelapse/operations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations }),
          keepalive: true,
        }).catch(console.error);
      }
    };
  }, [screenplayId]);

  // Initialize with current content
  const initializeWithContent = useCallback((content: string) => {
    lastContentRef.current = content;
  }, []);

  return {
    recordOperation,
    recordContentChange,
    initializeWithContent,
    flush,
    pendingCount: operationQueueRef.current.length,
  };
}
