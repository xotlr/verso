/**
 * Voice System Utilities
 * Shared functions for copy selection and variety management
 */

import type { TimePeriod, SelectionContext, PoolSelector } from './types';

const MS_PER_DAY = 86400000;

// Time boundaries
const MORNING_START = 5;
const AFTERNOON_START = 12;
const EVENING_START = 17;
const NIGHT_START = 21;

/**
 * Get a random item from an array
 */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get daily seed for consistent selection throughout the day
 */
export function getDailySeed(mounted = true): number {
  return mounted ? Math.floor(Date.now() / MS_PER_DAY) : 0;
}

/**
 * Get or create a session seed
 */
export function getSessionSeed(key = 'voice-session-seed'): number {
  if (typeof window === 'undefined') return 0;

  const existing = sessionStorage.getItem(key);
  if (existing) return parseInt(existing, 10);

  const newSeed = Math.floor(Math.random() * 10000);
  sessionStorage.setItem(key, newSeed.toString());
  return newSeed;
}

/**
 * Combine seeds for variety
 */
export function combineSeed(dailySeed: number, sessionSeed: number): number {
  return dailySeed + sessionSeed;
}

/**
 * Smart picker that avoids recently shown items
 */
export function createSmartPicker(ctx: SelectionContext): PoolSelector {
  const excluded = new Set(ctx.recentTexts ?? []);
  const seed = combineSeed(ctx.dailySeed ?? getDailySeed(), ctx.sessionSeed ?? 0);

  return (variants: string[]): string => {
    const available = variants.filter(v => !excluded.has(v));
    const pool = available.length > 0 ? available : variants;
    return pool[seed % pool.length];
  };
}

/**
 * Pick from pool avoiding recently shown
 */
export function pickSmart(
  pool: string[],
  recentlyShown: string[],
  seed: number
): string {
  const excluded = new Set(recentlyShown);
  const available = pool.filter(g => !excluded.has(g));
  const targetPool = available.length > 0 ? available : pool;
  return targetPool[seed % targetPool.length];
}

/**
 * Get current time period
 */
export function getTimePeriod(hour?: number): TimePeriod {
  const h = hour ?? new Date().getHours();
  if (h >= MORNING_START && h < AFTERNOON_START) return 'morning';
  if (h >= AFTERNOON_START && h < EVENING_START) return 'afternoon';
  if (h >= EVENING_START && h < NIGHT_START) return 'evening';
  return 'night';
}

/**
 * Check if it's a weekend
 */
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Days since a date
 */
export function daysSince(dateString: string | null): number | null {
  if (!dateString) return null;

  const then = new Date(dateString);
  const now = new Date();

  const thenUTC = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.floor((nowUTC - thenUTC) / MS_PER_DAY);
}

// Patterns for name detection
const SKIP_NAME_PATTERN = /\byou\b|\byour\b|[.!?]$|awaits|begins|activated|engaged|incoming|loading|mode:|thickens|calling|strikes|flows|blinks|fears|counts|misses/i;
const DIRECT_ADDRESS_PATTERN = /^(good (morning|afternoon|evening|night)|welcome|hey|hello|hi\b|happy)/i;

/**
 * Check if copy works with a name appended
 */
export function shouldAppendName(text: string): boolean {
  if (SKIP_NAME_PATTERN.test(text)) return false;
  if (DIRECT_ADDRESS_PATTERN.test(text)) return true;

  const wordCount = text.split(' ').length;
  if (wordCount <= 3 && !text.includes(':')) return true;

  return false;
}
