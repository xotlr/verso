/**
 * usePagination Hook
 *
 * React hook for integrating the Verso pagination engine with the editor.
 * Handles debouncing, caching, and provides utilities for page navigation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import {
  serializeDocument,
  createPositionMap,
  runPagination,
  DEFAULT_FEATURE_FILM_CONFIG,
  type PaginationResult,
  type PageConfig,
  type PageIdentifier,
  type PositionMap,
} from '@/lib/verso';

export interface UsePaginationOptions {
  /** Debounce delay in milliseconds (default: 150) */
  debounceMs?: number;
  /** Configuration to use (default: Feature Film) */
  config?: PageConfig;
  /** Whether pagination is enabled (default: true) */
  enabled?: boolean;
}

export interface UsePaginationReturn {
  /** Current pagination result */
  result: PaginationResult | null;
  /** Whether pagination is in progress */
  isPending: boolean;
  /** Current page count */
  pageCount: number;
  /** Get the page for a given document position */
  getPageAtPosition: (pos: number) => PageIdentifier | null;
  /** Get the page for a given element ID */
  getPageForElement: (elementId: string) => PageIdentifier | null;
  /** Force a recalculation */
  recalculate: () => void;
  /** Last error, if any */
  error: Error | null;
  /** Timing stats */
  timing: { lastDurationMs: number } | null;
  /** Whether WASM engine is loaded and working */
  isWasmReady: boolean;
  /** Get the position map that was created during serialization (for decoration mapping) */
  getPositionMap: () => PositionMap | null;
}

/**
 * Hook for running pagination on a ProseMirror document
 */
export function usePagination(
  doc: ProseMirrorNode | null,
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    debounceMs = 150,
    config = DEFAULT_FEATURE_FILM_CONFIG,
    enabled = true,
  } = options;

  const [result, setResult] = useState<PaginationResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timing, setTiming] = useState<{ lastDurationMs: number } | null>(null);

  const positionMapRef = useRef<PositionMap | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDocRef = useRef<ProseMirrorNode | null>(null);
  const docVersionRef = useRef(0); // Track document version to discard stale results

  /**
   * Run pagination on the current document
   */
  const runPaginationOnDoc = useCallback(async () => {
    if (!doc || !enabled) {
      return;
    }

    // Increment version and capture it for this request
    docVersionRef.current++;
    const thisVersion = docVersionRef.current;

    setIsPending(true);
    setError(null);

    const startTime = performance.now();

    try {
      // Serialize the document
      const elements = serializeDocument(doc);

      // Create position map
      positionMapRef.current = createPositionMap(doc);

      // Debug: Log serialized elements (comment out in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePagination] Serialized elements:', elements.length, 'version:', thisVersion);
      }

      // Run pagination
      const paginationResult = await runPagination(elements, config);

      // CRITICAL: Discard stale results if document changed while we were waiting
      if (thisVersion !== docVersionRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[usePagination] Discarding stale result (version', thisVersion, 'vs current', docVersionRef.current, ')');
        }
        return; // Don't update state with stale result
      }

      // Debug: Log WASM result with diagnostic stats
      if (process.env.NODE_ENV === 'development') {
        console.log('[usePagination] WASM result:', {
          pageCount: paginationResult.stats.page_count,
          elementCount: paginationResult.stats.element_count,
          totalLines: paginationResult.stats.total_lines,
          avgLinesPerElement: paginationResult.stats.avg_lines_per_element?.toFixed(2),
          durationMs: performance.now() - startTime,
        });
      }

      setResult(paginationResult);
      setTiming({ lastDurationMs: performance.now() - startTime });
    } catch (err) {
      // Only set error if this is still the current version
      if (thisVersion === docVersionRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error('[usePagination] Error:', err);
      }
    } finally {
      // Only clear pending if this is still the current version
      if (thisVersion === docVersionRef.current) {
        setIsPending(false);
      }
    }
  }, [doc, config, enabled]);

  /**
   * Debounced pagination trigger with dynamic delay for large documents
   */
  useEffect(() => {
    if (!enabled || !doc) {
      return;
    }

    // Skip if document hasn't changed
    if (doc === lastDocRef.current) {
      return;
    }
    lastDocRef.current = doc;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Dynamic debounce: longer delay for larger documents to reduce CPU load
    const elementCount = doc.content.childCount;
    const dynamicDebounce = elementCount > 500
      ? 500  // Very large doc (100+ pages): 500ms debounce
      : elementCount > 100
        ? 300  // Large doc (20+ pages): 300ms debounce
        : debounceMs; // Normal: use provided debounce

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      runPaginationOnDoc();
    }, dynamicDebounce);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [doc, enabled, debounceMs, runPaginationOnDoc]);

  /**
   * Get the page for a given document position
   */
  const getPageAtPosition = useCallback((pos: number): PageIdentifier | null => {
    if (!result || !positionMapRef.current) {
      return null;
    }

    const elementId = positionMapRef.current.posToElement(pos);
    if (!elementId) {
      return null;
    }

    const elementPos = result.element_positions[elementId];
    if (!elementPos || elementPos.pages.length === 0) {
      return null;
    }

    return elementPos.pages[0];
  }, [result]);

  /**
   * Get the page for a given element ID
   */
  const getPageForElement = useCallback((elementId: string): PageIdentifier | null => {
    if (!result) {
      return null;
    }

    const elementPos = result.element_positions[elementId];
    if (!elementPos || elementPos.pages.length === 0) {
      return null;
    }

    return elementPos.pages[0];
  }, [result]);

  /**
   * Force a recalculation
   */
  const recalculate = useCallback(() => {
    lastDocRef.current = null; // Force change detection
    runPaginationOnDoc();
  }, [runPaginationOnDoc]);

  /**
   * Get the position map that was created during serialization.
   * This map corresponds to the document that was used for the current result.
   */
  const getPositionMap = useCallback(() => {
    return positionMapRef.current;
  }, []);

  // WASM is ready if we've successfully gotten a result at least once
  const isWasmReady = result !== null && error === null;

  return {
    result,
    isPending,
    pageCount: result?.stats.page_count ?? 0,
    getPageAtPosition,
    getPageForElement,
    recalculate,
    error,
    timing,
    isWasmReady,
    getPositionMap,
  };
}

/**
 * Hook for getting the current page based on cursor position
 */
export function useCurrentPage(
  paginationResult: PaginationResult | null,
  cursorPos: number,
  positionMap: PositionMap | null
): PageIdentifier | null {
  const [currentPage, setCurrentPage] = useState<PageIdentifier | null>(null);

  useEffect(() => {
    if (!paginationResult || !positionMap) {
      setCurrentPage(null);
      return;
    }

    const elementId = positionMap.posToElement(cursorPos);
    if (!elementId) {
      setCurrentPage(null);
      return;
    }

    const elementPos = paginationResult.element_positions[elementId];
    if (!elementPos || elementPos.pages.length === 0) {
      setCurrentPage(null);
      return;
    }

    setCurrentPage(elementPos.pages[0]);
  }, [paginationResult, cursorPos, positionMap]);

  return currentPage;
}
