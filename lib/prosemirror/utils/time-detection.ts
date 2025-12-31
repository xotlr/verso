/**
 * Time-of-day detection utilities for screenplay scenes.
 *
 * Automatically detects appropriate time of day based on:
 * 1. Keywords in the location text (e.g., "EVENING" suggests DUSK)
 * 2. CONTINUOUS marker inherits from previous scene
 * 3. Explicit time markers in the heading text
 */

// Extended time of day types for better granularity
export type TimeOfDay =
  | 'DAY'
  | 'NIGHT'
  | 'DAWN'
  | 'MORNING'
  | 'AFTERNOON'
  | 'DUSK'
  | 'EVENING'
  | 'CONTINUOUS';

// Display labels for each time
export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  DAY: 'Day',
  NIGHT: 'Night',
  DAWN: 'Dawn',
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  DUSK: 'Dusk',
  EVENING: 'Evening',
  CONTINUOUS: 'Continuous',
};

// For grouping/sorting purposes
export const TIME_OF_DAY_ORDER: Record<TimeOfDay, number> = {
  DAWN: 0,
  MORNING: 1,
  DAY: 2,
  AFTERNOON: 3,
  DUSK: 4,
  EVENING: 5,
  NIGHT: 6,
  CONTINUOUS: 7,
};

interface DetectionResult {
  timeOfDay: TimeOfDay;
  /** True if time was inferred from keywords, false if explicitly stated */
  autoDetected: boolean;
}

/**
 * Keywords that suggest NIGHT time
 */
const NIGHT_KEYWORDS = [
  'night',
  'midnight',
  'late night',
  '2am', '3am', '4am', '5am',
  '11pm', '12am', '1am',
  'middle of the night',
  'dead of night',
  'witching hour',
  'overnight',
  'after dark',
  'nighttime',
  'late-night',
];

/**
 * Keywords that suggest EVENING time
 */
const EVENING_KEYWORDS = [
  'evening',
  'nightfall',
  '7pm', '8pm', '9pm', '10pm',
  'later that evening',
  'that evening',
  'same evening',
  'early evening',
  'late evening',
];

/**
 * Keywords that suggest DAWN time
 */
const DAWN_KEYWORDS = [
  'dawn',
  'sunrise',
  'daybreak',
  'first light',
  'crack of dawn',
  'pre-dawn',
  'predawn',
  'sun rises',
  'sunup',
  '5am', '6am',
];

/**
 * Keywords that suggest MORNING time
 */
const MORNING_KEYWORDS = [
  'morning',
  'early morning',
  'late morning',
  '7am', '8am', '9am', '10am', '11am',
  'mid-morning',
  'midmorning',
  'that morning',
  'next morning',
  'following morning',
  'the next morning',
  'breakfast',
  'a.m.',
];

/**
 * Keywords that suggest AFTERNOON time
 */
const AFTERNOON_KEYWORDS = [
  'afternoon',
  'early afternoon',
  'late afternoon',
  'mid-afternoon',
  'midafternoon',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm',
  'that afternoon',
  'later that afternoon',
  'noon',
  'midday',
  'lunchtime',
  'p.m.',
];

/**
 * Keywords that suggest DUSK time
 */
const DUSK_KEYWORDS = [
  'dusk',
  'sunset',
  'twilight',
  'sundown',
  'golden hour',
  'magic hour',
  'blue hour',
  'gloaming',
  'sun sets',
  'setting sun',
  'end of day',
  '6pm',
];

/**
 * Keywords that indicate CONTINUOUS time (same as previous scene)
 */
const CONTINUOUS_KEYWORDS = [
  'continuous',
  'cont.',
  'cont\'d',
  'cont',
  'later',
  'moments later',
  'same',
  'same time',
  'intercut',
  'intercut with',
  'resume',
  'continuing',
];

/**
 * Normalize time of day string to our standard types.
 * Handles common variations and misspellings.
 */
