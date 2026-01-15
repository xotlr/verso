/**
 * Voiced Empty States System
 * Contextual, personality-driven empty state messages
 *
 * Accessibility:
 * - Use getAccessibleEmptyState() to get screen-reader-friendly versions
 * - Playful titles are preserved visually but have clear ariaLabel fallbacks
 */

import { pickSmart } from '../../utils';
import type {
  EmptyStateResource,
  EmptyStateViewer,
  VoicedEmptyState,
  AccessibleEmptyState,
} from './types';
import {
  screenplayEmptyStates,
  projectEmptyStates,
  seriesEmptyStates,
  seasonEmptyStates,
  episodeEmptyStates,
  teamEmptyStates,
  characterEmptyStates,
  sceneEmptyStates,
  noteEmptyStates,
  shotEmptyStates,
  locationEmptyStates,
  connectionEmptyStates,
  stackEmptyStates,
  activityEmptyStates,
  versionEmptyStates,
  photoEmptyStates,
  groupEmptyStates,
  resourceEmptyStates,
  applicationEmptyStates,
  metricsEmptyStates,
  searchEmptyStates,
  viewerEmptyStates,
} from './pools';

export * from './types';
export * from './pools';

/**
 * Pool lookup by resource type
 */
const poolsByResource: Record<EmptyStateResource, VoicedEmptyState[]> = {
  screenplays: screenplayEmptyStates,
  projects: projectEmptyStates,
  series: seriesEmptyStates,
  seasons: seasonEmptyStates,
  episodes: episodeEmptyStates,
  teams: teamEmptyStates,
  characters: characterEmptyStates,
  scenes: sceneEmptyStates,
  notes: noteEmptyStates,
  shots: shotEmptyStates,
  locations: locationEmptyStates,
  connections: connectionEmptyStates,
  stacks: stackEmptyStates,
  activity: activityEmptyStates,
  versions: versionEmptyStates,
  photos: photoEmptyStates,
  groups: groupEmptyStates,
  resources: resourceEmptyStates,
  applications: applicationEmptyStates,
  metrics: metricsEmptyStates,
};

/**
 * Get a voiced empty state for a resource type
 */
export function getEmptyState(
  resource: EmptyStateResource,
  viewer: EmptyStateViewer = 'owner',
  recentTitles: string[] = [],
  seed?: number
): VoicedEmptyState {
  // For search results, use search-specific messages
  if (viewer === 'search') {
    const titles = searchEmptyStates.map((e) => e.title);
    const selected = pickSmart(titles, recentTitles, seed ?? Date.now());
    return searchEmptyStates.find((e) => e.title === selected) || searchEmptyStates[0];
  }

  // For viewing others' content, use viewer-specific messages
  if (viewer === 'viewer' && viewerEmptyStates[resource]) {
    const pool = viewerEmptyStates[resource];
    const titles = pool.map((e) => e.title);
    const selected = pickSmart(titles, recentTitles, seed ?? Date.now());
    return pool.find((e) => e.title === selected) || pool[0];
  }

  // Default to owner pool
  const pool = poolsByResource[resource] || screenplayEmptyStates;
  const titles = pool.map((e) => e.title);
  const selected = pickSmart(titles, recentTitles, seed ?? Date.now());
  return pool.find((e) => e.title === selected) || pool[0];
}

/**
 * Get just the title for an empty state
 */
export function getEmptyStateTitle(
  resource: EmptyStateResource,
  viewer: EmptyStateViewer = 'owner',
  seed?: number
): string {
  return getEmptyState(resource, viewer, [], seed).title;
}

/**
 * Get just the description for an empty state
 */
export function getEmptyStateDescription(
  resource: EmptyStateResource,
  viewer: EmptyStateViewer = 'owner',
  seed?: number
): string {
  return getEmptyState(resource, viewer, [], seed).description;
}

/**
 * Get a search empty state
 */
export function getSearchEmptyState(recentTitles: string[] = [], seed?: number): VoicedEmptyState {
  const titles = searchEmptyStates.map((e) => e.title);
  const selected = pickSmart(titles, recentTitles, seed ?? Date.now());
  return searchEmptyStates.find((e) => e.title === selected) || searchEmptyStates[0];
}

/**
 * Quick helpers for common resource types
 */
