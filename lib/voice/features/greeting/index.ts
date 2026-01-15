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
} from './strategies';

// Greeting pools (for testing/extension)
export * from './pools';

// History tracking
export {
  getRecentGreetings,
  getRecentCategories,
  addToHistory,
  clearHistory,
} from './history';
