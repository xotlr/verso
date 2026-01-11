/**
 * Centralized regex patterns for screenplay parsing and formatting
 */

// Check if text contains at least one letter (filters out "112", "2024", etc.)
const HAS_LETTER = /[A-Za-z]/;

// Lines that look like action even if ALL CAPS (matches DOCX parser's ACTION_INDICATORS)
const ACTION_INDICATORS = [
  /^(THE|A|AN|HE|SHE|THEY|WE|IT|THIS|THAT|THESE|THOSE|HIS|HER|THEIR|OUR|MY|YOUR)\s/i, // Common article/pronoun starters
  /\.\s*$/, // Ends with period (likely a sentence)
  /,\s*$/, // Ends with comma
  /\band\b/i, // Contains "and"
  /\bthe\b/i, // Contains "the"
  /\bis\b/i, // Contains "is"
  /\bare\b/i, // Contains "are"
  /\bwas\b/i, // Contains "was"
  /\bwere\b/i, // Contains "were"
  /\bwith\b/i, // Contains "with"
  /\binto\b/i, // Contains "into"
  /\bfrom\b/i, // Contains "from"
  /\bhave\b/i, // Contains "have"
  /\bhas\b/i, // Contains "has"
  /\bhad\b/i, // Contains "had"
  /\bwill\b/i, // Contains "will"
  /\bwould\b/i, // Contains "would"
  /\bcan\b/i, // Contains "can"
  /\bcould\b/i, // Contains "could"
  /\bshould\b/i, // Contains "should"
  /\bmust\b/i, // Contains "must"
  /^\d+$/, // Pure numbers
  /^\d+[A-Z]?$/, // Numbers with optional letter suffix (like "112A")
  /^[A-Z]?\d+$/, // Optional letter prefix with numbers
];

// Scene headings
export const SCENE_HEADING_REGEX = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i;
export const SCENE_HEADING_WITH_NUMBER_REGEX = /^\d+\.\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i;

// Transitions
export const TRANSITION_START_REGEX = /^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|DIAGONAL WIPE|FLASH|BACK TO|INTERCUT)/i;
export const TRANSITION_FULL_REGEX = /^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|END|THE END).*:/i;
export const FADE_OUT_REGEX = /^FADE\s+OUT\.?$/i;
// Transitions that don't require colon
export const TRANSITION_NO_COLON_REGEX = /^(BACK TO PRESENT|BACK TO SCENE|BACK TO REALITY|BACK TO:|LATER|CONTINUOUS|END FLASHBACK|END DREAM|END MONTAGE|FLASHBACK|DREAM SEQUENCE|MONTAGE|SERIES OF SHOTS)\.?$/i;

