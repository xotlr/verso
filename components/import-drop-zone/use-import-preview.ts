'use client';

/**
 * useImportPreview Hook
 *
 * Extends useFileImport to add a preview step before confirming import.
 * Shows the ImportPreviewDialog with parsed content and waits for user confirmation.
 */

import { useState, useCallback, useRef } from 'react';
import { parseScreenplay } from '@/lib/parsers';
import type { ParseResult } from '@/lib/parsers/types';
import { ImportProgress, ImportResult, UseFileImportOptions } from './types';

export interface PreviewData {
  content: string;
  rawContent: string;
  title?: string;
  format?: string;
  scenes: ParseResult['scenes'];
  elements: ParseResult['elements'];
  warnings: ParseResult['warnings'];
  wordCount: number;
  filename: string;
}

export interface UseImportPreviewOptions extends UseFileImportOptions {
  /** Called when preview is ready (opens dialog) */
  onPreviewReady?: (data: PreviewData) => void;
  /** Whether to skip preview and import directly */
  skipPreview?: boolean;
}

export interface UseImportPreviewReturn {
  /** Current import state */
  state: 'idle' | 'processing' | 'preview' | 'confirming' | 'success' | 'error';
  /** Progress information */
  progress: ImportProgress | null;
  /** Error message if state is 'error' */
  error: string | null;
  /** Preview data when state is 'preview' */
  previewData: PreviewData | null;
  /** Import result if state is 'success' */
  result: ImportResult | null;
  /** Start import from a File */
  importFile: (file: File) => Promise<void>;
  /** Start import from an ArrayBuffer */
  importBuffer: (buffer: ArrayBuffer, filename: string) => Promise<void>;
  /** Confirm the previewed import */
  confirmImport: () => void;
  /** Cancel the preview */
  cancelPreview: () => void;
  /** Reset state to idle */
  reset: () => void;
  /** Whether import is in progress */
  isProcessing: boolean;
  /** Whether preview is showing */
  isPreviewOpen: boolean;
}

export function useImportPreview(options?: UseImportPreviewOptions): UseImportPreviewReturn {
  const { onProgress, onSuccess, onError, onPreviewReady, skipPreview = false } = options || {};

  const [state, setState] = useState<UseImportPreviewReturn['state']>('idle');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Store the raw parse result for confirmation
  const parseResultRef = useRef<ParseResult | null>(null);

  const handleProgress = useCallback(
    (parseProgress: ImportProgress) => {
      setProgress(parseProgress);
      onProgress?.(parseProgress);
    },
    [onProgress]
  );

  const importBuffer = useCallback(
    async (buffer: ArrayBuffer, filename: string) => {
      setState('processing');
      setError(null);
      setResult(null);
      setPreviewData(null);

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

        // Store parse result for later confirmation
        parseResultRef.current = parseResult;

        // If skipPreview, go straight to success
        if (skipPreview) {
          const importResult: ImportResult = {
            success: true,
            content: parseResult.content,
            title: parseResult.titlePage.title,
            format: parseResult.format,
            scenes: parseResult.scenes,
            elements: parseResult.elements,
            wordCount,
            warnings: parseResult.warnings,
            titlePage: parseResult.titlePage,
          };

          setResult(importResult);
          setState('success');
          onSuccess?.(importResult);

          setTimeout(() => setState('idle'), 2000);
          return;
        }

        // Prepare preview data
        const preview: PreviewData = {
          content: parseResult.content,
          rawContent: parseResult.rawContent,
          title: parseResult.titlePage.title,
          format: parseResult.format,
          scenes: parseResult.scenes,
          elements: parseResult.elements,
          warnings: parseResult.warnings,
          wordCount,
          filename,
        };

        setPreviewData(preview);
        setState('preview');
        onPreviewReady?.(preview);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Import failed';
        setError(errorMessage);
        setState('error');
        onError?.(errorMessage);
      }
    },
    [handleProgress, onSuccess, onError, onPreviewReady, skipPreview]
  );

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

  const confirmImport = useCallback(() => {
    if (!previewData || !parseResultRef.current) return;

    setState('confirming');

    const importResult: ImportResult = {
      success: true,
      content: previewData.content,
      title: previewData.title,
      format: previewData.format as ImportResult['format'],
      scenes: previewData.scenes,
      elements: previewData.elements,
      wordCount: previewData.wordCount,
      warnings: parseResultRef.current.warnings,
      titlePage: parseResultRef.current.titlePage,
    };

    setResult(importResult);
    setState('success');
    onSuccess?.(importResult);

    // Clean up
    setPreviewData(null);
    parseResultRef.current = null;

    setTimeout(() => setState('idle'), 2000);
  }, [previewData, onSuccess]);

  const cancelPreview = useCallback(() => {
    setState('idle');
    setPreviewData(null);
    setProgress(null);
    parseResultRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(null);
    setError(null);
    setPreviewData(null);
    setResult(null);
    parseResultRef.current = null;
  }, []);

  return {
    state,
    progress,
    error,
    previewData,
    result,
    importFile,
    importBuffer,
    confirmImport,
    cancelPreview,
    reset,
    isProcessing: state === 'processing' || state === 'confirming',
    isPreviewOpen: state === 'preview',
  };
}
