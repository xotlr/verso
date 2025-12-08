import { useState, useEffect, useMemo } from 'react';
import { getContextualGreeting, type GreetingContext, type GreetingResult } from '@/lib/greeting';

type GreetingInput = Omit<GreetingContext, 'mounted'>;

interface UseGreetingOptions {
  /** Whether to log greeting to API */
  logGreeting?: boolean;
}

/**
 * Hook for managing contextual greetings with hydration safety and periodic refresh
 */
export function useGreeting(
  context: GreetingInput,
  options: UseGreetingOptions = {}
): GreetingResult {
  const { logGreeting = true } = options;

  const [mounted, setMounted] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [greetingLogged, setGreetingLogged] = useState(false);

  // Set mounted state after hydration to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute greeting based on context
  const greeting = useMemo(
    () => getContextualGreeting({
      ...context,
      mounted,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      context.userName,
      context.screenplayCount,
      context.recentGreetings,
      forceRefresh,
      mounted,
    ]
  );

  // Refresh greeting every minute (only on client, after hydration)
  useEffect(() => {
    const interval = setInterval(() => {
      setForceRefresh((prev) => prev + 1);
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Log the greeting to the API (fire-and-forget, debounced)
  useEffect(() => {
    // Only log once per page load when greeting is available
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
        // Ignore errors - this is fire-and-forget
      });
    }
  }, [greeting, greetingLogged, context.recentGreetings, logGreeting]);

  return greeting;
}
