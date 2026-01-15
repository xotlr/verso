/**
 * Greeting Strategies
 * Strategy pattern for contextual greeting selection
 *
 * ARCHITECTURE OVERVIEW
 * =====================
 *
 * The greeting system uses a priority-based strategy pattern to select
 * contextually appropriate greetings based on user behavior and state.
 *
 * SELECTION FLOW
 * --------------
 * 1. SPECIAL CASES (bypass normal flow):
 *    - REFRESH_ADDICT: If user refreshed 2+ times in 5 min → escalating snark
 *    - NAME_EASTER_EGG: If user name matches known filmmaker → personality response
 *
 * 2. STRATEGY EVALUATION:
 *    - All 18+ strategies are evaluated against current context
 *    - Each strategy has a priority (lower = higher priority)
 *    - Multiple strategies may match simultaneously
 *
 * 3. VARIETY FILTERING:
 *    - Recently used categories (last 10) are filtered out if possible
 *    - Ensures users see different category types over multiple visits
 *
 * 4. GREETING SELECTION:
 *    - From the winning category, a greeting is picked from its pool
 *    - pickSmart() avoids recently shown greetings (last 30)
 *    - Seed-based randomness ensures reproducibility within session
 *
 * 5. PERSONALIZATION:
 *    - Screenplay data may be used for templates ({title}, {character})
 *    - User name may be appended if greeting format allows it
 *
 * STRATEGY PRIORITIES (lower = higher priority)
 * ---------------------------------------------
 *   0: LEGENDARY (7+ day streak)
 *   1: NEARLY_LEGENDARY (6-day streak)
 *   2: GHOST_LONG (7+ days absent)
 *   3: GHOST_MEDIUM (5-6 days absent)
 *   4: GHOST_SHORT (3-4 days absent)
 *   5: COMEBACK_KID (returning after breaking streak)
 *   6: RETURNING_CHAMP (new personal best streak)
 *   7: ON_FIRE (3-6 day streak)
 *   8: MILESTONE_WORDS (hit 1K/5K/10K/25K/50K words)
 *   9: MILESTONE_SCREENPLAYS (hit 5/10/25 screenplays)
 *  10: GOAL_PROGRESS (50-99% of daily goal)
 *  11: CREATOR_NOT_WRITER (5+ screenplays, no writing this week)
 *  12: STREAK_BROKEN (broke streak recently)
 *  13: CRUSHING_IT (5x daily goal this week)
 *  14: SLACKING (under daily goal with some content)
 *  15: FIRST_TIME (no screenplays yet)
 *  16: SCREENPLAY_REFERENCE (has recent title/characters/locations)
 *  17: GENRE_BASED (last edited screenplay has genre)
 *  18: WEEKEND_WARRIOR (it's Saturday/Sunday)
 *  99: TIME_BASED (fallback - morning/afternoon/evening/night)
 *
 * VARIETY MANAGEMENT
 * ------------------
 * Three-layer approach ensures users don't see repetitive greetings:
 *
 * Layer 1 - Session Seed:
 *   - Each browser session gets a random seed (sessionStorage)
 *   - Combined with daily seed for consistent-yet-varied selection
 *
 * Layer 2 - Smart Picking:
 *   - pickSmart() excludes recently shown items from selection pool
 *   - Falls back to full pool only when all items exhausted
 *
 * Layer 3 - History Tracking:
 *   - Last 30 greeting texts stored in localStorage
 *   - Last 10 categories stored separately
 *   - Prevents exact repeats within rolling window
 *
 * FILES IN THIS MODULE
 * --------------------
 * strategies.ts  - Strategy evaluation logic (this file)
 * pools.ts       - Greeting text pools by category
 * types.ts       - TypeScript interfaces and types
 * constants.ts   - Tunable thresholds (streak days, milestones, etc.)
 * history.ts     - localStorage persistence for variety
 * extract-screenplay-data.ts - Regex-based character/location extraction
 *
 * EXTENDING THE SYSTEM
 * --------------------
 * To add a new greeting category:
 * 1. Add category to GreetingCategory union in types.ts
 * 2. Add greeting pool in pools.ts
 * 3. Create strategy function in this file
 * 4. Add strategy to STRATEGIES array with appropriate priority
 * 5. Add tests to __tests__/lib/greeting-variety.test.ts
 */

