/**
 * Voice Analytics Types
 * Event tracking for greetings, onboarding, and voice features
 */

/**
 * Base analytics event
 */
export interface VoiceEvent {
  /** Event type */
  type: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Session identifier */
  sessionId?: string;
  /** User identifier (anonymized) */
  userId?: string;
}

/**
 * Greeting analytics event
 */
export interface GreetingEvent extends VoiceEvent {
  type: 'greeting_shown' | 'greeting_clicked' | 'greeting_refreshed' | 'greeting_poked';
  /** The greeting category */
  category: string;
  /** The specific greeting text (hashed for privacy) */
  textHash?: string;
  /** Time spent viewing before action (ms) */
  viewDuration?: number;
  /** Number of times greeting was poked/clicked */
  pokeCount?: number;
  /** Whether user took action after greeting */
  actionTaken?: boolean;
  /** User context snapshot */
  context?: {
    screenplayCount?: number;
    streakDays?: number;
    timePeriod?: string;
    isWeekend?: boolean;
  };
}

/**
 * Onboarding analytics event
 */
export interface OnboardingEvent extends VoiceEvent {
  type: 'onboarding_start' | 'onboarding_step' | 'onboarding_complete' | 'onboarding_skip' | 'onboarding_action';
  /** Current step ID */
  stepId?: string;
  /** Current step index (0-based) */
  stepIndex?: number;
  /** Total steps in flow */
  totalSteps?: number;
  /** Time spent on step (ms) */
  stepDuration?: number;
  /** Total time in onboarding (ms) */
  totalDuration?: number;
  /** Variant ID for A/B tracking */
  variantId?: string;
  /** Whether action button was clicked */
  actionClicked?: boolean;
}

/**
 * Empty state analytics event
 */
export interface EmptyStateEvent extends VoiceEvent {
  type: 'empty_state_shown' | 'empty_state_action';
  /** Resource type (screenplays, projects, etc.) */
  resource: string;
  /** Viewer type (owner, viewer, search) */
  viewer: string;
  /** The specific empty state title (hashed) */
  titleHash?: string;
  /** Time until action taken (ms) */
  timeToAction?: number;
}

/**
 * Aggregated metrics for analysis
 */
export interface VoiceMetrics {
  /** Greeting category distribution */
  greetingsByCategory: Record<string, number>;
  /** Greeting engagement rate (clicks/views) */
  greetingEngagement: number;
  /** Average poke count before navigation */
  avgPokeCount: number;
  /** Onboarding completion rate */
  onboardingCompletionRate: number;
  /** Onboarding skip rate */
  onboardingSkipRate: number;
  /** Average onboarding duration (ms) */
  avgOnboardingDuration: number;
  /** Empty state action rate */
  emptyStateActionRate: number;
  /** Most effective greeting categories (by action rate) */
  topGreetingCategories: string[];
  /** Sample period */
  periodStart: number;
  periodEnd: number;
}

/**
 * Analytics configuration
 */
export interface VoiceAnalyticsConfig {
  /** Whether analytics is enabled */
  enabled: boolean;
  /** Whether to log to console in dev */
  debugMode: boolean;
  /** Sample rate (0-1) for event collection */
  sampleRate: number;
  /** Endpoint for sending events */
  endpoint?: string;
  /** Batch size before sending */
  batchSize: number;
  /** Flush interval (ms) */
  flushInterval: number;
}
