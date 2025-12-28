/**
 * Onboarding Voice
 * Copy and messaging for onboarding flow
 */

import { randomPick } from '../../utils';
import { matchName, getNameOnboarding } from '../names';
import {
  welcomeMessages,
  stepMessages,
  completionMessages,
  skipMessages,
  errorMessages,
} from './pools';

export { welcomeMessages, stepMessages, completionMessages, skipMessages, errorMessages };

/**
 * Get a welcome message, with optional name-based override
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