import type { GreetingContext, GreetingCategory, GreetingResult, Genre } from './types';
import { GENRES } from './types';
import { pickSmart, daysSince, getTimePeriod, getDailySeed, isWeekend, shouldAppendName } from '../../utils';
import { matchName, shouldTrigger, getNameGreeting } from '../names';
import {
  refreshAddictGreetings,
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
  screenplayReferenceTemplates,
} from './pools';
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
  DEFAULT_DAILY_GOAL,
} from './constants';

// Re-export for backward compatibility
export { shouldAppendName as shouldShowName } from '../../utils';

/**
 * Smart greeting picker that avoids recently shown greetings
 */
export function pickSmartGreeting(
  pool: string[],
  recentlyShown: string[],
  dailySeed: number
): string {
  return pickSmart(pool, recentlyShown, dailySeed);
}

/**
 * Calculate days since last write
 */
export function getDaysSinceLastWrite(lastWriteDate: string | null): number | null {
  return daysSince(lastWriteDate);
}

/**
 * Get word milestone if user just reached one
 */
export function getWordMilestone(totalWords: number): number | null {
  for (const milestone of WORD_MILESTONES) {
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

// Re-export time utilities
export { isWeekend, getTimePeriod, getDailySeed } from '../../utils';

function isValidGenre(genre: string | null): genre is Genre {
  if (!genre) return false;
  return GENRES.includes(genre.toLowerCase() as Genre);
}

// Strategy context
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

  // Priority 6: COMEBACK_KID
  {
    category: 'COMEBACK_KID',
    matches: ({ ctx }) => {
      if (ctx.currentStreak < COMEBACK_MIN_STREAK) return false;
      if (ctx.longestStreak < ON_FIRE_MIN_STREAK_DAYS) return false;
      return ctx.longestStreak > ctx.currentStreak + COMEBACK_LONGEST_STREAK_THRESHOLD;
    },
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(comebackKidGreetings),
      showName: false,
      name: firstName,
      category: 'COMEBACK_KID',
    }),
  },

  // Priority 7: RETURNING_CHAMP
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

  // Priority 12: CREATOR_NOT_WRITER
  {
    category: 'CREATOR_NOT_WRITER',
    matches: ({ ctx }) =>
      ctx.screenplayCount > CREATOR_NOT_WRITER_MIN_SCREENPLAYS && ctx.wordsThisWeek === 0,
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(creatorNotWriterGreetings),
      showName: false,
      name: firstName,
      category: 'CREATOR_NOT_WRITER',
    }),
  },

  // Priority 13: STREAK_BROKEN
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

  // Priority 14: CRUSHING_IT
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

  // Priority 15: SLACKING
  {
    category: 'SLACKING',
    matches: ({ ctx }) => {
      const dailyGoal = ctx.dailyGoal || DEFAULT_DAILY_GOAL;
      return ctx.wordsThisWeek < dailyGoal && ctx.screenplayCount > 0 && ctx.wordsThisWeek === 0;
    },
    getGreeting: ({ firstName, smartPick }) => ({
      text: smartPick(slackingGreetings),
      showName: false,
      name: firstName,
      category: 'SLACKING',
    }),
  },

  // Priority 16: FIRST_TIME
  {
    category: 'FIRST_TIME',
    matches: ({ ctx }) => ctx.screenplayCount === 0,
    getGreeting: ({ firstName, smartPick }) => {
      const text = smartPick(firstTimeGreetings);
      return {
        text,
        showName: shouldAppendName(text),
        name: firstName,
        category: 'FIRST_TIME',
      };
    },
  },

  // Priority 17: SCREENPLAY_REFERENCE (personalized based on user's work)
  {
    category: 'SCREENPLAY_REFERENCE',
    matches: ({ ctx }) => {
      // Need at least one of: title, characters, or locations
      return !!(
        ctx.lastEditedTitle ||
        (ctx.recentCharacters && ctx.recentCharacters.length > 0) ||
        (ctx.recentLocations && ctx.recentLocations.length > 0)
      );
    },
    getGreeting: ({ ctx, firstName, dailySeed }) => {
      // Collect available template types
      const availableTypes: Array<'title' | 'character' | 'location'> = [];
      if (ctx.lastEditedTitle) availableTypes.push('title');
      if (ctx.recentCharacters?.length) availableTypes.push('character');
      if (ctx.recentLocations?.length) availableTypes.push('location');

      // Pick a random type
      const templateType = availableTypes[dailySeed % availableTypes.length];
      const templates = screenplayReferenceTemplates[templateType];
      const template = templates[dailySeed % templates.length];

      // Fill in the placeholder
      let text = template;
      if (templateType === 'title' && ctx.lastEditedTitle) {
        text = template.replace('{title}', ctx.lastEditedTitle);
      } else if (templateType === 'character' && ctx.recentCharacters?.length) {
        const character = ctx.recentCharacters[dailySeed % ctx.recentCharacters.length];
        text = template.replace('{character}', character);
      } else if (templateType === 'location' && ctx.recentLocations?.length) {
        const location = ctx.recentLocations[dailySeed % ctx.recentLocations.length];
        text = template.replace('{location}', location);
      }

      return {
        text,
        showName: false,
        name: firstName,
        category: 'SCREENPLAY_REFERENCE',
      };
    },
  },

  // Priority 18: GENRE_BASED
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
  const timePeriod = getTimePeriod(mounted ? new Date().getHours() : 0);

  const pool = timeBasedGreetings[timePeriod];
  const text = pickSmartGreeting(pool, recentGreetings, seed);

  return {
    text,
    showName: shouldAppendName(text),
    name: firstName,
    category: 'TIME_BASED',
  };
}

