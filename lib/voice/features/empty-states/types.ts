/**
 * Empty State Types
 * Categories for contextual empty state messaging
 *
 * Accessibility:
 * - Use `ariaLabel` for screen reader text when visual copy is playful/cryptic
 * - If no ariaLabel provided, use getAccessibleEmptyState() to generate one
 */

/**
 * Resource types that can have empty states
 */
export type EmptyStateResource =
  | 'screenplays'
  | 'projects'
  | 'series'
  | 'seasons'
  | 'episodes'
  | 'teams'
  | 'characters'
  | 'scenes'
  | 'notes'
  | 'shots'
  | 'locations'
  | 'connections'
  | 'stacks'
  | 'activity'
  | 'versions'
  | 'photos'
  | 'groups'
  | 'resources'
  | 'applications'
  | 'metrics';

/**
 * Context for who's viewing the empty state
 */
export type EmptyStateViewer = 'owner' | 'viewer' | 'search';

/**
 * Empty state result with title, description, and optional action
 */
export interface VoicedEmptyState {
  /** Visual title displayed in UI */
  title: string;
  /** Visual description displayed in UI */
  description: string;
  /** Optional CTA button text */
  action?: string;
  /**
   * Accessible label for screen readers.
   * Use this when the visual title/description is playful or cryptic.
   * If omitted, screen readers will use title + description.
   */
  ariaLabel?: string;
}

/**
 * Extended empty state with guaranteed accessibility fields
 */
export interface AccessibleEmptyState extends VoicedEmptyState {
  /** Screen reader announcement combining title, description, and action */
  ariaLabel: string;
  /** ARIA role for the empty state container */
  role: 'status' | 'alert';
  /** Whether the empty state should be announced immediately */
  ariaLive: 'polite' | 'off';
}
