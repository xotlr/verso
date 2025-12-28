/**
 * Name Matcher
 * O(1) lookup via pre-built pattern index
 */

import type { NameMatch, NameEntry } from './types';
import { KNOWN_NAMES } from './registry';

/**
 * Build pattern index at module load
 * Every pattern → its entry directly
 */
function buildIndex(): Map<string, NameEntry> {
  const index = new Map<string, NameEntry>();

  for (const [key, personality] of Object.entries(KNOWN_NAMES)) {
    const entry: NameEntry = { ...personality, key };
    for (const pattern of personality.match) {
      index.set(pattern, entry);
    }
  }

  return index;
}

const INDEX = buildIndex();

/**
 * Normalize a name for matching
 */
function normalize(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Check if a user name matches any known filmmaker
 * O(1) lookup via pattern index
 */
export function matchName(userName: string | null | undefined): NameMatch | null {
  if (!userName) return null;

  const normalized = normalize(userName);
  const firstName = normalized.split(' ')[0];
  const lastName = normalized.split(' ').pop() || '';

  // Three hash lookups max: O(3) instead of O(n×m)
  const entry = INDEX.get(normalized) || INDEX.get(firstName) || INDEX.get(lastName);

  if (!entry) return null;

  return {
    key: entry.key,
    personality: entry,
    displayName: entry.displayName || userName.split(' ')[0],
  };
}

/**
 * Determine if a name-based greeting should trigger based on frequency
 */
export function shouldTrigger(frequency: number, seed?: number): boolean {
  const random = seed !== undefined ? (seed % 100) / 100 : Math.random();
  return random < frequency;
}

/**
 * Get a random greeting from a name's pool
 */
export function getNameGreeting(match: NameMatch, seed?: number): string {
  const pool = match.personality.greetings;
  const index = seed !== undefined ? seed % pool.length : Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Get an onboarding message for a matched name (if special one exists)
 */
export function getNameOnboarding(match: NameMatch, seed?: number): string | null {
  const pool = match.personality.onboarding;
  if (!pool || pool.length === 0) return null;

  const index = seed !== undefined ? seed % pool.length : Math.floor(Math.random() * pool.length);
  return pool[index];
}
