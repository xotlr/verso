/**
 * Greeting System Types
 */

export { type TimePeriod } from '../../types';

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
}

export type GreetingCategory =
  | 'NAME_EASTER_EGG'
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
  | 'TIME_BASED';

export interface GreetingResult {
  text: string;
  showName: boolean;
  name?: string;
  category: GreetingCategory;
}
