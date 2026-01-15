/**
 * Onboarding Voice
 * Copy and messaging for onboarding flow
 *
 * ARCHITECTURE
 * ============
 * The onboarding system mirrors the greeting system's sophistication:
 *
 * 1. CONTEXT DETECTION: Device, time, user state
 * 2. STEP VARIANTS: Multiple versions of each step (8+ per step)
 * 3. SMART PICKING: Avoid recently shown variants
 * 4. PERSONALIZATION: Name-based and time-based customization
 *
 * USAGE
 * -----
 * Simple (legacy):
 *   getWelcomeMessage(userName) → random welcome
 *   getStepMessage('scene-heading') → random step message
 *
 * Advanced (contextual):
 *   const context = buildOnboardingContext(userName, hasScreenplays)
 *   const result = getContextualOnboarding(context)
 *   result.steps → contextual step variants
 *   result.welcomeMessage → personalized welcome
 */

import { randomPick } from '../../utils';
import { matchName, getNameOnboarding } from '../names';
import {
  welcomeMessages,
  welcomeMessagesByTime,
  stepMessages,
  completionMessages,
  completionMessagesByContext,
  skipMessages,
  errorMessages,
  encouragementMessages,
} from './pools';

// Re-export pools for direct access
export {
  welcomeMessages,
  welcomeMessagesByTime,
  stepMessages,
  completionMessages,
  completionMessagesByContext,
  skipMessages,
  errorMessages,
  encouragementMessages,
};

// Re-export types
export * from './types';

// Re-export contextual strategies
export {
  getContextualOnboarding,
  buildOnboardingContext,
  getRandomWelcome,
  getRandomCompletion,
} from './strategies';

/**
 * Get a welcome message, with optional name-based override
 * @deprecated Use getContextualOnboarding() for full personalization
 */
export function getWelcomeMessage(userName?: string | null): string {
  // Check for name-based easter egg
  const nameMatch = matchName(userName);
  if (nameMatch) {
    const nameOnboarding = getNameOnboarding(nameMatch);
    if (nameOnboarding) {
      return nameOnboarding;
    }
  }
  return randomPick(welcomeMessages);
}

/**
 * Get the display name (may be overridden for certain names)
 */
export function getDisplayName(userName?: string | null): string | undefined {
  if (!userName) return undefined;

  const nameMatch = matchName(userName);
  if (nameMatch) {
    return nameMatch.displayName;
  }
  return userName.split(' ')[0];
}

/**
 * Get a step message by step ID
 */
export function getStepMessage(stepId: string): string {
  const pool = stepMessages[stepId];
  if (!pool || pool.length === 0) {
    return stepId; // Fallback to step ID if no copy defined
  }
  return randomPick(pool);
}

/**
 * Get a completion message
 */
export function getCompletionMessage(): string {
  return randomPick(completionMessages);
}

/**
 * Get a contextual completion message
 */
export function getContextualCompletionMessage(
  timePeriod?: 'morning' | 'afternoon' | 'evening' | 'night',
  isWeekend?: boolean,
  isFirstTime?: boolean
): string {
  const contextKey = isFirstTime
    ? 'firstTime'
    : isWeekend
      ? 'weekend'
      : timePeriod || 'morning';

  const contextMessages = completionMessagesByContext[contextKey] || [];
  const allMessages = [...contextMessages, ...completionMessages];

  return randomPick(allMessages);
}

/**
 * Get a skip message
 */
export function getSkipMessage(): string {
  return randomPick(skipMessages);
}

/**
 * Get an error message
 */
export function getErrorMessage(): string {
  return randomPick(errorMessages);
}

/**
 * Get an encouragement message (for mid-onboarding)
 */
export function getEncouragementMessage(): string {
  return randomPick(encouragementMessages);
}