export function normalizeTimeOfDay(input?: string): TimeOfDay {
  if (!input) return 'DAY';

  const lower = input.toLowerCase().trim();

  // Direct matches
  if (lower === 'day') return 'DAY';
  if (lower === 'night') return 'NIGHT';
  if (lower === 'dawn') return 'DAWN';
  if (lower === 'morning') return 'MORNING';
  if (lower === 'afternoon') return 'AFTERNOON';
  if (lower === 'dusk') return 'DUSK';
  if (lower === 'evening') return 'EVENING';
  if (lower === 'continuous' || lower === 'cont' || lower === 'cont.') return 'CONTINUOUS';

  // Check keywords in order of specificity
  if (DAWN_KEYWORDS.some(kw => lower.includes(kw))) return 'DAWN';
  if (MORNING_KEYWORDS.some(kw => lower.includes(kw))) return 'MORNING';
  if (AFTERNOON_KEYWORDS.some(kw => lower.includes(kw))) return 'AFTERNOON';
  if (DUSK_KEYWORDS.some(kw => lower.includes(kw))) return 'DUSK';
  if (EVENING_KEYWORDS.some(kw => lower.includes(kw))) return 'EVENING';
  if (NIGHT_KEYWORDS.some(kw => lower.includes(kw))) return 'NIGHT';
  if (CONTINUOUS_KEYWORDS.some(kw => lower.includes(kw))) return 'CONTINUOUS';

  return 'DAY';
}

/**
 * Detect time of day from scene heading components.
 *
 * @param location - The location portion of the scene heading (e.g., "COFFEE SHOP")
 * @param explicitTime - Any explicitly stated time (e.g., "DAY", "NIGHT") from the heading
 * @param previousSceneTime - Time of day from the previous scene (for CONTINUOUS inheritance)
 * @returns Detection result with timeOfDay and whether it was auto-detected
 */
export function detectTimeOfDay(
  location: string,
  explicitTime?: string,
  previousSceneTime?: TimeOfDay
): DetectionResult {
  const locationLower = location.toLowerCase();
  const explicitLower = explicitTime?.toLowerCase().trim();

  // 1. Check for explicit time markers first
  if (explicitLower) {
    const normalized = normalizeTimeOfDay(explicitLower);

    // Handle CONTINUOUS - inherit from previous scene
    if (normalized === 'CONTINUOUS') {
      const inherited = previousSceneTime || 'DAY';
      return { timeOfDay: inherited, autoDetected: false };
    }

    return { timeOfDay: normalized, autoDetected: false };
  }

  // 2. Check for keywords in location text (auto-detection)
  // Check in order of specificity

  // DAWN keywords
  if (DAWN_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'DAWN', autoDetected: true };
  }

  // MORNING keywords
  if (MORNING_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'MORNING', autoDetected: true };
  }

  // AFTERNOON keywords
  if (AFTERNOON_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'AFTERNOON', autoDetected: true };
  }

  // DUSK keywords
  if (DUSK_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'DUSK', autoDetected: true };
  }

  // EVENING keywords
  if (EVENING_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'EVENING', autoDetected: true };
  }

  // NIGHT keywords
  if (NIGHT_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'NIGHT', autoDetected: true };
  }

  // CONTINUOUS keywords in location
  if (CONTINUOUS_KEYWORDS.some(kw => locationLower.includes(kw))) {
    const inherited = previousSceneTime || 'DAY';
    return { timeOfDay: inherited, autoDetected: true };
  }

  // 3. Default to DAY (not auto-detected since it's the standard default)
  return { timeOfDay: 'DAY', autoDetected: false };
}

/**
 * Parse a full scene heading line and extract time of day.
 *
 * @param heading - Full scene heading (e.g., "INT. COFFEE SHOP - DAY")
 * @param previousSceneTime - Time of day from previous scene
 * @returns Detection result
 */
export function detectTimeFromHeading(
  heading: string,
  previousSceneTime?: TimeOfDay
): DetectionResult {
  // Split by " - " to separate location from time
  const parts = heading.split(/\s+-\s+/);

  // Extract location (remove INT./EXT. prefix)
  let location = parts[0] || '';
  location = location.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '').trim();

  // Extract explicit time if present
  const explicitTime = parts.length > 1 ? parts[parts.length - 1] : undefined;

  return detectTimeOfDay(location, explicitTime, previousSceneTime);
}

/**
 * Check if a time of day value represents continuous time.
 * Note: CONTINUOUS gets normalized to the actual inherited time,
 * but this checks if the original input was a continuous marker.
 */
export function isContinuousMarker(timeString?: string): boolean {
  if (!timeString) return false;
  const lower = timeString.toLowerCase();
  return CONTINUOUS_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Get all unique times of day from a list.
 * Returns sorted by time order (dawn to night).
 */
export function getUniqueTimesOfDay(times: (TimeOfDay | string | undefined)[]): TimeOfDay[] {
  const unique = new Set<TimeOfDay>();
  for (const time of times) {
    if (time) {
      unique.add(normalizeTimeOfDay(time));
    }
  }
  return Array.from(unique).sort((a, b) => TIME_OF_DAY_ORDER[a] - TIME_OF_DAY_ORDER[b]);
}
