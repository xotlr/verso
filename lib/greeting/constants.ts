/**
 * Greeting System Constants
 * All magic numbers extracted for maintainability
 */

// Streak thresholds
export const LEGENDARY_STREAK_DAYS = 7;
export const NEARLY_LEGENDARY_STREAK_DAYS = 6;
export const ON_FIRE_MIN_STREAK_DAYS = 3;
export const RETURNING_CHAMP_MIN_STREAK = 5;
export const COMEBACK_MIN_STREAK = 2;
export const COMEBACK_LONGEST_STREAK_THRESHOLD = 3;

// Ghost/absence thresholds (days since last write)
export const GHOST_SHORT_MIN_DAYS = 3;
export const GHOST_MEDIUM_MIN_DAYS = 5;
export const GHOST_LONG_MIN_DAYS = 7;

// Streak broken window (days)
export const STREAK_BROKEN_MAX_DAYS = 3;

// Productivity thresholds
export const CRUSHING_IT_MULTIPLIER = 5; // 5x daily goal
export const GOAL_PROGRESS_MIN = 0.5; // 50% of daily goal
export const GOAL_PROGRESS_MAX = 1.0; // 100% of daily goal
export const CREATOR_NOT_WRITER_MIN_SCREENPLAYS = 5;

// Milestone tolerance (how close to milestone to trigger)
export const MILESTONE_TOLERANCE = 0.1; // 10% above milestone

// Word milestones (descending order for checking)
export const WORD_MILESTONES = [50000, 25000, 10000, 5000, 1000] as const;

// Screenplay milestones
export const SCREENPLAY_MILESTONES = [25, 10, 5] as const;

// Timing constants
export const MS_PER_DAY = 86400000;
export const REFRESH_INTERVAL_MS = 60000; // 1 minute

// Time of day boundaries (hours)
export const MORNING_START = 5;
export const AFTERNOON_START = 12;
export const EVENING_START = 17;
export const NIGHT_START = 21;

// Default values
export const DEFAULT_DAILY_GOAL = 500;