/**
 * Main contextual greeting function
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

  const combinedSeed = dailySeed + sessionSeed;

  // Priority -1: Refresh addict (compulsive refreshers get called out)
  const refreshCount = ctx.refreshCount ?? 0;
  if (refreshCount >= 2) {
    // Cap at 8 for the highest snark level
    const level = Math.min(refreshCount, 8);
    const pool = refreshAddictGreetings[level] || refreshAddictGreetings[8];
    const text = pickSmart(pool, recentGreetings, combinedSeed);
    return {
      text,
      showName: false,
      category: 'REFRESH_ADDICT',
    };
  }

  // Priority 0: Name-based easter eggs (check first!)
  const nameMatch = matchName(userName);
  if (nameMatch && shouldTrigger(nameMatch.personality.frequency, combinedSeed)) {
    return {
      text: getNameGreeting(nameMatch, combinedSeed),
      showName: false,
      name: nameMatch.displayName,
      category: 'NAME_EASTER_EGG',
    };
  }

  const smartPick = (pool: string[]) => pickSmartGreeting(pool, recentGreetings, combinedSeed);

  const strategyContext: GreetingStrategyContext = {
    ctx,
    firstName,
    dailySeed: combinedSeed,
    daysSinceWrite,
    smartPick,
  };

  // Collect ALL matching strategies
  const matchingStrategies = strategies.filter((s) => s.matches(strategyContext));

  if (matchingStrategies.length === 0) {
    return getTimeBasedGreeting(userName, recentGreetings, combinedSeed, mounted);
  }

  // Filter out recently-used categories
  const recentCategorySet = new Set(recentCategories);
  const freshStrategies = matchingStrategies.filter((s) => !recentCategorySet.has(s.category));

  const candidateStrategies = freshStrategies.length > 0 ? freshStrategies : matchingStrategies;
  const selectedStrategy = candidateStrategies[combinedSeed % candidateStrategies.length];

  return selectedStrategy.getGreeting(strategyContext);
}
