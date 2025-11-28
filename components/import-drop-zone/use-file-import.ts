'use client';

/**
 * useFileImport Hook
 *
 * Handles file import logic with progress reporting and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { parseScreenplay } from '@/lib/parsers';
import {
  ImportState,
  ImportProgress,
  ImportResult,
  UseFileImportOptions,
  UseFileImportReturn,
} from './types';

export function useFileImport(options?: UseFileImportOptions): UseFileImportReturn {
  const { onProgress, onSuccess, onError } = options || {};

  const [state, setState] = useState<ImportState>('idle');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Abort controller for cancellation
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Handle progress updates from parser
   */
  const handleProgress = useCallback(
    (parseProgress: ImportProgress) => {
      setProgress(parseProgress);
      onProgress?.(parseProgress);
    },
    [onProgress]
  );

  /**
   * Import from an ArrayBuffer
   */
  const importBuffer = useCallback(
    async (buffer: ArrayBuffer, filename: string) => {
      // Cancel any existing import
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState('processing');
      setError(null);
      setResult(null);

      try {
        handleProgress({
          stage: 'reading',
          percent: 0,
          message: 'Starting import...',
          filename,
        });

        // Parse the content
        const parseResult = await parseScreenplay(buffer, {
          filename,
          onProgress: (p) => handleProgress({ ...p, filename }),
        });

        if (!parseResult.success) {
          throw new Error(parseResult.error);
        }

        // Calculate word count
        const wordCount = parseResult.content
          .split(/\s+/)
          .filter((w) => w.length > 0).length;

        const importResult: ImportResult = {
          success: true,
          content: parseResult.content,
          title: parseResult.titlePage.title,
          format: parseResult.format,
          scenes: parseResult.scenes,
          elements: parseResult.elements,
          wordCount,
          warnings: parseResult.warnings,
        };

        setResult(importResult);
        setState('success');
        onSuccess?.(importResult);

        // Auto-reset after success
        setTimeout(() => {
          setState('idle');
        }, 2000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Import failed';
        setError(errorMessage);
        setState('error');
        onError?.(errorMessage);
      }
    },
    [handleProgress, onSuccess, onError]
  );

  /**
   * Import from a File object
   */
  const importFile = useCallback(
    async (file: File) => {
      handleProgress({
        stage: 'reading',
        percent: 0,
        message: `Reading ${file.name}...`,
        filename: file.name,
      });

      try {
        const buffer = await file.arrayBuffer();
        await importBuffer(buffer, file.name);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
        setError(errorMessage);
        setState('error');
        onError?.(errorMessage);
      }
    },
    [importBuffer, handleProgress, onError]
  );

  /**
   * Reset state to idle
   */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setProgress(null);
    setError(null);
    setResult(null);
  }, []);

  return {
    state,
    progress,
    error,
    result,
    importFile,
    importBuffer,
    reset,
    isProcessing: state === 'processing',
  };
}