// Character names
export const CHARACTER_NAME_WITH_EXTENSION_REGEX = /^([A-Z][A-Z\s'.-]+?)(\s*\([A-Z\.'\s]+\))?$/;
// More flexible extension regex - handles V.O., VO, V.O, O.S., OS, O.S, CONT'D, CONTINUING, etc.
export const CHARACTER_EXTENSION_REGEX = /^(.+?)\s*(\((?:V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT'?D?|CONTINUING|PRE-?LAP|FILTER|PHONE|RADIO|TV|ON SCREEN|SUBTITLE|SUBTITLED)\))\s*$/i;

// Parentheticals
export const PARENTHETICAL_REGEX = /^\(.+\)$/;

// Camera directions (legacy)
export const CAMERA_DIRECTION_REGEX = /^(PUSH IN|PULL BACK|QUICK CUTS|FREEZE FRAME|CLOSE ON|WIDE ON|ANGLE ON|MONTAGE|SERIES OF SHOTS)/i;

// Shot types with their patterns and canonical names
export const SHOT_PATTERNS = [
  // Wide shots
  { pattern: /^(WIDE SHOT|WS|WIDE|WIDE ON)\b/i, type: 'WIDE' as const },
  { pattern: /^(EXTREME WIDE SHOT|EWS|EXTREME WIDE)\b/i, type: 'EXTREME_WIDE' as const },
  { pattern: /^(ESTABLISHING SHOT|ESTABLISHING)\b/i, type: 'ESTABLISHING' as const },
  { pattern: /^(AERIAL SHOT|AERIAL)\b/i, type: 'AERIAL' as const },

  // Medium shots
  { pattern: /^(MEDIUM SHOT|MS|MEDIUM)\b/i, type: 'MEDIUM' as const },
  { pattern: /^(MEDIUM WIDE|MWS|MEDIUM WIDE SHOT)\b/i, type: 'MEDIUM_WIDE' as const },
  { pattern: /^(MEDIUM CLOSE UP|MCU|MEDIUM CLOSE-UP|MEDIUM CLOSE)\b/i, type: 'MEDIUM_CLOSE' as const },

  // Close shots
  { pattern: /^(CLOSE-UP|CLOSE UP|CU|CLOSE ON)\b/i, type: 'CLOSE_UP' as const },
  { pattern: /^(EXTREME CLOSE-UP|EXTREME CLOSE UP|ECU|XCU)\b/i, type: 'EXTREME_CLOSE_UP' as const },

  // Multi-person shots
  { pattern: /^(TWO-SHOT|TWO SHOT|2-SHOT|2 SHOT)\b/i, type: 'TWO_SHOT' as const },
  { pattern: /^(THREE-SHOT|THREE SHOT|3-SHOT|3 SHOT)\b/i, type: 'THREE_SHOT' as const },
  { pattern: /^(GROUP SHOT|GROUP)\b/i, type: 'GROUP_SHOT' as const },

  // Special shots
  { pattern: /^(OVER THE SHOULDER|OTS|OVER-THE-SHOULDER|O\/S SHOT)\b/i, type: 'OVER_SHOULDER' as const },
  { pattern: /^(POV|POINT OF VIEW|P\.O\.V\.)\b/i, type: 'POV' as const },
  { pattern: /^(INSERT|INSERT SHOT)\b/i, type: 'INSERT' as const },
  { pattern: /^(ANGLE ON|ANGLE)\b/i, type: 'ANGLE_ON' as const },

  // Camera movement shots
  { pattern: /^(MOVING SHOT|MOVING)\b/i, type: 'MOVING' as const },
  { pattern: /^(TRACKING SHOT|TRACKING|TRACKING ON)\b/i, type: 'TRACKING' as const },

  // Angle shots
  { pattern: /^(LOW ANGLE|LOW-ANGLE)\b/i, type: 'LOW_ANGLE' as const },
  { pattern: /^(HIGH ANGLE|HIGH-ANGLE)\b/i, type: 'HIGH_ANGLE' as const },
  { pattern: /^(DUTCH ANGLE|DUTCH|CANTED ANGLE)\b/i, type: 'DUTCH_ANGLE' as const },
] as const;

// Combined regex for detecting any shot pattern at start of line
export const SHOT_DETECT_REGEX = new RegExp(
  `^(${SHOT_PATTERNS.map(p => p.pattern.source.replace(/^\^/, '').replace(/\\b$/i, '')).join('|')})`,
  'i'
);

// Shot type mapping
export type DetectedShotType = typeof SHOT_PATTERNS[number]['type'];

// Special elements
export const ACT_HEADER_REGEX = /^ACT\s+[IVX]+:/;
export const END_MARKER_REGEX = /^(THE END|END)$/i;

// Exclusion patterns (things that look like character names but aren't)
export const NON_CHARACTER_KEYWORDS_REGEX = /^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|END|THE END|CONTINUED|BACK TO|LATER|CONTINUOUS|MEANWHILE|SUDDENLY|FLASHBACK|INTERCUT|MONTAGE|SERIES OF SHOTS|END FLASHBACK|END DREAM|END MONTAGE|DREAM SEQUENCE)/;

// Detection patterns for auto-formatting
export const HAS_SCENE_HEADINGS_REGEX = /(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i;
export const HAS_CHARACTER_DIALOGUE_REGEX = /\n[A-Z][A-Z\s]+\n\s*[a-z]/m;
export const HAS_TRANSITIONS_REGEX = /(?:FADE IN:|CUT TO:|FADE OUT)/i;

/**
 * Test if a line is a scene heading
 */
export function isSceneHeading(line: string): boolean {
  const trimmed = line.trim();
  return SCENE_HEADING_REGEX.test(trimmed) || SCENE_HEADING_WITH_NUMBER_REGEX.test(trimmed);
}

/**
 * Test if a line is a transition
 */
export function isTransition(line: string): boolean {
  const trimmed = line.trim();
  return TRANSITION_FULL_REGEX.test(trimmed) ||
         FADE_OUT_REGEX.test(trimmed) ||
         TRANSITION_NO_COLON_REGEX.test(trimmed) ||
         (TRANSITION_START_REGEX.test(trimmed) && trimmed.endsWith(':'));
}

/**
 * Test if a line is a parenthetical
 */
export function isParenthetical(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')');
}

/**
 * Test if a line could be a character name
 * Note: Requires context (next line) to be definitive
 *
 * Handles character names with extensions like:
 * - THEO (V.O.)
 * - FELIX (O.S.)
 * - NARRATOR (CONT'D)
 * - MAN'S VOICE (O.S.)
 */
export function couldBeCharacterName(line: string): boolean {
  const trimmed = line.trim();

  // Remove extension (V.O.), (O.S.), (CONT'D), etc. before checking for periods
  // Extensions are parenthesized and may contain periods
  const withoutExtension = trimmed.replace(/\s*\([^)]+\)$/, '');

  // Must contain at least one letter (filters out "112", etc.)
  if (!HAS_LETTER.test(withoutExtension)) {
    return false;
  }

  // Must be ALL CAPS
  if (withoutExtension !== withoutExtension.toUpperCase()) {
    return false;
  }

  // Must be reasonable length (character names aren't too long)
  if (withoutExtension.length <= 1 || withoutExtension.length >= 50) {
    return false;
  }

  // Filter out transition/scene keywords
  if (NON_CHARACTER_KEYWORDS_REGEX.test(withoutExtension)) {
    return false;
  }

  // Check for periods in name (but allow periods in extension)
  // Exception: common titles like DR., MR., MRS., MS., SGT., LT., GEN., etc.
  const nameWithoutTitle = withoutExtension.replace(/^(DR|MR|MRS|MS|SGT|LT|GEN|CPT|COL|MAJ|REV|PROF)\.\s*/i, '');
  if (nameWithoutTitle.includes('.')) {
    return false;
  }

  // Filter out lines that look like action (sentences, common action starters)
  for (const pattern of ACTION_INDICATORS) {
    if (pattern.test(withoutExtension)) {
      return false;
    }
  }

  // Character names are typically 1-4 words
  const wordCount = withoutExtension.split(/\s+/).length;
  if (wordCount > 4) {
    return false;
  }

  return true;
}

/**
 * Extract character name and extension from a character line
 * Handles various extension formats: (V.O.), (VO), (O.S.), (OS), (CONT'D), etc.
 */
export function parseCharacterLine(line: string): { name: string; extension: string | null } {
  const trimmed = line.trim();

  // Try the specific regex first
  const match = trimmed.match(CHARACTER_EXTENSION_REGEX);
  if (match) {
    return {
      name: match[1].trim(),
      extension: match[2] || null
    };
  }

  // Fallback: generic parenthetical at end
  const genericMatch = trimmed.match(/^(.+?)\s*(\([^)]+\))\s*$/);
  if (genericMatch) {
    return {
      name: genericMatch[1].trim(),
      extension: genericMatch[2] || null
    };
  }

  return {
    name: trimmed,
    extension: null
  };
}

