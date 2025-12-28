/**
 * Verso Voice System
 * Unified copy and personality management
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
