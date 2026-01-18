/**
 * Greeting System Types
 */

export { type TimePeriod } from '../../types';

/**
 * Recent activity item from Activity model
 */
export interface RecentActivityItem {
  type: string; // 'screenplay_created' | 'screenplay_edited' | 'project_created' | 'screenplay_published'
  entityId: string | null;
  entityTitle: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
}

/**
 * Last edited screenplay info for contextual greetings
 */
export interface LastEditedInfo {
  id: string;
  title: string;
  wordCount: number;
  updatedAt: string | Date;
  genre: string | null;
  seriesTitle: string | null;
  projectName: string | null;
}

export const GENRES = [
  'thriller',
  'comedy',
  'drama',
  'horror',
  'sci-fi',
  'romance',
  'action',
  'fantasy',
] as const;

export type Genre = (typeof GENRES)[number];

export interface GreetingContext {
  userName?: string | null;
  screenplayCount: number;
  wordsThisWeek: number;
  wordsToday: number;
  totalWordsAllTime: number;
  lastEditedGenre: string | null;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  lastWriteDate: string | null;
  recentGreetings: string[];
  recentCategories?: GreetingCategory[];
  sessionSeed?: number;
  mounted?: boolean;
  /** Number of times user has refreshed/revisited in this session */
  refreshCount?: number;
  /** Screenplay metadata for personalized greetings */
  lastEditedTitle?: string | null;
  lastEditedLogline?: string | null;
  /** Top characters from recent work (by dialogue count) */
  recentCharacters?: string[];
  /** Notable locations from recent work */
  recentLocations?: string[];
  /** Recent activity for contextual greetings */
  recentActivity?: RecentActivityItem[];
  /** Last edited screenplay with full context */
  lastEdited?: LastEditedInfo | null;
}

export type GreetingCategory =
  | 'REFRESH_ADDICT'
  | 'NAME_EASTER_EGG'
  | 'SCREENPLAY_REFERENCE'
  | 'LEGENDARY'
  | 'NEARLY_LEGENDARY'
  | 'GHOST_LONG'
  | 'GHOST_MEDIUM'
  | 'GHOST_SHORT'
  | 'COMEBACK_KID'
  | 'RETURNING_CHAMP'
  | 'ON_FIRE'
  | 'MILESTONE_WORDS'
  | 'MILESTONE_SCREENPLAYS'
  | 'GOAL_PROGRESS'
  | 'CREATOR_NOT_WRITER'
  | 'STREAK_BROKEN'
  | 'CRUSHING_IT'
  | 'SLACKING'
  | 'FIRST_TIME'
  | 'GENRE_BASED'
  | 'WEEKEND_WARRIOR'
  | 'TIME_BASED'
  // Activity-aware contextual categories
  | 'WROTE_YESTERDAY'
  | 'CREATED_PROJECT'
  | 'WORKING_ON_SERIES'
  | 'SPECIFIC_PROGRESS';

export interface GreetingResult {
  text: string;
  showName: boolean;
  name?: string;
  category: GreetingCategory;
}
