/**
 * Voice A/B Testing Framework
 * Lightweight experimentation for voice system optimization
 *
 * ARCHITECTURE
 * ============
 * - User bucketing based on consistent hash (user stays in same bucket)
 * - Feature flags for quick enable/disable
 * - Metrics collection for analysis
 * - Zero external dependencies
 *
 * USAGE
 * -----
 * // Define an experiment
 * const greeting = experiments.getVariant('greeting-tone-test', userId, {
 *   control: { tone: 'casual' },
 *   variant_a: { tone: 'playful' },
 *   variant_b: { tone: 'minimal' },
 * })
 *
 * // Track conversion
 * experiments.trackEvent('greeting-tone-test', userId, 'clicked')
 *
 * // Get results
 * const results = experiments.getResults('greeting-tone-test')
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Experiment {
  /** Unique experiment ID */
  id: string;
  /** Human-readable description */
  description?: string;
  /** Whether experiment is active */
  enabled: boolean;
  /** Traffic percentage (0-100) to include in experiment */
  trafficPercent: number;
  /** Variant weights (must sum to 100) */
  variants: Record<string, number>;
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
}

export interface ExperimentConfig<T> {
  control: T;
  [variantName: string]: T;
}

export interface ExperimentEvent {
  experimentId: string;
  variant: string;
  event: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ExperimentResults {
  experimentId: string;
  variants: Record<string, {
    participants: number;
    events: Record<string, number>;
    conversionRate?: number;
  }>;
  startTime?: number;
  lastEventTime?: number;
}

// ============================================================================
// STORAGE
// ============================================================================

const EXPERIMENTS_KEY = 'voice-experiments';
const EVENTS_KEY = 'voice-experiment-events';
const ASSIGNMENTS_KEY = 'voice-experiment-assignments';

function loadExperiments(): Record<string, Experiment> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(EXPERIMENTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveExperiments(experiments: Record<string, Experiment>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
  } catch {
    // Storage unavailable
  }
}

function loadEvents(): ExperimentEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: ExperimentEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 1000 events
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-1000)));
  } catch {
    // Storage unavailable
  }
}

function loadAssignments(): Record<string, Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveAssignments(assignments: Record<string, Record<string, string>>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch {
    // Storage unavailable
  }
}

// ============================================================================
// HASHING
// ============================================================================

/**
 * Simple hash function for consistent bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get bucket (0-99) for a user/experiment combination
 */
function getBucket(userId: string, experimentId: string): number {
  return hashString(`${userId}-${experimentId}`) % 100;
}

// ============================================================================
// EXPERIMENTS CLASS
// ============================================================================

class VoiceExperiments {
  private experiments: Record<string, Experiment> = {};
  private events: ExperimentEvent[] = [];
  private assignments: Record<string, Record<string, string>> = {};

  constructor() {
    this.experiments = loadExperiments();
    this.events = loadEvents();
    this.assignments = loadAssignments();
  }

  /**
   * Register an experiment
   */
  register(experiment: Experiment): void {
    this.experiments[experiment.id] = experiment;
    saveExperiments(this.experiments);
  }

  /**
   * Disable an experiment
   */
  disable(experimentId: string): void {
    if (this.experiments[experimentId]) {
      this.experiments[experimentId].enabled = false;
      saveExperiments(this.experiments);
    }
  }

  /**
   * Get variant for a user
   */
  getVariant<T>(
    experimentId: string,
    userId: string | undefined,
    config: ExperimentConfig<T>
  ): { variant: string; value: T } {
    const experiment = this.experiments[experimentId];

    // If no experiment or disabled, return control
    if (!experiment?.enabled) {
      return { variant: 'control', value: config.control };
    }

    // Check if user is in traffic percentage
    const uid = userId || 'anonymous';
    const bucket = getBucket(uid, experimentId);

    if (bucket >= experiment.trafficPercent) {
      return { variant: 'control', value: config.control };
    }

    // Check for existing assignment
    if (this.assignments[experimentId]?.[uid]) {
      const variant = this.assignments[experimentId][uid];
      return { variant, value: config[variant] ?? config.control };
    }

    // Assign variant based on weights
    const variants = Object.entries(experiment.variants);
    let cumulative = 0;
    const roll = bucket % 100;

    for (const [name, weight] of variants) {
      cumulative += weight;
      if (roll < cumulative) {
        // Save assignment
        if (!this.assignments[experimentId]) {
          this.assignments[experimentId] = {};
        }
        this.assignments[experimentId][uid] = name;
        saveAssignments(this.assignments);

        return { variant: name, value: config[name] ?? config.control };
      }
    }

    // Fallback to control
    return { variant: 'control', value: config.control };
  }