/**
 * Test if text looks like a screenplay (for auto-detection)
 */
export function looksLikeScreenplay(text: string): boolean {
  return (
    HAS_SCENE_HEADINGS_REGEX.test(text) ||
    HAS_CHARACTER_DIALOGUE_REGEX.test(text) ||
    HAS_TRANSITIONS_REGEX.test(text)
  );
}

/**
 * Test if a line is a shot/camera direction
 */
export function isShot(line: string): boolean {
  const trimmed = line.trim();
  return SHOT_DETECT_REGEX.test(trimmed);
}

/**
 * Detect shot type and extract subject from a shot line
 * Returns null if not a recognized shot pattern
 *
 * Examples:
 * - "WIDE SHOT - The city skyline" → { shotType: 'WIDE', subject: 'The city skyline' }
 * - "CU THEO'S FACE" → { shotType: 'CLOSE_UP', subject: "THEO'S FACE" }
 * - "POV" → { shotType: 'POV', subject: null }
 */
export function detectShot(line: string): { shotType: DetectedShotType; subject: string | null } | null {
  const trimmed = line.trim();

  for (const { pattern, type } of SHOT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      // Get the rest of the line after the shot type
      const remainder = trimmed.slice(match[0].length).trim();

      // Remove leading separators like "-", ":", "ON"
      const subject = remainder
        .replace(/^[-:–—]\s*/, '')  // Remove dash/colon separators
        .replace(/^ON\s+/i, '')     // Remove "ON" prefix
        .trim() || null;

      return { shotType: type, subject };
    }
  }

  return null;
}

/**
 * Get display name for a shot type
 */
export function getShotDisplayName(shotType: DetectedShotType | null): string {
  if (!shotType) return 'Shot';

  const names: Record<DetectedShotType, string> = {
    WIDE: 'Wide Shot',
    EXTREME_WIDE: 'Extreme Wide Shot',
    MEDIUM: 'Medium Shot',
    MEDIUM_WIDE: 'Medium Wide Shot',
    MEDIUM_CLOSE: 'Medium Close-Up',
    CLOSE_UP: 'Close-Up',
    EXTREME_CLOSE_UP: 'Extreme Close-Up',
    TWO_SHOT: 'Two-Shot',
    THREE_SHOT: 'Three-Shot',
    GROUP_SHOT: 'Group Shot',
    OVER_SHOULDER: 'Over-the-Shoulder',
    POV: 'Point of View',
    INSERT: 'Insert',
    ANGLE_ON: 'Angle On',
    MOVING: 'Moving Shot',
    TRACKING: 'Tracking Shot',
    ESTABLISHING: 'Establishing Shot',
    AERIAL: 'Aerial Shot',
    LOW_ANGLE: 'Low Angle',
    HIGH_ANGLE: 'High Angle',
    DUTCH_ANGLE: 'Dutch Angle',
  };

  return names[shotType] || 'Shot';
}
