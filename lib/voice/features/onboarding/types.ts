/**
 * Onboarding Types
 * Type definitions for contextual onboarding system
 */

/**
 * User context for personalized onboarding
 */
export interface OnboardingContext {
  /** User's display name */
  userName?: string | null;
  /** Whether user has any screenplays */
  hasScreenplays: boolean;
  /** Whether user is part of any teams */
  hasTeams: boolean;
  /** User's primary use case (if known) */
  useCase?: 'film' | 'tv' | 'short' | 'student' | null;
  /** Device type */
  device: 'desktop' | 'mobile' | 'tablet';
  /** Time of day */
  timePeriod: 'morning' | 'afternoon' | 'evening' | 'night';
  /** Day of week */
  isWeekend: boolean;
  /** Session seed for variety */
  sessionSeed?: number;
}

/**
 * Onboarding step with variants
 */
export interface OnboardingStepVariant {
  id: string;
  title: string;
  description: string;
  action?: string;
  /** Keyboard shortcut to highlight */
  shortcut?: string;
  /** Element selector to highlight */
  highlight?: string;
  /** Animation style */
  animation?: 'fade' | 'slide' | 'zoom';
}

/**
 * Contextual onboarding step with multiple variants
 */
export interface ContextualOnboardingStep {
  id: string;
  /** Default variant */
  default: OnboardingStepVariant;
  /** Variants based on context */
  variants?: {
    /** Condition to match */
    condition: (ctx: OnboardingContext) => boolean;
    /** Variant to use if condition matches */
    variant: Partial<OnboardingStepVariant>;
  }[];
}

/**
 * Onboarding result
 */
export interface OnboardingResult {
  steps: OnboardingStepVariant[];
  welcomeMessage: string;
  completionMessage: string;
  /** Track which variant was selected */
  variantId: string;
}

/**
 * Onboarding analytics event
 */
export interface OnboardingEvent {
  type: 'start' | 'step' | 'complete' | 'skip' | 'action';
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  timeSpent?: number;
  variantId?: string;
  timestamp: number;
}
