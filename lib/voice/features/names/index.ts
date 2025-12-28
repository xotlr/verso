/**
 * Name Recognition Module
 * Easter eggs for filmmaker names
 */

export * from './types';
export { KNOWN_NAMES } from './registry';
export {
  matchName,
  shouldTrigger,
  getNameGreeting,
  getNameOnboarding,
} from './matcher';
