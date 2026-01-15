/**
 * Voice Analytics
 * Event tracking and metrics for voice system optimization
 *
 * USAGE
 * -----
 * import { voiceAnalytics } from '@/lib/voice/analytics'
 *
 * // Track events
 * voiceAnalytics.trackGreeting({ type: 'greeting_shown', category: 'LEGENDARY' })
 * voiceAnalytics.trackOnboarding({ type: 'onboarding_step', stepId: 'welcome' })
 *
 * // Get metrics
 * const metrics = voiceAnalytics.getMetrics()
 *
 * // Clear data
 * voiceAnalytics.clear()
 */

export * from './types';
export { voiceAnalytics, VoiceAnalyticsTracker } from './tracker';
