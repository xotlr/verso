/**
 * Index Cards Storage Utilities
 *
 * Shared functions for loading index cards from localStorage.
 */

import { safeGetItem } from '@/lib/storage';
import type { IndexCard } from '@/components/index-cards';

/**
 * Get the localStorage key for index cards.
 */
export function getIndexCardsStorageKey(screenplayId: string): string {
  return `verso-cards-${screenplayId}`;
}

/**
 * Load index cards from localStorage for a screenplay.
 */
export function loadIndexCards(screenplayId: string): IndexCard[] {
  const result = safeGetItem<IndexCard[]>(getIndexCardsStorageKey(screenplayId));
  if (result.success && result.data) {
    return result.data;
  }
  return [];
}