  /**
   * Track an event
   */
  trackEvent(
    experimentId: string,
    userId: string | undefined,
    event: string,
    metadata?: Record<string, unknown>
  ): void {
    const uid = userId || 'anonymous';
    const variant = this.assignments[experimentId]?.[uid] || 'control';

    const experimentEvent: ExperimentEvent = {
      experimentId,
      variant,
      event,
      userId: uid,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(experimentEvent);
    saveEvents(this.events);
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): ExperimentResults {
    const experimentEvents = this.events.filter((e) => e.experimentId === experimentId);

    const variants: Record<string, { participants: number; events: Record<string, number>; conversionRate?: number }> = {};
    const participantsByVariant = new Map<string, Set<string>>();

    for (const event of experimentEvents) {
      if (!variants[event.variant]) {
        variants[event.variant] = { participants: 0, events: {} };
        participantsByVariant.set(event.variant, new Set());
      }

      // Count unique participants
      if (event.userId) {
        participantsByVariant.get(event.variant)!.add(event.userId);
      }

      // Count events
      variants[event.variant].events[event.event] =
        (variants[event.variant].events[event.event] || 0) + 1;
    }

    // Update participant counts
    for (const [variant, participants] of participantsByVariant) {
      variants[variant].participants = participants.size;
    }

    // Calculate conversion rates (if 'exposed' and 'converted' events exist)
    for (const variant of Object.values(variants)) {
      if (variant.events.exposed && variant.events.converted) {
        variant.conversionRate = variant.events.converted / variant.events.exposed;
      }
    }

    return {
      experimentId,
      variants,
      startTime: experimentEvents.length > 0 ? experimentEvents[0].timestamp : undefined,
      lastEventTime: experimentEvents.length > 0 ? experimentEvents[experimentEvents.length - 1].timestamp : undefined,
    };
  }

  /**
   * Get all experiments
   */
  getExperiments(): Record<string, Experiment> {
    return { ...this.experiments };
  }

  /**
   * Clear all experiment data
   */
  clear(): void {
    this.experiments = {};
    this.events = [];
    this.assignments = {};
    saveExperiments({});
    saveEvents([]);
    saveAssignments({});
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const experiments = new VoiceExperiments();

// ============================================================================
// PREDEFINED EXPERIMENTS
// ============================================================================

/**
 * Register default voice experiments
 * Call this on app initialization
 */
export function initializeDefaultExperiments(): void {
  // Greeting tone experiment
  experiments.register({
    id: 'greeting-tone',
    description: 'Test casual vs playful vs minimal greeting tones',
    enabled: false, // Enable when ready to run
    trafficPercent: 10, // 10% of users
    variants: {
      control: 34,    // Casual (current)
      playful: 33,    // More playful
      minimal: 33,    // More minimal
    },
  });

  // Onboarding length experiment
  experiments.register({
    id: 'onboarding-length',
    description: 'Test 5-step vs 3-step onboarding',
    enabled: false,
    trafficPercent: 20,
    variants: {
      control: 50,   // 5 steps
      short: 50,     // 3 steps
    },
  });

  // Empty state CTA experiment
  experiments.register({
    id: 'empty-state-cta',
    description: 'Test action button copy variations',
    enabled: false,
    trafficPercent: 15,
    variants: {
      control: 34,        // 'New screenplay'
      action_verb: 33,    // 'Start writing'
      minimal: 33,        // 'Create'
    },
  });
}

// Export class for testing
export { VoiceExperiments };
