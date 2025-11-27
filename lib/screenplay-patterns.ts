/**
 * Centralized regex patterns for screenplay parsing and formatting
 */

// Scene headings
export const SCENE_HEADING_REGEX = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i;
export const SCENE_HEADING_WITH_NUMBER_REGEX = /^\d+\.\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i;

// Transitions
export const TRANSITION_START_REGEX = /^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|DIAGONAL WIPE|FLASH)/i;
export const TRANSITION_FULL_REGEX = /^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|END|THE END).*:/i;
export const FADE_OUT_REGEX = /^FADE\s+OUT\.?$/i;

// Character names
export const CHARACTER_NAME_WITH_EXTENSION_REGEX = /^([A-Z][A-Z\s'.-]+?)(\s*\([A-Z\.'\s]+\))?$/;
export const CHARACTER_EXTENSION_REGEX = /^(.+?)\s*(\((?:V\.O\.|O\.S\.|O\.C\.|CONT'D)\))$/;

// Parentheticals
export const PARENTHETICAL_REGEX = /^\(.+\)$/;

// Camera directions
export const CAMERA_DIRECTION_REGEX = /^(PUSH IN|PULL BACK|QUICK CUTS|FREEZE FRAME|CLOSE ON|WIDE ON|ANGLE ON|MONTAGE|SERIES OF SHOTS)/i;

// Special elements
export const ACT_HEADER_REGEX = /^ACT\s+[IVX]+:/;
export const END_MARKER_REGEX = /^(THE END|END)$/i;

// Exclusion patterns (things that look like character names but aren't)
export const NON_CHARACTER_KEYWORDS_REGEX = /^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|END|THE END|CONTINUED)/;

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
 */
export function couldBeCharacterName(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === trimmed.toUpperCase() &&
    trimmed.length > 1 &&
    trimmed.length < 50 &&
    !NON_CHARACTER_KEYWORDS_REGEX.test(trimmed) &&
    !trimmed.includes('.')
  );
}

/**
 * Extract character name and extension from a character line
 */
export function parseCharacterLine(line: string): { name: string; extension: string | null } {
  const trimmed = line.trim();
  const match = trimmed.match(CHARACTER_EXTENSION_REGEX);

  if (match) {
    return {
      name: match[1].trim(),
      extension: match[2] || null
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
