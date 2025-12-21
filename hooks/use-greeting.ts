import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getContextualGreeting, type GreetingContext, type GreetingResult } from '@/lib/greeting';
import { REFRESH_INTERVAL_MS } from '@/lib/greeting/constants';

type GreetingInput = Omit<GreetingContext, 'mounted' | 'sessionSeed'>;

interface UseGreetingOptions {
  /** Whether to log greeting to API */
  logGreeting?: boolean;
}

const SESSION_SEED_KEY = 'greeting-session-seed';

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
  ].join('|');
}

/**
 * Hook for managing contextual greetings with:
 * - Hydration safety (avoids SSR/client mismatch)
 * - Periodic refresh with visibility awareness
 * - Proper dependency tracking
 * - Fire-and-forget analytics logging
 */
export function useGreeting(
  context: GreetingInput,
  options: UseGreetingOptions = {}
): GreetingResult {
  const { logGreeting = true } = options;

  const [mounted, setMounted] = useState(false);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [greetingLogged, setGreetingLogged] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set mounted state and session seed after hydration
  useEffect(() => {
    setMounted(true);
    setSessionSeed(getSessionSeed());
  }, []);

  // Create stable context hash for dependency tracking
  const contextHash = getContextHash(context);

  // Compute greeting based on context
  const greeting = useMemo(
    () => getContextualGreeting({
      ...context,
      sessionSeed,
      mounted,
    }),
    [contextHash, sessionSeed, mounted, refreshTrigger] // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  // Log the greeting to the API (fire-and-forget, once per page load)
  useEffect(() => {
    if (
      logGreeting &&
      greeting?.text &&
      greeting?.category &&
      !greetingLogged &&
      context.recentGreetings !== undefined
    ) {
      setGreetingLogged(true);
      // Fire-and-forget - don't await
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
  }, [greeting, greetingLogged, context.recentGreetings, logGreeting]);

  return greeting;
}
