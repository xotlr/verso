/**
 * Empty State Pools
 * Voiced empty state messages organized by resource
 *
 * Voice: Like Caine but less unhinged. Casual. Dry. Sometimes weird. Never corporate.
 * Empty states should be: inviting, slightly playful, actionable
 */

import type { VoicedEmptyState } from './types';

/**
 * Screenplay empty states
 */
export const screenplayEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No screenplays yet',
    description: 'The blank page awaits. Create something.',
    action: 'New screenplay',
  },
  {
    title: 'Nothing here yet',
    description: 'Your stories live here. Make the first one.',
    action: 'Start writing',
  },
  {
    title: 'FADE IN on... nothing',
    description: 'Time to change that.',
    action: 'New screenplay',
  },
  {
    title: 'The void',
    description: 'Where your screenplays will be. Eventually.',
    action: 'Create one',
  },
];

/**
 * Project empty states
 */
export const projectEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No projects yet',
    description: 'Projects keep your scripts organized. Production-ready.',
    action: 'New project',
  },
  {
    title: 'No productions yet',
    description: 'Group your scripts, notes, and schedules in one place.',
    action: 'Create project',
  },
  {
    title: 'Nothing in production',
    description: 'Start a project to keep things organized.',
    action: 'New project',
  },
];

/**
 * Series empty states
 */
export const seriesEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No series yet',
    description: 'Multi-season storytelling starts here.',
    action: 'New series',
  },
  {
    title: 'No shows yet',
    description: 'Create a series. Build a world. Go episodic.',
    action: 'Create series',
  },
  {
    title: 'The pilot episode awaits',
    description: 'Every show starts somewhere.',
    action: 'New series',
  },
];

/**
 * Season empty states
 */
export const seasonEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No seasons yet',
    description: 'Add a season to start organizing episodes.',
    action: 'Add season',
  },
  {
    title: 'Season 1 loading...',
    description: 'Just kidding. Create one.',
    action: 'New season',
  },
  {
    title: 'The premiere is pending',
    description: 'Create your first season.',
    action: 'Add season',
  },
  {
    title: 'Season order: empty',
    description: 'Time to greenlight a season.',
    action: 'New season',
  },
];

/**
 * Episode empty states
 */
export const episodeEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No episodes yet',
    description: 'Add episodes to this season.',
    action: 'Add episode',
  },
  {
    title: 'The episode guide is empty',
    description: 'Time to fill it.',
    action: 'New episode',
  },
  {
    title: 'Episode 1 is waiting',
    description: 'Every season needs a pilot.',
    action: 'Add episode',
  },
  {
    title: 'The writers room is quiet',
    description: 'Break some stories. Add an episode.',
    action: 'New episode',
  },
];

/**
 * Team empty states
 */
export const teamEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No teams yet',
    description: 'Collaborate with others. Share scripts. Build together.',
    action: 'Create team',
  },
  {
    title: "You're a solo act (for now)",
    description: 'Teams let you collaborate with other writers.',
    action: 'New team',
  },
  {
    title: 'Flying solo',
    description: "Not that there's anything wrong with that.",
    action: 'Create team',
  },
];

/**
 * Character empty states
 */
export const characterEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No characters yet',
    description: 'They appear as you write dialogue.',
  },
  {
    title: 'Cast: TBD',
    description: 'Add dialogue to populate your cast.',
  },
  {
    title: 'Empty call sheet',
    description: "Write some dialogue. They'll show up.",
  },
  {
    title: 'The stage is empty',
    description: 'Characters appear when you give them lines.',
  },
];

/**
 * Scene empty states
 */
export const sceneEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No scenes yet',
    description: 'Start writing. Your structure will appear here.',
  },
  {
    title: 'Scene list: empty',
    description: 'Add a scene heading to begin.',
  },
  {
    title: 'FADE IN missing',
    description: 'Write an INT. or EXT. to create your first scene.',
  },
  {
    title: 'No story structure yet',
    description: 'Scenes appear as you write.',
  },
];

/**
 * Note empty states
 */
export const noteEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No notes yet',
    description: 'Jot down ideas, feedback, reminders.',
    action: 'Add note',
  },
  {
    title: "Writer's notebook: blank",
    description: 'Use notes to track your thoughts.',
    action: 'New note',
  },
  {
    title: 'Notes go here',
    description: 'Ideas, research, random thoughts. All of it.',
    action: 'Add note',
  },
];

/**
 * Shot empty states
 */
export const shotEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No shots yet',
    description: 'Plan your coverage. Add some shots.',
    action: 'Add shot',
  },
  {
    title: 'Shot list: empty',
    description: 'Start planning your visual storytelling.',
    action: 'New shot',
  },
  {
    title: 'Camera setup pending',
    description: 'Add shots to plan your coverage.',
    action: 'Add shot',
  },
];

/**
 * Location empty states
 */
export const locationEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No locations yet',
    description: 'They appear as you write scene headings.',
  },
  {
    title: 'Location scout: empty',
    description: 'Add INT. or EXT. scenes to build your location list.',
  },
  {
    title: 'No sets on the lot',
    description: 'Locations populate from your scene headings.',
  },
];

