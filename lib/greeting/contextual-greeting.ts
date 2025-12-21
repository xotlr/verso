/**
 * Contextual Greeting System
 * Behavior-reactive greetings that notice user patterns
 *
 * Uses a strategy pattern for maintainable, extensible greeting selection.
 */

import type { GreetingContext, GreetingCategory, GreetingResult, Genre, TimePeriod } from './types';
import { GENRES } from './types';
import {
  ghostGreetingsShort,
  ghostGreetingsMedium,
  ghostGreetingsLong,
  legendaryGreetings,
  nearlyLegendaryGreetings,
  onFireGreetings,
  returningChampGreetings,
  streakBrokenGreetings,
  creatorNotWriterGreetings,
  crushingItGreetings,
  slackingGreetings,
  firstTimeGreetings,
  comebackKidGreetings,
  milestoneWordsGreetings,
  milestoneScreenplaysGreetings,
  genreGreetings,
  weekendWarriorGreetings,
  timeBasedGreetings,
} from './greeting-pools';
import {
  LEGENDARY_STREAK_DAYS,
  NEARLY_LEGENDARY_STREAK_DAYS,
  ON_FIRE_MIN_STREAK_DAYS,
  RETURNING_CHAMP_MIN_STREAK,
  COMEBACK_MIN_STREAK,
  COMEBACK_LONGEST_STREAK_THRESHOLD,
  GHOST_SHORT_MIN_DAYS,
  GHOST_MEDIUM_MIN_DAYS,
  GHOST_LONG_MIN_DAYS,
  STREAK_BROKEN_MAX_DAYS,
  CRUSHING_IT_MULTIPLIER,
  GOAL_PROGRESS_MIN,
  GOAL_PROGRESS_MAX,
  CREATOR_NOT_WRITER_MIN_SCREENPLAYS,
  MILESTONE_TOLERANCE,
  WORD_MILESTONES,
  SCREENPLAY_MILESTONES,
  MS_PER_DAY,
  MORNING_START,
  AFTERNOON_START,
  EVENING_START,
  NIGHT_START,
  DEFAULT_DAILY_GOAL,
} from './constants';

// Combined regex patterns for performance
const SKIP_NAME_PATTERN = /\byou\b|\byour\b|[.!?]$|awaits|begins|activated|engaged|incoming|loading|mode:|thickens|calling|strikes|flows|blinks|fears|counts|misses/i;
const DIRECT_ADDRESS_PATTERN = /^(good (morning|afternoon|evening|night)|welcome|hey|hello|hi\b|happy)/i;

/**
 * Smart algorithm to determine if a greeting works with a name appended
 */
export function shouldShowName(greeting: string): boolean {
  // Skip if contains "you/your", ends with punctuation, or is poetic/metaphorical
  if (SKIP_NAME_PATTERN.test(greeting)) return false;

  // Show name for direct address patterns
  if (DIRECT_ADDRESS_PATTERN.test(greeting)) return true;

  // Show name for short phrases (2-3 words) without colons
  const wordCount = greeting.split(' ').length;
  if (wordCount <= 3 && !greeting.includes(':')) return true;

  return false;
}

/**
 * Smart greeting picker that avoids recently shown greetings
 */
export function pickSmartGreeting(
  pool: string[],
  recentlyShown: string[],
  dailySeed: number
): string {
  const excluded = new Set(recentlyShown);
  const available = pool.filter((g) => !excluded.has(g));
  const targetPool = available.length > 0 ? available : pool;
  return targetPool[dailySeed % targetPool.length];
}

/**
 * Calculate days since last write with proper date handling
 */
export function getDaysSinceLastWrite(lastWriteDate: string | null): number | null {
  if (!lastWriteDate) return null;

  const last = new Date(lastWriteDate);
  const now = new Date();

  // Use UTC to avoid timezone issues
  const lastUTC = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.floor((nowUTC - lastUTC) / MS_PER_DAY);
}

/**
 * Get word milestone if user just reached one
 */
