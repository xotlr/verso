import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getContextualGreeting,
  getRecentGreetings,
  getRecentCategories,
  addToHistory,
  REFRESH_INTERVAL_MS,
  type GreetingContext,
  type GreetingResult,
  type GreetingCategory,
} from '@/lib/voice/features/greeting';

type GreetingInput = Omit<GreetingContext, 'mounted' | 'sessionSeed' | 'refreshCount'>;

interface UseGreetingOptions {
  /** Whether to log greeting to API */
  logGreeting?: boolean;
}

const SESSION_SEED_KEY = 'greeting-session-seed';
const REFRESH_COUNT_KEY = 'greeting-refresh-count';
const REFRESH_TIMESTAMP_KEY = 'greeting-refresh-timestamp';
const REFRESH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes - reset count after this

/**
 * Get or generate a session seed for greeting variety
 * Each browser tab/session gets a unique seed
 */
function getSessionSeed(): number {
  if (typeof window === 'undefined') return 0;

  // Try to get existing session seed
  const existing = sessionStorage.getItem(SESSION_SEED_KEY);
  if (existing) {
    return parseInt(existing, 10);
  }

  // Generate new random seed for this session
  const newSeed = Math.floor(Math.random() * 10000);
  sessionStorage.setItem(SESSION_SEED_KEY, newSeed.toString());
  return newSeed;
}

/**
 * Track refresh count within a time window
 * Resets after 5 minutes of inactivity
 */
function getAndIncrementRefreshCount(): number {
  if (typeof window === 'undefined') return 0;

  const now = Date.now();
  const lastTimestamp = parseInt(sessionStorage.getItem(REFRESH_TIMESTAMP_KEY) || '0', 10);
  const currentCount = parseInt(sessionStorage.getItem(REFRESH_COUNT_KEY) || '0', 10);

  // Reset if more than 5 minutes since last refresh
  if (now - lastTimestamp > REFRESH_WINDOW_MS) {
    sessionStorage.setItem(REFRESH_COUNT_KEY, '1');
    sessionStorage.setItem(REFRESH_TIMESTAMP_KEY, now.toString());
    return 1;
  }

  // Increment count
  const newCount = currentCount + 1;
  sessionStorage.setItem(REFRESH_COUNT_KEY, newCount.toString());
  sessionStorage.setItem(REFRESH_TIMESTAMP_KEY, now.toString());
  return newCount;
}

/**
 * Stable hash of greeting context for dependency tracking
 * Only includes fields that affect greeting selection
 */
function getContextHash(ctx: GreetingInput): string {
  return [
    ctx.userName ?? '',
    ctx.screenplayCount,
    ctx.wordsThisWeek,
    ctx.wordsToday,
    ctx.totalWordsAllTime,
    ctx.lastEditedGenre ?? '',
    ctx.currentStreak,
    ctx.longestStreak,
    ctx.dailyGoal,
    ctx.lastWriteDate ?? '',
    ctx.recentGreetings.join(','),
    (ctx.recentCategories ?? []).join(','),
    // Activity-aware context
    ctx.lastEdited?.id ?? '',
    ctx.lastEdited?.wordCount ?? 0,
    (ctx.recentActivity ?? []).map(a => a.type + a.createdAt).join(','),
  ].join('|');
}

/**
 * Hook for managing contextual greetings with:
 * - Hydration safety (avoids SSR/client mismatch)
 * - Periodic refresh with visibility awareness
 * - Proper dependency tracking
 * - Fire-and-forget analytics logging
 */
// Default greeting shown during SSR/hydration to prevent flash
const DEFAULT_GREETING: GreetingResult = {
  text: 'Welcome back',
  showName: true,
  category: 'TIME_BASED',
};

export interface UseGreetingReturn extends GreetingResult {
  mounted: boolean;
}

export function useGreeting(
  context: GreetingInput,
  options: UseGreetingOptions = {}
): UseGreetingReturn {
  const { logGreeting = true } = options;

  const [mounted, setMounted] = useState(false);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [greetingLogged, setGreetingLogged] = useState(false);
  const [storedRecentGreetings, setStoredRecentGreetings] = useState<string[]>([]);
  const [storedRecentCategories, setStoredRecentCategories] = useState<GreetingCategory[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set mounted state, session seed, refresh count, and load history after hydration
  useEffect(() => {
    setMounted(true);
    setSessionSeed(getSessionSeed());
    setRefreshCount(getAndIncrementRefreshCount());
    setStoredRecentGreetings(getRecentGreetings());
    setStoredRecentCategories(getRecentCategories());
  }, []);

  // Merge stored history with context-provided history (stored takes precedence for variety)
  const mergedRecentGreetings = useMemo(
    () => [...new Set([...storedRecentGreetings, ...context.recentGreetings])],
    [storedRecentGreetings, context.recentGreetings]
  );
  const mergedRecentCategories = useMemo(
    () => [...new Set([...storedRecentCategories, ...(context.recentCategories ?? [])])],
    [storedRecentCategories, context.recentCategories]
  );

  // Create stable context hash for dependency tracking
  const contextWithHistory = useMemo(
    () => ({
      ...context,
      recentGreetings: mergedRecentGreetings,
      recentCategories: mergedRecentCategories,
    }),
    [context, mergedRecentGreetings, mergedRecentCategories]
  );
  const contextHash = getContextHash(contextWithHistory);

  // Compute greeting based on context (only after mounted to avoid hydration flash)
  const greeting = useMemo(() => {
    // Before mount, return default to avoid SSR/client mismatch
    if (!mounted) {
      return DEFAULT_GREETING;
    }

    // After mount, compute the real greeting with history loaded
    return getContextualGreeting({
      ...contextWithHistory,
      sessionSeed,
      mounted,
      refreshCount,
    });
  }, [contextHash, sessionSeed, mounted, refreshTrigger, refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/stop interval based on visibility
  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, REFRESH_INTERVAL_MS);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle visibility changes to pause/resume interval
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Trigger refresh when becoming visible
        setRefreshTrigger((prev) => prev + 1);
        startInterval();
      }
    };

    // Start interval on mount
    startInterval();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startInterval, stopInterval]);

  // Log the greeting to the API and save to localStorage history
  // Wait for mounted=true so history is loaded before we save
  useEffect(() => {
    if (
      mounted &&
      greeting?.text &&
      greeting?.category &&
      !greetingLogged &&
      context.recentGreetings !== undefined
    ) {
      setGreetingLogged(true);

      // Save to localStorage for future variety filtering
      addToHistory(greeting.text, greeting.category);

      // Fire-and-forget API logging
      if (logGreeting) {
        fetch('/api/greeting/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: greeting.category,
            text: greeting.text,
          }),
        }).catch(() => {
          // Ignore errors - this is fire-and-forget analytics
        });
      }
    }
  }, [mounted, greeting, greetingLogged, context.recentGreetings, logGreeting]);

  return { ...greeting, mounted };
}
