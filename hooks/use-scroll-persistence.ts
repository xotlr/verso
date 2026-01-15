'use client';

import { useEffect, useRef, useCallback } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';

const SCROLL_STORAGE_KEY_PREFIX = 'verso-scroll-';
const DEBOUNCE_MS = 500;

interface UseScrollPersistenceOptions {
  /** Unique identifier for the document (e.g., screenplayId) */
  documentId: string;
  /** Whether persistence is enabled */
  enabled?: boolean;
}

/**
 * Hook to persist and restore scroll position for a document.
 * Saves scroll position to localStorage on scroll (debounced).
 * Restores scroll position when the document is reopened.
 */
export function useScrollPersistence({
  documentId,
  enabled = true,
}: UseScrollPersistenceOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);

  const storageKey = `${SCROLL_STORAGE_KEY_PREFIX}${documentId}`;

  // Save scroll position (debounced)
  const saveScrollPosition = useCallback(() => {
    if (!enabled || !scrollContainerRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const scrollTop = scrollContainerRef.current?.scrollTop;
      if (scrollTop !== undefined && scrollTop > 0) {
        safeSetItem(storageKey, scrollTop);
      }
    }, DEBOUNCE_MS);
  }, [enabled, storageKey]);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (!enabled || !scrollContainerRef.current || hasRestoredRef.current) return;

    const result = safeGetItem<number>(storageKey);
    if (result.success && result.data !== undefined && result.data > 0) {
      const scrollTop = result.data;
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollTop;
          hasRestoredRef.current = true;
        }
      });
    }
  }, [enabled, storageKey]);

  // Attach scroll listener
  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', saveScrollPosition, { passive: true });

    return () => {
      container.removeEventListener('scroll', saveScrollPosition);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, saveScrollPosition]);

  // Restore on mount (with delay to ensure content is loaded)
  useEffect(() => {
    if (!enabled) return;

    // Delay restoration to ensure editor content is fully rendered
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 100);

    return () => clearTimeout(timer);
  }, [enabled, restoreScrollPosition]);

  // Reset restoration flag when documentId changes
  useEffect(() => {
    hasRestoredRef.current = false;
  }, [documentId]);

  return {
    scrollContainerRef,
    saveScrollPosition,
    restoreScrollPosition,
  };
}
