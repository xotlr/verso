/**
 * Lightweight screenplay data extraction for personalized greetings
 * Extracts characters and locations from raw screenplay text
 *
 * Includes confidence scoring to indicate extraction reliability:
 * - HIGH (0.8-1.0): Multiple characters with dialogue + proper scene headings
 * - MEDIUM (0.5-0.79): Some screenplay elements detected
 * - LOW (0.2-0.49): Minimal screenplay structure found
 * - NONE (0-0.19): Not a screenplay or empty content
 */

// Scene heading pattern - captures location
const SCENE_HEADING_REGEX = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*(.+?)(?:\s*-\s*(?:DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|LATER|CONTINUOUS|MOMENTS LATER))?$/im;

// Character name pattern - ALL CAPS, possibly with extension like (V.O.)
const CHARACTER_LINE_REGEX = /^([A-Z][A-Z\s'.-]{1,30})(?:\s*\([A-Z\.'\s]+\))?\s*$/;

// Words that look like character names but aren't
const FALSE_POSITIVES = new Set([
  'THE', 'AND', 'BUT', 'FOR', 'INT', 'EXT', 'DAY', 'NIGHT', 'FADE', 'CUT',
  'DISSOLVE', 'LATER', 'CONTINUOUS', 'MORNING', 'AFTERNOON', 'EVENING',
  'FLASHBACK', 'MONTAGE', 'INTERCUT', 'BACK', 'END', 'TITLE', 'SUPER',
  'ANGLE', 'CLOSE', 'WIDE', 'POV', 'INSERT', 'SERIES', 'TIME', 'MATCH',
  'SMASH', 'JUMP', 'FREEZE', 'FRAME', 'BLACK', 'WHITE', 'SCREEN',
]);

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

interface ExtractedData {
  characters: string[];
  locations: string[];
  /** Confidence score from 0.0 to 1.0 */
  confidence: number;
  /** Human-readable confidence level */
  confidenceLevel: ConfidenceLevel;
}

/**
 * Calculate confidence level from numeric score
 */
function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.5) return 'MEDIUM';
  if (score >= 0.2) return 'LOW';
  return 'NONE';
}

/**
 * Calculate confidence score based on extraction results
 *
 * Scoring factors:
 * - Characters with dialogue (0-0.4): More characters = higher confidence
 * - Scene headings/locations (0-0.3): Proper INT./EXT. formatting
 * - Character dialogue frequency (0-0.2): Characters with multiple lines
 * - Content length (0-0.1): Very short content gets penalty
 */
function calculateConfidence(
  characterCounts: Map<string, number>,
  locationCount: number,
  contentLength: number
): number {
  let score = 0;

  // Character score (0-0.4)
  const charCount = characterCounts.size;
  if (charCount >= 3) {
    score += 0.4;
  } else if (charCount === 2) {
    score += 0.3;
  } else if (charCount === 1) {
    score += 0.15;
  }

  // Location/scene heading score (0-0.3)
  if (locationCount >= 3) {
    score += 0.3;
  } else if (locationCount === 2) {
    score += 0.2;
  } else if (locationCount === 1) {
    score += 0.1;
  }

  // Dialogue frequency score (0-0.2)
  // Characters with multiple dialogue lines indicate real screenplay
  const totalDialogueLines = [...characterCounts.values()].reduce((a, b) => a + b, 0);
  if (totalDialogueLines >= 10) {
    score += 0.2;
  } else if (totalDialogueLines >= 5) {
    score += 0.15;
  } else if (totalDialogueLines >= 2) {
    score += 0.1;
  }

  // Content length score (0-0.1)
  // Very short content gets a penalty
  if (contentLength >= 1000) {
    score += 0.1;
  } else if (contentLength >= 500) {
    score += 0.05;
  }

  return Math.min(1.0, Math.max(0, score));
}

/**
 * Extract character names and locations from raw screenplay text
 * Returns top characters by frequency, unique locations, and confidence score
 */
export function extractScreenplayData(content: string | null | undefined): ExtractedData {
  if (!content) {
    return { characters: [], locations: [], confidence: 0, confidenceLevel: 'NONE' };
  }

  const lines = content.split('\n');
  const characterCounts = new Map<string, number>();
  const locations = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for scene headings
    const sceneMatch = line.match(SCENE_HEADING_REGEX);
    if (sceneMatch) {
      // Extract just the main location (first part before any dash)
      let location = sceneMatch[2].trim();
      // Take first part if there are multiple dashes (e.g., "HOUSE - KITCHEN - DAY" -> "HOUSE")
      const parts = location.split(/\s*-\s*/);
      if (parts.length > 0) {
        location = parts[0].trim();
        // Clean up common suffixes
        location = location.replace(/\s*(CONTINUOUS|LATER|SAME|MOMENTS LATER)$/i, '').trim();
        if (location && location.length > 2 && location.length < 40) {
          locations.add(location);
        }
      }
      continue;
    }

    // Check for character names (ALL CAPS lines followed by dialogue)
    const charMatch = line.match(CHARACTER_LINE_REGEX);
    if (charMatch) {
      const name = charMatch[1].trim();
      // Filter out false positives
      if (
        name.length >= 2 &&
        name.length <= 25 &&
        !FALSE_POSITIVES.has(name) &&
        !/^\d+$/.test(name) && // Not just numbers
        !/^(INT|EXT)/.test(name) // Not a scene heading fragment
      ) {
        // Check if next non-empty line looks like dialogue (not ALL CAPS)
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine) {
            // If next line has lowercase letters, this is likely a character
            if (/[a-z]/.test(nextLine) || nextLine.startsWith('(')) {
              characterCounts.set(name, (characterCounts.get(name) || 0) + 1);
            }
            break;
          }
        }
      }
    }
  }

  // Sort characters by frequency, take top 5
  const sortedCharacters = [...characterCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Take up to 5 locations
  const uniqueLocations = [...locations].slice(0, 5);

  // Calculate confidence
  const confidence = calculateConfidence(characterCounts, locations.size, content.length);
  const confidenceLevel = getConfidenceLevel(confidence);

  return {
    characters: sortedCharacters,
    locations: uniqueLocations,
    confidence,
    confidenceLevel,
  };
}
