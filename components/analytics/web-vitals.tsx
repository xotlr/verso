'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useCallback } from 'react';

interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

/**
 * Web Vitals monitoring component.
 * Collects Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP) and stores them for analysis.
 *
 * In development: Logs to console
 * In production: Sends to analytics endpoint (if configured) and stores locally
 */
export function WebVitals() {
  const handleMetric = useCallback((metric: WebVitalsMetric) => {
    // Development: Log to console with color coding
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        good: '\x1b[32m', // green
        'needs-improvement': '\x1b[33m', // yellow
        poor: '\x1b[31m', // red
      };
      const reset = '\x1b[0m';
      const color = colors[metric.rating] || reset;

      console.log(
        `[Web Vitals] ${color}${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})${reset}`
      );
    }

    // Production: Send to analytics endpoint if configured
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
    ) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          delta: metric.delta,
          navigationType: metric.navigationType,
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          timestamp: Date.now(),
        }),
        // Use keepalive to ensure the request completes even if page unloads
        keepalive: true,
      }).catch(() => {
        // Silently fail - analytics should never break the app
      });
    }

    // Store in localStorage for local debugging (both dev and prod)
    if (typeof window !== 'undefined') {
      try {
        const storageKey = 'verso_web_vitals';
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        stored.push({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          page: window.location.pathname,
          timestamp: Date.now(),
        });
        // Keep last 100 entries to prevent storage bloat
        const trimmed = stored.slice(-100);
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
      } catch {
        // localStorage might be full or disabled
      }
    }
  }, []);

  useReportWebVitals(handleMetric);

  // This component renders nothing
  return null;
}
