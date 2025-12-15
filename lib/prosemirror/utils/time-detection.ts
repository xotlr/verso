/**
 * Time-of-day detection utilities for screenplay scenes.
 *
 * Automatically detects appropriate time of day based on:
 * 1. Keywords in the location text (e.g., "EVENING" suggests NIGHT)
 * 2. CONTINUOUS marker inherits from previous scene
 * 3. Explicit time markers in the heading text
 */

export type TimeOfDay = 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS';

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
  'evening',
  'midnight',
  'late night',
  '2am',
  '3am',
  '4am',
];

/**
 * Keywords that suggest DAWN time
 */
const DAWN_KEYWORDS = [
  'dawn',
  'sunrise',
  'early morning',
  'daybreak',
  'first light',
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
];

/**
 * Keywords that indicate CONTINUOUS time (same as previous scene)
 */
const CONTINUOUS_KEYWORDS = [
  'continuous',
  'cont.',
  'cont',
  'later',
  'moments later',
  'same',
  'same time',
];

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
    // Check if explicit time is a standard value
    if (explicitLower === 'day') {
      return { timeOfDay: 'DAY', autoDetected: false };
    }
    if (explicitLower === 'night') {
      return { timeOfDay: 'NIGHT', autoDetected: false };
    }
    if (explicitLower === 'dawn' || explicitLower === 'morning') {
      return { timeOfDay: 'DAWN', autoDetected: false };
    }
    if (explicitLower === 'dusk' || explicitLower === 'evening') {
      return { timeOfDay: 'DUSK', autoDetected: false };
    }
    // Check for CONTINUOUS variants
    if (CONTINUOUS_KEYWORDS.some(kw => explicitLower.includes(kw))) {
      // For CONTINUOUS, inherit from previous scene
      const inherited = previousSceneTime || 'DAY';
      return { timeOfDay: inherited, autoDetected: false };
    }
  }

  // 2. Check for keywords in location text (auto-detection)
  // NIGHT keywords
  if (NIGHT_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'NIGHT', autoDetected: true };
  }

  // DAWN keywords
  if (DAWN_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'DAWN', autoDetected: true };
  }

  // DUSK keywords
  if (DUSK_KEYWORDS.some(kw => locationLower.includes(kw))) {
    return { timeOfDay: 'DUSK', autoDetected: true };
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
