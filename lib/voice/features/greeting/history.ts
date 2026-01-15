/**
 * Greeting History
 * Persists shown greetings to localStorage for variety tracking
 */

import type { GreetingCategory } from './types';

const STORAGE_KEY = 'verso-greeting-history';
const CATEGORY_STORAGE_KEY = 'verso-greeting-category-history';
const MAX_HISTORY = 30;
const MAX_CATEGORY_HISTORY = 10;

/**
 * Get recently shown greeting texts from localStorage
 */
export function getRecentGreetings(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Get recently shown greeting categories from localStorage
 */
export function getRecentCategories(): GreetingCategory[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Add a greeting to history (idempotent - won't add if already most recent)
 */
export function addToHistory(greeting: string, category: GreetingCategory): void {
  if (typeof window === 'undefined') return;

  // Update greeting text history
  const greetings = getRecentGreetings();
  if (greetings[0] !== greeting) {
    greetings.unshift(greeting);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(greetings.slice(0, MAX_HISTORY)));
  }

  // Update category history
  const categories = getRecentCategories();
  if (categories[0] !== category) {
    categories.unshift(category);
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories.slice(0, MAX_CATEGORY_HISTORY)));
  }
}

/**
 * Clear greeting history (useful for testing)
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CATEGORY_STORAGE_KEY);
}
