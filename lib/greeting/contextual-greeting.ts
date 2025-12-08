/**
 * Contextual Greeting System
 * Behavior-reactive greetings that notice user patterns
 */

import type { GreetingContext, GreetingCategory, GreetingResult } from './types';
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

/**
 * Smart algorithm to determine if a greeting works with a name appended
 */
export function shouldShowName(greeting: string): boolean {
  // Never show name if greeting contains "you" or "your" (already addresses user)
  if (/\byou\b|\byour\b/i.test(greeting)) return false;

  // Never show name for complete sentences (ends with period, !, or ?)
  if (/[.!?]$/.test(greeting)) return false;

  // Never show name for metaphorical/poetic phrases
  const skipPatterns = [
    /awaits/i, /begins/i, /activated/i, /engaged/i, /incoming/i,
    /loading/i, /mode:/i, /thickens/i, /calling/i, /strikes/i,
    /flows/i, /blinks/i, /fears/i, /counts/i, /misses/i
  ];
  if (skipPatterns.some(p => p.test(greeting))) return false;

  // Show name for direct address patterns
  const directAddressPatterns = [
    /^good (morning|afternoon|evening|night)/i,
    /^welcome/i, /^hey/i, /^hello/i, /^hi\b/i,
    /^happy/i
  ];
  if (directAddressPatterns.some(p => p.test(greeting))) return true;

  // Show name for short phrases (2-3 words) without colons
  const words = greeting.split(' ');
  if (words.length <= 3 && !greeting.includes(':')) return true;

  // Default: don't show name
  return false;
}

/**
 * Smart greeting picker that avoids recently shown greetings
 */
export function pickSmartGreeting(
  pool: string[],
  recentlyShown: string[],
  seed: number,
  mounted: boolean = false
): string {
  // Build exclusion set from recent greetings
  const excluded = new Set(recentlyShown);

  // Filter out greetings that were recently shown
  const available = pool.filter((g) => !excluded.has(g));

  // Fallback to full pool if all options were exhausted
  const targetPool = available.length > 0 ? available : pool;

  // Use daily seed for deterministic but fresh selection
  // Only use daily rotation after component has mounted (post-hydration)
  // This prevents hydration mismatches
  const dailySeed = mounted ? Math.floor(Date.now() / 86400000) : 0;
  return targetPool[(seed + dailySeed) % targetPool.length];
}

/**
 * Calculate days since last write
 */