/**
 * Connection empty states
 */
export const connectionEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No connections yet',
    description: 'Build your network. Find collaborators.',
    action: 'Find people',
  },
  {
    title: 'Your network: just you',
    description: "Connect with other writers. It's less lonely.",
    action: 'Browse creators',
  },
  {
    title: 'Flying solo',
    description: 'Connect with other creators to grow your network.',
    action: 'Find connections',
  },
];

/**
 * Stack empty states
 */
export const stackEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No stacks yet',
    description: 'Group related screenplays together.',
    action: 'New stack',
  },
  {
    title: 'Unstacked',
    description: 'Create a stack to organize scripts.',
    action: 'Create stack',
  },
  {
    title: 'Loose pages everywhere',
    description: 'Stacks keep related scripts together.',
    action: 'New stack',
  },
  {
    title: 'No collections yet',
    description: 'Bundle your screenplays into stacks.',
    action: 'Create stack',
  },
];

/**
 * Activity empty states
 */
export const activityEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No activity yet',
    description: 'Start writing. History begins here.',
  },
  {
    title: 'The timeline is empty',
    description: 'Your activity will appear as you work.',
  },
  {
    title: 'Quiet so far',
    description: 'Activity shows up when things happen.',
  },
];

/**
 * Version history empty states
 */
export const versionEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No versions yet',
    description: 'Versions are saved automatically as you work.',
  },
  {
    title: 'History starts now',
    description: "Your drafts will appear here. Eventually.",
  },
  {
    title: 'First draft territory',
    description: 'Version history builds as you write.',
  },
];

/**
 * Photo empty states
 */
export const photoEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No photos yet',
    description: 'Add reference images and production photos.',
    action: 'Upload photo',
  },
  {
    title: 'Photo gallery: empty',
    description: 'Drop some images in here.',
    action: 'Add photos',
  },
  {
    title: 'The lookbook is blank',
    description: 'Add some visual references.',
    action: 'Upload photo',
  },
  {
    title: 'No visuals yet',
    description: 'Mood boards, references, stills. All go here.',
    action: 'Add photos',
  },
];

/**
 * Group empty states
 */
export const groupEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No groups yet',
    description: 'Organize cards into groups.',
    action: 'New group',
  },
  {
    title: 'Ungrouped',
    description: 'Create groups to organize your cards.',
    action: 'Create group',
  },
  {
    title: 'Cards without a home',
    description: 'Groups keep things tidy.',
    action: 'New group',
  },
  {
    title: 'Organization pending',
    description: 'Create groups to structure your board.',
    action: 'Create group',
  },
];

/**
 * Resource empty states
 */
export const resourceEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No resources yet',
    description: 'Add documents, links, and reference materials.',
    action: 'Add resource',
  },
  {
    title: 'Resource library: empty',
    description: 'Store research and reference materials here.',
    action: 'Add resource',
  },
  {
    title: 'The research folder is empty',
    description: 'Add links, docs, and references.',
    action: 'Add resource',
  },
  {
    title: 'No reference materials yet',
    description: 'Keep your research organized here.',
    action: 'Add resource',
  },
];

/**
 * Application empty states
 */
export const applicationEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No applications yet',
    description: 'Applications will appear here when received.',
  },
  {
    title: 'Inbox: empty',
    description: 'No applications to review.',
  },
  {
    title: 'The queue is clear',
    description: 'Applications show up here when submitted.',
  },
  {
    title: 'Nothing pending',
    description: 'No applications waiting for review.',
  },
];

/**
 * Metrics empty states
 */
export const metricsEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No metrics yet',
    description: 'Data appears as you navigate around.',
  },
  {
    title: 'Stats loading...',
    description: 'Use the app to generate some data.',
  },
  {
    title: 'The numbers will come',
    description: 'Start writing to populate your stats.',
  },
  {
    title: 'Analytics pending',
    description: 'Your activity will show up here.',
  },
];

/**
 * Search result empty states
 */
export const searchEmptyStates: VoicedEmptyState[] = [
  {
    title: 'No results',
    description: 'Try a different search term.',
  },
  {
    title: 'Nothing found',
    description: 'Adjust your search or filters.',
  },
  {
    title: "Can't find it",
    description: 'Try different keywords.',
  },
  {
    title: 'Zero matches',
    description: 'Tweak your search.',
  },
];

/**
 * Viewer-specific empty states (when viewing someone else's profile/content)
 */
export const viewerEmptyStates: Record<string, VoicedEmptyState[]> = {
  screenplays: [
    {
      title: 'No public screenplays',
      description: "They haven't shared any scripts publicly.",
    },
    {
      title: 'Nothing shared yet',
      description: 'No public screenplays from this creator.',
    },
  ],
  projects: [
    {
      title: 'No public projects',
      description: "They haven't shared any projects.",
    },
    {
      title: 'Nothing here yet',
      description: 'No public projects from this user.',
    },
  ],
  teams: [
    {
      title: 'No team activity',
      description: 'This team is quiet so far.',
    },
  ],
  series: [
    {
      title: 'No public series',
      description: "They haven't shared any series.",
    },
  ],
};
