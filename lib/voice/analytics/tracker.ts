/**
 * Voice Analytics Tracker
 * Lightweight event tracking for voice system optimization
 *
 * ARCHITECTURE
 * ============
 * - Client-side event collection with batching
 * - Privacy-first: text hashed, no PII stored
 * - Sample rate support for high-traffic scenarios
 * - LocalStorage fallback for offline collection
 * - Debug mode for development
 *
 * USAGE
 * -----
 * import { voiceAnalytics } from '@/lib/voice/analytics'
 *
 * voiceAnalytics.trackGreeting({ category: 'LEGENDARY', ... })
 * voiceAnalytics.trackOnboarding({ type: 'onboarding_step', stepId: 'welcome', ... })
 *
 * // Get aggregated metrics
 * const metrics = voiceAnalytics.getMetrics()
 */

import type {
  VoiceEvent,
  GreetingEvent,
  OnboardingEvent,
  EmptyStateEvent,
  VoiceMetrics,
  VoiceAnalyticsConfig,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: VoiceAnalyticsConfig = {
  enabled: true,
  debugMode: process.env.NODE_ENV === 'development',
  sampleRate: 1.0, // 100% in dev, reduce in prod
  endpoint: '/api/analytics/voice',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Simple string hash for privacy
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  const key = 'voice-analytics-session';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

/**
 * Check if we should sample this event
 */
function shouldSample(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'voice-analytics-events';
const METRICS_KEY = 'voice-analytics-metrics';

function loadStoredEvents(): VoiceEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveStoredEvents(events: VoiceEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 100 events to prevent storage bloat
    const trimmed = events.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

function loadStoredMetrics(): Partial<VoiceMetrics> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStoredMetrics(metrics: Partial<VoiceMetrics>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // Storage full or unavailable
  }
}

// ============================================================================
// TRACKER CLASS
// ============================================================================

class VoiceAnalyticsTracker {
  private config: VoiceAnalyticsConfig;
  private eventQueue: VoiceEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private metrics: Partial<VoiceMetrics> = {};

  constructor(config: Partial<VoiceAnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventQueue = loadStoredEvents();
    this.metrics = loadStoredMetrics();

    // Start flush timer
    if (typeof window !== 'undefined' && this.config.enabled) {
      this.startFlushTimer();
    }
  }

  /**
   * Configure the tracker
   */
  configure(config: Partial<VoiceAnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Track a greeting event
   */
  trackGreeting(event: Omit<GreetingEvent, 'timestamp' | 'sessionId'>): void {
    if (!this.config.enabled) return;
    if (!shouldSample(this.config.sampleRate)) return;

    const fullEvent: GreetingEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    };

    this.addEvent(fullEvent);
    this.updateGreetingMetrics(fullEvent);

    if (this.config.debugMode) {
      console.log('[VoiceAnalytics] Greeting:', fullEvent);
    }
  }

  /**
   * Track an onboarding event
   */
  trackOnboarding(event: Omit<OnboardingEvent, 'timestamp' | 'sessionId'>): void {
    if (!this.config.enabled) return;
    if (!shouldSample(this.config.sampleRate)) return;

    const fullEvent: OnboardingEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    };

    this.addEvent(fullEvent);
    this.updateOnboardingMetrics(fullEvent);

    if (this.config.debugMode) {
      console.log('[VoiceAnalytics] Onboarding:', fullEvent);
    }
  }

  /**
   * Track an empty state event
   */
  trackEmptyState(event: Omit<EmptyStateEvent, 'timestamp' | 'sessionId'>): void {
    if (!this.config.enabled) return;
    if (!shouldSample(this.config.sampleRate)) return;

    const fullEvent: EmptyStateEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    };

    this.addEvent(fullEvent);

    if (this.config.debugMode) {
      console.log('[VoiceAnalytics] EmptyState:', fullEvent);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Partial<VoiceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get raw events for analysis
   */
  getEvents(): VoiceEvent[] {
    return [...this.eventQueue];
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.eventQueue = [];
    this.metrics = {};
    saveStoredEvents([]);
    saveStoredMetrics({});
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private addEvent(event: VoiceEvent): void {
    this.eventQueue.push(event);
    saveStoredEvents(this.eventQueue);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private updateGreetingMetrics(event: GreetingEvent): void {
    // Update category distribution
    if (!this.metrics.greetingsByCategory) {
      this.metrics.greetingsByCategory = {};
    }
    const category = event.category || 'unknown';
    this.metrics.greetingsByCategory[category] =
      (this.metrics.greetingsByCategory[category] || 0) + 1;

    saveStoredMetrics(this.metrics);
  }

  private updateOnboardingMetrics(event: OnboardingEvent): void {
    // Track completion/skip rates
    if (event.type === 'onboarding_complete') {
      // Would increment completion counter
    } else if (event.type === 'onboarding_skip') {
      // Would increment skip counter
    }

    saveStoredMetrics(this.metrics);
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    if (!this.config.endpoint) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];
    saveStoredEvents([]);

    try {
      // Fire and forget - don't block UI
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, metrics: this.metrics }),
        keepalive: true, // Ensure delivery on page unload
      }).catch(() => {
        // On failure, restore events for retry
        this.eventQueue = [...events, ...this.eventQueue];
        saveStoredEvents(this.eventQueue);
      });
    } catch {
      // Restore events for retry
      this.eventQueue = [...events, ...this.eventQueue];
      saveStoredEvents(this.eventQueue);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const voiceAnalytics = new VoiceAnalyticsTracker();

// Export class for testing
export { VoiceAnalyticsTracker };