export const emptyStates = {
  screenplays: (viewer: EmptyStateViewer = 'owner', seed?: number) =>
    getEmptyState('screenplays', viewer, [], seed),
  projects: (viewer: EmptyStateViewer = 'owner', seed?: number) =>
    getEmptyState('projects', viewer, [], seed),
  series: (viewer: EmptyStateViewer = 'owner', seed?: number) =>
    getEmptyState('series', viewer, [], seed),
  seasons: (seed?: number) => getEmptyState('seasons', 'owner', [], seed),
  episodes: (seed?: number) => getEmptyState('episodes', 'owner', [], seed),
  teams: (viewer: EmptyStateViewer = 'owner', seed?: number) =>
    getEmptyState('teams', viewer, [], seed),
  characters: (seed?: number) => getEmptyState('characters', 'owner', [], seed),
  scenes: (seed?: number) => getEmptyState('scenes', 'owner', [], seed),
  notes: (seed?: number) => getEmptyState('notes', 'owner', [], seed),
  shots: (seed?: number) => getEmptyState('shots', 'owner', [], seed),
  locations: (seed?: number) => getEmptyState('locations', 'owner', [], seed),
  connections: (seed?: number) => getEmptyState('connections', 'owner', [], seed),
  stacks: (seed?: number) => getEmptyState('stacks', 'owner', [], seed),
  activity: (seed?: number) => getEmptyState('activity', 'owner', [], seed),
  versions: (seed?: number) => getEmptyState('versions', 'owner', [], seed),
  photos: (seed?: number) => getEmptyState('photos', 'owner', [], seed),
  groups: (seed?: number) => getEmptyState('groups', 'owner', [], seed),
  resources: (seed?: number) => getEmptyState('resources', 'owner', [], seed),
  applications: (seed?: number) => getEmptyState('applications', 'owner', [], seed),
  metrics: (seed?: number) => getEmptyState('metrics', 'owner', [], seed),
  search: (seed?: number) => getSearchEmptyState([], seed),
};

/**
 * Human-readable resource names for accessibility
 */
const resourceLabels: Record<EmptyStateResource, string> = {
  screenplays: 'screenplays',
  projects: 'projects',
  series: 'series',
  seasons: 'seasons',
  episodes: 'episodes',
  teams: 'teams',
  characters: 'characters',
  scenes: 'scenes',
  notes: 'notes',
  shots: 'shots',
  locations: 'locations',
  connections: 'connections',
  stacks: 'stacks',
  activity: 'activity',
  versions: 'version history',
  photos: 'photos',
  groups: 'groups',
  resources: 'resources',
  applications: 'applications',
  metrics: 'metrics',
};

/**
 * Generate an accessible label from an empty state
 * Combines title and description into a screen-reader-friendly announcement
 */
function generateAriaLabel(
  state: VoicedEmptyState,
  resource?: EmptyStateResource
): string {
  // If ariaLabel is explicitly set, use it
  if (state.ariaLabel) {
    return state.ariaLabel;
  }

  // Build accessible label from parts
  const parts: string[] = [];

  // Add title (cleaned up for screen readers)
  let title = state.title;
  // Remove playful punctuation that sounds weird when read aloud
  title = title.replace(/\.{3}/g, '').replace(/\.\.\./g, '');
  parts.push(title);

  // Add description
  if (state.description) {
    parts.push(state.description);
  }

  // Add action hint if present
  if (state.action) {
    parts.push(`Press button to ${state.action.toLowerCase()}.`);
  }

  return parts.join('. ').replace(/\.\./g, '.');
}

/**
 * Get an accessible empty state with all ARIA attributes
 * Use this when rendering empty states in components
 */
export function getAccessibleEmptyState(
  resource: EmptyStateResource,
  viewer: EmptyStateViewer = 'owner',
  recentTitles: string[] = [],
  seed?: number
): AccessibleEmptyState {
  const state = getEmptyState(resource, viewer, recentTitles, seed);

  return {
    ...state,
    ariaLabel: generateAriaLabel(state, resource),
    role: 'status',
    ariaLive: 'polite',
  };
}

/**
 * Get accessible search empty state
 */
export function getAccessibleSearchEmptyState(
  recentTitles: string[] = [],
  seed?: number
): AccessibleEmptyState {
  const state = getSearchEmptyState(recentTitles, seed);

  return {
    ...state,
    ariaLabel: state.ariaLabel || `No search results. ${state.description}`,
    role: 'status',
    ariaLive: 'polite',
  };
}