export function getDaysSinceLastWrite(lastWriteDate: string | null): number | null {
  if (!lastWriteDate) return null;
  const last = new Date(lastWriteDate);
  const now = new Date();
  const diffTime = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Helper to check word milestones
 */
export function getWordMilestone(totalWords: number): number | null {
  const milestones = [50000, 25000, 10000, 5000, 1000];
  for (const m of milestones) {
    if (totalWords >= m && totalWords < m * 1.1) return m; // Within 10% above milestone
  }
  return null;
}

/**
 * Helper to check screenplay milestones
 */
export function getScreenplayMilestone(count: number): number | null {
  const milestones = [25, 10, 5];
  for (const m of milestones) {
    if (count === m) return m;
  }
  return null;
}

/**
 * Check if it's a weekend
 */
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Time-based greeting fallback (original system)
 */
export function getTimeBasedGreeting(
  userName?: string | null,
  recentGreetings: string[] = [],
  mounted: boolean = false
): GreetingResult {
  // Only use current time after mount to prevent hydration mismatches
  const now = mounted ? new Date() : new Date(0);
  const hour = now.getHours();
  const firstName = userName?.split(' ')[0];
  const minuteSeed = mounted ? Math.floor(Date.now() / 60000) : 0;

  const timePeriod =
    (hour >= 5 && hour < 12) ? "morning" :
    (hour >= 12 && hour < 17) ? "afternoon" :
    (hour >= 17 && hour < 21) ? "evening" : "night";

  const pool = timeBasedGreetings[timePeriod];
  const text = pickSmartGreeting(pool, recentGreetings, minuteSeed, mounted);

  return {
    text,
    showName: shouldShowName(text),
    name: firstName,
    category: 'TIME_BASED',
  };
}

/**
 * Main contextual greeting function
 * Selects the most appropriate greeting based on user behavior and context
 */
export function getContextualGreeting(ctx: GreetingContext): GreetingResult {
  const {
    userName,
    screenplayCount,
    wordsThisWeek,
    wordsToday,
    totalWordsAllTime,
    lastEditedGenre,
    currentStreak,
    longestStreak,
    dailyGoal,
    lastWriteDate,
    recentGreetings = [],
    mounted = false,
  } = ctx;

  const firstName = userName?.split(' ')[0];
  // Only use Date.now() after mount to prevent hydration mismatches
  const minuteSeed = mounted ? Math.floor(Date.now() / 60000) : 0;
  const daysSinceWrite = getDaysSinceLastWrite(lastWriteDate);

  // Helper to pick greeting avoiding recently shown ones
  const smartPick = (pool: string[]) => pickSmartGreeting(pool, recentGreetings, minuteSeed, mounted);

  // Priority 1: LEGENDARY (7+ day streak) - Peak celebration
  if (currentStreak >= 7) {
    const text = `${smartPick(legendaryGreetings)} ${currentStreak} days!`;
    return { text, showName: false, name: firstName, category: 'LEGENDARY' };
  }

  // Priority 2: NEARLY_LEGENDARY (6-day streak)
  if (currentStreak === 6) {
    const text = smartPick(nearlyLegendaryGreetings);
    return { text, showName: false, name: firstName, category: 'NEARLY_LEGENDARY' };
  }

  // Priority 3: GHOST detection (3+ days absent)
  if (daysSinceWrite !== null && daysSinceWrite >= 3) {
    let pool: string[];
    let category: GreetingCategory;

    if (daysSinceWrite >= 7) {
      pool = ghostGreetingsLong;
      category = 'GHOST_LONG';
    } else if (daysSinceWrite >= 5) {
      pool = ghostGreetingsMedium;
      category = 'GHOST_MEDIUM';
    } else {
      pool = ghostGreetingsShort;
      category = 'GHOST_SHORT';
    }

    const text = smartPick(pool);
    return { text, showName: false, name: firstName, category };
  }

  // Priority 4: COMEBACK_KID (had long absence but now rebuilding streak)
  if (currentStreak >= 2 && longestStreak >= 3 && daysSinceWrite !== null) {
    // They were gone for a while but came back and are building momentum
    const previousAbsence = daysSinceWrite > 7 || (longestStreak > currentStreak + 3);
    if (previousAbsence && currentStreak >= 2) {
      const text = smartPick(comebackKidGreetings);
      return { text, showName: false, name: firstName, category: 'COMEBACK_KID' };
    }
  }

  // Priority 5: RETURNING_CHAMP (matching or exceeding longest streak, streak >= 5)
  if (currentStreak >= 5 && currentStreak >= longestStreak && longestStreak > 0) {
    const text = `${smartPick(returningChampGreetings)} ${currentStreak} days!`;
    return { text, showName: false, name: firstName, category: 'RETURNING_CHAMP' };
  }

  // Priority 6: ON_FIRE (3-5 day streak)
  if (currentStreak >= 3) {
    const text = `${currentStreak}-day streak! ${smartPick(onFireGreetings)}`;
    return { text, showName: false, name: firstName, category: 'ON_FIRE' };
  }

  // Priority 7: MILESTONE_WORDS (hit a major word milestone)
  const wordMilestone = getWordMilestone(totalWordsAllTime);
  if (wordMilestone && milestoneWordsGreetings[wordMilestone]) {
    const text = smartPick(milestoneWordsGreetings[wordMilestone]);
    return { text, showName: false, name: firstName, category: 'MILESTONE_WORDS' };
  }

  // Priority 8: MILESTONE_SCREENPLAYS
  const screenplayMilestone = getScreenplayMilestone(screenplayCount);
  if (screenplayMilestone && milestoneScreenplaysGreetings[screenplayMilestone]) {
    const text = smartPick(milestoneScreenplaysGreetings[screenplayMilestone]);
    return { text, showName: false, name: firstName, category: 'MILESTONE_SCREENPLAYS' };
  }

  // Priority 9: GOAL_PROGRESS (50-99% of daily goal today)
  const goalProgress = wordsToday / dailyGoal;
  if (goalProgress >= 0.5 && goalProgress < 1) {
    const remaining = dailyGoal - wordsToday;
    const pct = Math.round(goalProgress * 100);
    const text = `${pct}% there! Just ${remaining} words to go`;
    return { text, showName: false, name: firstName, category: 'GOAL_PROGRESS' };
  }

  // Priority 10: CREATOR_NOT_WRITER (many screenplays, 0 words this week)
  if (screenplayCount > 5 && wordsThisWeek === 0) {
    const text = smartPick(creatorNotWriterGreetings);
    return { text, showName: false, name: firstName, category: 'CREATOR_NOT_WRITER' };
  }

  // Priority 11: STREAK_BROKEN (streak is 0 but had one before)
  if (currentStreak === 0 && longestStreak > 0 && daysSinceWrite !== null && daysSinceWrite >= 1 && daysSinceWrite < 3) {
    const text = smartPick(streakBrokenGreetings);
    return { text, showName: false, name: firstName, category: 'STREAK_BROKEN' };
  }

  // Priority 12: Productivity levels
  if (wordsThisWeek > dailyGoal * 5) {
    const text = `${wordsThisWeek.toLocaleString()} words this week?! ${smartPick(crushingItGreetings)}`;
    return { text, showName: false, name: firstName, category: 'CRUSHING_IT' };
  }

  if (wordsThisWeek < dailyGoal && screenplayCount > 0 && wordsThisWeek === 0) {
    const text = smartPick(slackingGreetings);
    return { text, showName: false, name: firstName, category: 'SLACKING' };
  }

  // Priority 13: First time user
  if (screenplayCount === 0) {
    const text = smartPick(firstTimeGreetings);
    return { text, showName: shouldShowName(text), name: firstName, category: 'FIRST_TIME' };
  }

  // Priority 14: GENRE_BASED (if they have a recent genre)
  if (lastEditedGenre) {
    const normalizedGenre = lastEditedGenre.toLowerCase();
    const genrePool = genreGreetings[normalizedGenre];
    if (genrePool) {
      const text = smartPick(genrePool);
      return { text, showName: false, name: firstName, category: 'GENRE_BASED' };
    }
  }

  // Priority 15: WEEKEND_WARRIOR (if it's a weekend)
  if (isWeekend()) {
    const text = smartPick(weekendWarriorGreetings);
    return { text, showName: false, name: firstName, category: 'WEEKEND_WARRIOR' };
  }

  // Priority 16: Fall back to time-based greeting
  return getTimeBasedGreeting(userName, recentGreetings, mounted);
}