export function getWordMilestone(totalWords: number): number | null {
  for (const milestone of WORD_MILESTONES) {
    // Trigger if exactly at milestone OR within tolerance above it
    if (totalWords >= milestone && totalWords <= milestone * (1 + MILESTONE_TOLERANCE)) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get screenplay milestone if user just reached one
 */
export function getScreenplayMilestone(count: number): number | null {
  for (const milestone of SCREENPLAY_MILESTONES) {
    if (count === milestone) return milestone;
  }
  return null;
}

/**
 * Check if it's a weekend (Saturday or Sunday)
 */
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Get current time period
 */
export function getTimePeriod(mounted: boolean): TimePeriod {
  const hour = mounted ? new Date().getHours() : 0;

  if (hour >= MORNING_START && hour < AFTERNOON_START) return 'morning';
  if (hour >= AFTERNOON_START && hour < EVENING_START) return 'afternoon';
  if (hour >= EVENING_START && hour < NIGHT_START) return 'evening';
  return 'night';
}

/**
 * Get daily seed for consistent greeting throughout the day
 */
export function getDailySeed(mounted: boolean): number {
  return mounted ? Math.floor(Date.now() / MS_PER_DAY) : 0;
}

/**
 * Check if a genre is valid
 */
function isValidGenre(genre: string | null): genre is Genre {
  if (!genre) return false;
  return GENRES.includes(genre.toLowerCase() as Genre);
}

// ============================================================================
// GREETING STRATEGIES
// Each strategy has a `matches()` predicate and a `getGreeting()` function.
// Strategies are evaluated in priority order; first match wins.
// ============================================================================

interface GreetingStrategyContext {
  ctx: GreetingContext;
  firstName: string | undefined;
  dailySeed: number;
  daysSinceWrite: number | null;
  smartPick: (pool: string[]) => string;
}

interface GreetingStrategy {
  category: GreetingCategory;
  matches: (s: GreetingStrategyContext) => boolean;
  getGreeting: (s: GreetingStrategyContext) => GreetingResult;
}

const strategies: GreetingStrategy[] = [
  // Priority 1: LEGENDARY (7+ day streak)
  {
    category: 'LEGENDARY',
    matches: ({ ctx }) => ctx.currentStreak >= LEGENDARY_STREAK_DAYS,
    getGreeting: ({ ctx, firstName, smartPick }) => ({
      text: `${smartPick(legendaryGreetings)} ${ctx.currentStreak} days!`,
      showName: false,
      name: firstName,
      category: 'LEGENDARY',
    }),
  },

  // Priority 2: NEARLY_LEGENDARY (6-day streak)
  {
    category: 'NEARLY_LEGENDARY',
    matches: ({ ctx }) => ctx.currentStreak === NEARLY_LEGENDARY_STREAK_DAYS,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(nearlyLegendaryGreetings),
      showName: false,
      name: firstName,
      category: 'NEARLY_LEGENDARY',
    }),
  },

  // Priority 3: GHOST_LONG (7+ days absent)
  {
    category: 'GHOST_LONG',
    matches: ({ daysSinceWrite }) =>
      daysSinceWrite !== null && daysSinceWrite >= GHOST_LONG_MIN_DAYS,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(ghostGreetingsLong),
      showName: false,
      name: firstName,
      category: 'GHOST_LONG',
    }),
  },

  // Priority 4: GHOST_MEDIUM (5-6 days absent)
  {
    category: 'GHOST_MEDIUM',
    matches: ({ daysSinceWrite }) =>
      daysSinceWrite !== null && daysSinceWrite >= GHOST_MEDIUM_MIN_DAYS,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(ghostGreetingsMedium),
      showName: false,
      name: firstName,
      category: 'GHOST_MEDIUM',
    }),
  },

  // Priority 5: GHOST_SHORT (3-4 days absent)
  {
    category: 'GHOST_SHORT',
    matches: ({ daysSinceWrite }) =>
      daysSinceWrite !== null && daysSinceWrite >= GHOST_SHORT_MIN_DAYS,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(ghostGreetingsShort),
      showName: false,
      name: firstName,
      category: 'GHOST_SHORT',
    }),
  },

  // Priority 6: COMEBACK_KID (returned after long absence, now rebuilding)
  {
    category: 'COMEBACK_KID',
    matches: ({ ctx }) => {
      if (ctx.currentStreak < COMEBACK_MIN_STREAK) return false;
      if (ctx.longestStreak < ON_FIRE_MIN_STREAK_DAYS) return false;
      // They had a longer streak before but are rebuilding
      return ctx.longestStreak > ctx.currentStreak + COMEBACK_LONGEST_STREAK_THRESHOLD;
    },
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(comebackKidGreetings),
      showName: false,
      name: firstName,
      category: 'COMEBACK_KID',
    }),
  },

  // Priority 7: RETURNING_CHAMP (matching or beating longest streak, streak >= 5)
  {
    category: 'RETURNING_CHAMP',
    matches: ({ ctx }) =>
      ctx.currentStreak >= RETURNING_CHAMP_MIN_STREAK &&
      ctx.currentStreak >= ctx.longestStreak &&
      ctx.longestStreak > 0,
    getGreeting: ({ ctx, firstName, smartPick }) => ({
      text: `${smartPick(returningChampGreetings)} ${ctx.currentStreak} days!`,
      showName: false,
      name: firstName,
      category: 'RETURNING_CHAMP',
    }),
  },

  // Priority 8: ON_FIRE (3-5 day streak)
  {
    category: 'ON_FIRE',
    matches: ({ ctx }) => ctx.currentStreak >= ON_FIRE_MIN_STREAK_DAYS,
    getGreeting: ({ ctx, firstName, smartPick }) => ({
      text: `${ctx.currentStreak}-day streak! ${smartPick(onFireGreetings)}`,
      showName: false,
      name: firstName,
      category: 'ON_FIRE',
    }),
  },

  // Priority 9: MILESTONE_WORDS
  {
    category: 'MILESTONE_WORDS',
    matches: ({ ctx }) => getWordMilestone(ctx.totalWordsAllTime) !== null,
    getGreeting: ({ ctx, firstName, smartPick }) => {
      const milestone = getWordMilestone(ctx.totalWordsAllTime)!;
      return {
        text: smartPick(milestoneWordsGreetings[milestone]),
        showName: false,
        name: firstName,
        category: 'MILESTONE_WORDS',
      };
    },
  },

  // Priority 10: MILESTONE_SCREENPLAYS
  {
    category: 'MILESTONE_SCREENPLAYS',
    matches: ({ ctx }) => getScreenplayMilestone(ctx.screenplayCount) !== null,
    getGreeting: ({ ctx, firstName, smartPick }) => {
      const milestone = getScreenplayMilestone(ctx.screenplayCount)!;
      return {
        text: smartPick(milestoneScreenplaysGreetings[milestone]),
        showName: false,
        name: firstName,
        category: 'MILESTONE_SCREENPLAYS',
      };
    },
  },

  // Priority 11: GOAL_PROGRESS (50-99% of daily goal)
  {
    category: 'GOAL_PROGRESS',
    matches: ({ ctx }) => {
      const dailyGoal = ctx.dailyGoal || DEFAULT_DAILY_GOAL;
      if (dailyGoal <= 0) return false;
      const progress = ctx.wordsToday / dailyGoal;
      return progress >= GOAL_PROGRESS_MIN && progress < GOAL_PROGRESS_MAX;
    },
    getGreeting: ({ ctx, firstName }) => {
      const dailyGoal = ctx.dailyGoal || DEFAULT_DAILY_GOAL;
      const remaining = dailyGoal - ctx.wordsToday;
      const pct = Math.round((ctx.wordsToday / dailyGoal) * 100);
      return {
        text: `${pct}% there! Just ${remaining} words to go`,
        showName: false,
        name: firstName,
        category: 'GOAL_PROGRESS',
      };
    },
  },

  // Priority 12: CREATOR_NOT_WRITER (many screenplays, 0 words this week)
  {
    category: 'CREATOR_NOT_WRITER',
    matches: ({ ctx }) =>
      ctx.screenplayCount > CREATOR_NOT_WRITER_MIN_SCREENPLAYS &&
      ctx.wordsThisWeek === 0,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(creatorNotWriterGreetings),
      showName: false,
      name: firstName,
      category: 'CREATOR_NOT_WRITER',
    }),
  },

  // Priority 13: STREAK_BROKEN (streak is 0 but had one before, within 3 days)
  {
    category: 'STREAK_BROKEN',
    matches: ({ ctx, daysSinceWrite }) =>
      ctx.currentStreak === 0 &&
      ctx.longestStreak > 0 &&
      daysSinceWrite !== null &&
      daysSinceWrite >= 1 &&
      daysSinceWrite < STREAK_BROKEN_MAX_DAYS,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(streakBrokenGreetings),
      showName: false,
      name: firstName,
      category: 'STREAK_BROKEN',
    }),
  },

  // Priority 14: CRUSHING_IT (5x daily goal this week)
  {
    category: 'CRUSHING_IT',
    matches: ({ ctx }) => {
      const dailyGoal = ctx.dailyGoal || DEFAULT_DAILY_GOAL;
      return ctx.wordsThisWeek > dailyGoal * CRUSHING_IT_MULTIPLIER;
    },
    getGreeting: ({ ctx, firstName, smartPick }) => ({
      text: `${ctx.wordsThisWeek.toLocaleString()} words this week?! ${smartPick(crushingItGreetings)}`,
      showName: false,
      name: firstName,
      category: 'CRUSHING_IT',
    }),
  },

  // Priority 15: SLACKING (below goal, has screenplays, 0 words this week)
  {
    category: 'SLACKING',
    matches: ({ ctx }) => {
      const dailyGoal = ctx.dailyGoal || DEFAULT_DAILY_GOAL;
      return ctx.wordsThisWeek < dailyGoal &&
             ctx.screenplayCount > 0 &&
             ctx.wordsThisWeek === 0;
    },
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(slackingGreetings),
      showName: false,
      name: firstName,
      category: 'SLACKING',
    }),
  },

  // Priority 16: FIRST_TIME (no screenplays)
  {
    category: 'FIRST_TIME',
    matches: ({ ctx }) => ctx.screenplayCount === 0,
    getGreeting: ({ firstName, smartPick }) => {
      const text = smartPick(firstTimeGreetings);
      return {
        text,
        showName: shouldShowName(text),
        name: firstName,
        category: 'FIRST_TIME',
      };
    },
  },

  // Priority 17: GENRE_BASED (if they have a recent valid genre)
  {
    category: 'GENRE_BASED',
    matches: ({ ctx }) => isValidGenre(ctx.lastEditedGenre),
    getGreeting: ({ ctx, firstName, smartPick }) => {
      const genre = ctx.lastEditedGenre!.toLowerCase() as Genre;
      return {
        text: smartPick(genreGreetings[genre]),
        showName: false,
        name: firstName,
        category: 'GENRE_BASED',
      };
    },
  },

  // Priority 18: WEEKEND_WARRIOR
  {
    category: 'WEEKEND_WARRIOR',
    matches: () => isWeekend(),
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(weekendWarriorGreetings),
      showName: false,
      name: firstName,
      category: 'WEEKEND_WARRIOR',
    }),
  },
];

