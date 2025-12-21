/**
 * Greeting System
 * Contextual, behavior-reactive greetings
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Core functions
export {
  getContextualGreeting,
  shouldShowName,
  pickSmartGreeting,
  getDaysSinceLastWrite,
  getWordMilestone,
  getScreenplayMilestone,
  isWeekend,
  getTimePeriod,
  getDailySeed,
} from './contextual-greeting';

// Greeting pools (for testing/extension)
export * from './greeting-pools';
