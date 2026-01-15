/**
 * Verso Voice System
 * Unified copy and personality management
 *
 * MODULES
 * -------
 * - greeting: Contextual greetings with 22 categories
 * - onboarding: Contextual onboarding with step variants
 * - emptyStates: 20 resource types with variety
 * - errors: Contextual error messaging
 * - names: Filmmaker easter eggs (50+ names)
 * - analytics: Event tracking for optimization
 */

// Core
export { VERSO_VOICE } from './profile';
export type { VoiceProfile } from './profile';
export * from './types';
export * from './utils';

// Features
export * as greeting from './features/greeting';
export * as importQuips from './features/import';
export * as onboarding from './features/onboarding';
export * as names from './features/names';
export * as errors from './features/errors';
export * as emptyStates from './features/empty-states';

// Analytics
export * as analytics from './analytics';

// A/B Testing
export * as experiments from './experiments';