/**
 * Time-based greeting fallback
 */
function getTimeBasedGreeting(
  userName: string | null | undefined,
  recentGreetings: string[],
  seed: number,
  mounted: boolean
): GreetingResult {
  const firstName = userName?.split(' ')[0];
  const timePeriod = getTimePeriod(mounted);

  const pool = timeBasedGreetings[timePeriod];
  const text = pickSmartGreeting(pool, recentGreetings, seed);

  return {
    text,
    showName: shouldShowName(text),
    name: firstName,
    category: 'TIME_BASED',
  };
}

/**
 * Main contextual greeting function
 * Collects all matching strategies, filters by recent categories, picks with variety
 */
export function getContextualGreeting(ctx: GreetingContext): GreetingResult {
  const {
    userName,
    recentGreetings = [],
    recentCategories = [],
    sessionSeed = 0,
    mounted = false,
  } = ctx;

  const firstName = userName?.split(' ')[0];
  const dailySeed = getDailySeed(mounted);
  const daysSinceWrite = getDaysSinceLastWrite(ctx.lastWriteDate);

  // Combine daily seed with session seed for variety across sessions
  const combinedSeed = dailySeed + sessionSeed;
  const smartPick = (pool: string[]) => pickSmartGreeting(pool, recentGreetings, combinedSeed);

  const strategyContext: GreetingStrategyContext = {
    ctx,
    firstName,
    dailySeed: combinedSeed,
    daysSinceWrite,
    smartPick,
  };

  // Collect ALL matching strategies (not just first)
  const matchingStrategies = strategies.filter(s => s.matches(strategyContext));

  if (matchingStrategies.length === 0) {
    // No strategies matched, fall back to time-based
    return getTimeBasedGreeting(userName, recentGreetings, combinedSeed, mounted);
  }

  // Filter out recently-used categories for variety
  const recentCategorySet = new Set(recentCategories);
  const freshStrategies = matchingStrategies.filter(
    s => !recentCategorySet.has(s.category)
  );

  // Use fresh strategies if available, otherwise use all matches
  const candidateStrategies = freshStrategies.length > 0 ? freshStrategies : matchingStrategies;

  // Pick a strategy using combined seed for variety
  const selectedStrategy = candidateStrategies[combinedSeed % candidateStrategies.length];

  return selectedStrategy.getGreeting(strategyContext);
}
