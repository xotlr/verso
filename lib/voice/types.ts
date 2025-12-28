/**
 * Voice System Types
 * Shared types for unified copy management
 */

/** Time periods for contextual copy */
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/** Result from selecting copy */
export interface CopyResult<TCategory extends string = string> {
  text: string;
  category: TCategory;
  showName?: boolean;
  name?: string;
}

/** Context for variety management */
export interface SelectionContext {
  recentTexts?: string[];
  recentCategories?: string[];
  sessionSeed?: number;
  dailySeed?: number;
}

/** Pool selector function */
export type PoolSelector = (variants: string[]) => string;
