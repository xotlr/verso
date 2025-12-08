/**
 * Greeting System Types
 * Contextual, behavior-reactive greetings that notice user patterns
 */

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
  mounted?: boolean;
}

export type GreetingCategory =
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
