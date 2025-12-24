/**
 * Fountain Parser
 *
 * Parses Fountain markup (.fountain files) into screenplay elements.
 * Fountain is a plain text markup language for screenwriting.
 *
 * @see https://fountain.io/syntax
 */

import { Scene, SceneElement } from '@/types/screenplay';
import type {
  ImportStats,
  ImportWarning,
  ParsedCharacter,
  DualDialogueGroup,
} from '@/lib/parsers/types';

// Alias for clarity
type ScreenplayElement = SceneElement;

export interface FountainTitlePage {
  title?: string;
  credit?: string;
  author?: string;
  authors?: string;
  source?: string;
  draftDate?: string;
  contact?: string;
  copyright?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface FountainParseResult {
  titlePage: FountainTitlePage;
  content: string;
  scenes: Scene[];
  elements: ScreenplayElement[];
  rawText: string;
  // Enhanced fields
  stats?: ImportStats;
  warnings?: ImportWarning[];
  characters?: ParsedCharacter[];
  dualDialogues?: DualDialogueGroup[];
}

// Fountain syntax patterns
const PATTERNS = {
  // Title page: Key: Value format at start of document
  titlePageKey: /^(Title|Credit|Author|Authors|Source|Draft date|Contact|Copyright|Notes|[A-Za-z\s]+)\s*:\s*(.*)$/i,

  // Scene headings: INT./EXT./etc., or forced with leading .
  sceneHeading: /^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s].*$/i,
  forcedSceneHeading: /^\./,

  // Character: All caps line (optionally with extensions like (V.O.), (O.S.))
  // Can be forced with @
  character: /^[A-Z][A-Z\s\d'.\-]+(\s*\([A-Z.'\s]+\))?$/,
  forcedCharacter: /^@/,

  // Parenthetical: (wrapped in parentheses)
  parenthetical: /^\s*\([^)]+\)\s*$/,

  // Transition: Ends with TO: or forced with >
  transition: /^[A-Z\s]+TO:$/,
  forcedTransition: /^>/,

  // Centered text: >centered<
  centered: /^>.*<$/,

  // Lyrics: Lines starting with ~
  lyrics: /^~/,

  // Section headers: # for levels
  section: /^(#{1,6})\s*(.+)$/,

  // Synopsis: = at start
  synopsis: /^=\s*(.+)$/,

  // Notes: [[note]]
  note: /\[\[([^\]]+)\]\]/g,

  // Comments: /* */ or [[*text*]]
  boneyardStart: /\/\*/,
  boneyardEnd: /\*\//,

  // Page breaks: === (3 or more)
  pageBreak: /^={3,}$/,

  // Emphasis
  boldItalic: /\*\*\*([^*]+)\*\*\*/g,
  bold: /\*\*([^*]+)\*\*/g,
  italic: /\*([^*]+)\*/g,
  underline: /_([^_]+)_/g,

  // Dual dialogue: ^ at end of character name
  dualDialogue: /\^$/,
};

/**
 * Parse a Fountain document into structured data
 */
export function parseFountain(fountainText: string): FountainParseResult {
  const lines = fountainText.split('\n');
  const titlePage: FountainTitlePage = {};
  const elements: ScreenplayElement[] = [];
  const scenes: Scene[] = [];
  const warnings: ImportWarning[] = [];
  const characterMap = new Map<string, ParsedCharacter>();
  const dualDialogues: DualDialogueGroup[] = [];

  let inTitlePage = true;
  let inBoneyard = false;
  const contentLines: string[] = [];
  let currentScene: Scene | null = null;
  let sceneNumber = 0;
  let elementId = 0;
  let previousLineWasBlank = true;
  let previousElement: ScreenplayElement | null = null;

  // Stats tracking
  let dialogueCount = 0;
  let actionCount = 0;
  let transitionCount = 0;
  const dualDialogueCount = 0; // Fountain dual dialogue counted via ^ marker

  // Dual dialogue state
  let pendingDualDialogue: {
    left: { character: string; extension?: string; dialogue: string[]; parentheticals: string[] };
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle boneyard (comments)
    if (PATTERNS.boneyardStart.test(line)) {
      inBoneyard = true;
    }
    if (inBoneyard) {
      if (PATTERNS.boneyardEnd.test(line)) {
        inBoneyard = false;
      }
      continue;
    }

    // Remove inline notes
    line = line.replace(PATTERNS.note, '');

    // Parse title page
    if (inTitlePage) {
      const titleMatch = line.match(PATTERNS.titlePageKey);
      if (titleMatch) {
        const key = titleMatch[1].toLowerCase().replace(/\s+/g, '');
        const value = titleMatch[2].trim();

        switch (key) {
          case 'title':
            titlePage.title = value;
            break;
          case 'credit':
            titlePage.credit = value;
            break;
          case 'author':
          case 'authors':
            titlePage.author = value;
            break;
          case 'source':
            titlePage.source = value;
            break;
          case 'draftdate':
            titlePage.draftDate = value;
            break;
          case 'contact':
            titlePage.contact = value;
            break;
          case 'copyright':
            titlePage.copyright = value;
            break;
          case 'notes':
            titlePage.notes = value;
            break;
          default:
            titlePage[key] = value;
        }
        continue;
      }

      // Empty line after title page = end of title page
      if (line.trim() === '' && Object.keys(titlePage).length > 0) {
        inTitlePage = false;
        continue;
      }

      // Non-title-page content = end of title page
      if (line.trim() !== '' && !PATTERNS.titlePageKey.test(line)) {
        inTitlePage = false;
      }
    }

    const trimmedLine = line.trim();
    const isBlankLine = trimmedLine === '';

    // Skip page breaks
    if (PATTERNS.pageBreak.test(trimmedLine)) {
      contentLines.push('\n---PAGE BREAK---\n');
      previousLineWasBlank = true;
      continue;
    }

    // Skip section headers and synopsis (metadata)
    if (PATTERNS.section.test(trimmedLine) || PATTERNS.synopsis.test(trimmedLine)) {
      continue;
    }

    // Scene heading
    if (previousLineWasBlank && (
      PATTERNS.sceneHeading.test(trimmedLine) ||
      (PATTERNS.forcedSceneHeading.test(trimmedLine) && trimmedLine.length > 1)
    )) {
      // Remove forced marker
      const heading = trimmedLine.startsWith('.') ? trimmedLine.substring(1) : trimmedLine;

      // Save previous scene
      if (currentScene) {
        scenes.push(currentScene);
      }

      sceneNumber++;
      const locationName = extractLocation(heading);
      currentScene = {
        id: `scene-${sceneNumber}`,
        number: sceneNumber,
        heading: heading.toUpperCase(),
        location: {
          id: `loc-${sceneNumber}`,
          name: locationName,
          type: extractLocationType(heading),
          color: '#888888',
        },
        timeOfDay: extractTimeOfDay(heading),
        characters: [],
        elements: [],
        synopsis: '',
      };

      const element: ScreenplayElement = {
        id: `elem-${++elementId}`,
        type: 'scene-heading',
        content: heading.toUpperCase(),
      };
      elements.push(element);
      currentScene.elements.push(element);
      contentLines.push(`\n${heading.toUpperCase()}\n`);
      previousLineWasBlank = false;
      previousElement = element;
      continue;
    }

    // Transition
    if (previousLineWasBlank && (
      PATTERNS.transition.test(trimmedLine) ||
      PATTERNS.forcedTransition.test(trimmedLine)
    )) {
      const transition = trimmedLine.startsWith('>') ? trimmedLine.substring(1).trim() : trimmedLine;

      transitionCount++;

      const element: ScreenplayElement = {
        id: `elem-${++elementId}`,
        type: 'transition',
        content: transition.toUpperCase(),
      };
      elements.push(element);
      if (currentScene) currentScene.elements.push(element);
      contentLines.push(`\n                                                          ${transition.toUpperCase()}\n`);
      previousLineWasBlank = false;
      previousElement = element;
      continue;
    }

    // Centered text
    if (PATTERNS.centered.test(trimmedLine)) {
      const centered = trimmedLine.slice(1, -1).trim();
      contentLines.push(`\n                              ${centered}\n`);
      previousLineWasBlank = false;
      continue;
    }

    // Character (must follow blank line)
    if (previousLineWasBlank && (
      PATTERNS.character.test(trimmedLine) ||
      PATTERNS.forcedCharacter.test(trimmedLine)
    )) {
      let characterName = trimmedLine.startsWith('@') ? trimmedLine.substring(1).trim() : trimmedLine;

      // Check for dual dialogue marker
      const isDual = PATTERNS.dualDialogue.test(characterName);
      if (isDual) {
        characterName = characterName.slice(0, -1).trim();
      }

      // Parse character name and extension
      const { name: baseName, extension } = parseCharacterExtension(characterName);

      // Track character for stats
      if (!characterMap.has(baseName)) {
        characterMap.set(baseName, { name: baseName, extension, dialogueCount: 0 });
      }

      // Handle dual dialogue tracking
      if (isDual && pendingDualDialogue) {
        // This is the right side of dual dialogue
        pendingDualDialogue = null; // Will be completed when dialogue ends
      } else if (!isDual) {
        // Start tracking for potential dual dialogue
        pendingDualDialogue = {
          left: { character: baseName, extension: extension || undefined, dialogue: [], parentheticals: [] },
        };
      }

      const element: ScreenplayElement = {
        id: `elem-${++elementId}`,
        type: 'character',
        content: characterName,
        isDualDialogue: isDual,
      };
      elements.push(element);
      if (currentScene) {
        currentScene.elements.push(element);
        // Track character appearances
        if (!currentScene.characters.includes(baseName)) {
          currentScene.characters.push(baseName);
        }
      }
      contentLines.push(`\n                              ${characterName}\n`);
      previousLineWasBlank = false;
      previousElement = element;
      continue;
    }

    // Parenthetical
    if (PATTERNS.parenthetical.test(line) && (previousElement?.type === 'character' || previousElement?.type === 'dialogue')) {
      const element: ScreenplayElement = {
        id: `elem-${++elementId}`,
        type: 'parenthetical',
        content: trimmedLine,
      };
      elements.push(element);
      if (currentScene) currentScene.elements.push(element);
      contentLines.push(`                         ${trimmedLine}\n`);
      previousLineWasBlank = false;
      previousElement = element;
      continue;
    }

    // Dialogue (follows character or parenthetical)
    const prevType = previousElement?.type;
    if (!isBlankLine && (prevType === 'character' || prevType === 'parenthetical' || prevType === 'dialogue')) {
      // Remove lyrics marker
      const dialogueContent = trimmedLine.startsWith('~') ? trimmedLine.substring(1).trim() : trimmedLine;

      // Apply emphasis formatting
      const formatted = applyEmphasis(dialogueContent);

      dialogueCount++;

      // Update character dialogue count
      if (currentScene && currentScene.characters.length > 0) {
        const lastChar = currentScene.characters[currentScene.characters.length - 1];
        const charData = characterMap.get(lastChar);
        if (charData) {
          charData.dialogueCount = (charData.dialogueCount || 0) + 1;
        }
      }

      const element: ScreenplayElement = {
        id: `elem-${++elementId}`,
        type: 'dialogue',
        content: formatted,
        isLyrics: PATTERNS.lyrics.test(trimmedLine),
      };
      elements.push(element);
      if (currentScene) currentScene.elements.push(element);
      contentLines.push(`                    ${formatted}\n`);
      previousLineWasBlank = false;
      previousElement = element;
      continue;
    }

    // Action (default)
    if (!isBlankLine) {
      const formatted = applyEmphasis(trimmedLine);

      actionCount++;

      const element: ScreenplayElement = {
        id: `elem-${++elementId}`,
        type: 'action',
        content: formatted,
      };
      elements.push(element);
      if (currentScene) currentScene.elements.push(element);
      contentLines.push(`${formatted}\n`);
      previousLineWasBlank = false;
      previousElement = element;
      continue;
    }

    // Blank line
    if (isBlankLine) {
      contentLines.push('\n');
      previousLineWasBlank = true;
      previousElement = null;
    }
  }

  // Save final scene
  if (currentScene) {
    scenes.push(currentScene);
  }

  // Build stats
  const stats: ImportStats = {
    scenes: scenes.length,
    characters: Array.from(characterMap.keys()),
    pages: Math.ceil(elements.length / 55), // Rough estimate: ~55 elements per page
    dialogueBlocks: dialogueCount,
    actionBlocks: actionCount,
    transitions: transitionCount,
    dualDialogues: dualDialogueCount,
    revisionMarks: 0, // Fountain doesn't have revision tracking
  };

  // Add warnings for potential issues
  if (scenes.length === 0) {
    warnings.push({
      type: 'structure',
      message: 'No scene headings detected',
      location: {},
      suggestion: 'Consider adding scene headings (INT./EXT.) for proper formatting',
    });
  }

  if (characterMap.size === 0 && elements.length > 10) {
    warnings.push({
      type: 'character',
      message: 'No character names detected',
      location: {},
      suggestion: 'Character names should be in ALL CAPS',
    });
  }

  return {
    titlePage,
    content: contentLines.join(''),
    scenes,
    elements,
    rawText: fountainText,
    stats,
    warnings,
    characters: Array.from(characterMap.values()),
    dualDialogues,
  };
}

/**
 * Parse character name and extension (V.O., O.S., CONT'D, etc.)
 */
function parseCharacterExtension(text: string): { name: string; extension: string | null } {
  // Match patterns: "FELIX", "FELIX (V.O.)", "FELIX (CONT'D)", "FELIX (O.S.) (CONT'D)"
  const extensionPattern = /^(.+?)\s*(\([^)]+\))?\s*(\([^)]+\))?$/;
  const match = text.trim().match(extensionPattern);

  if (!match) return { name: text.trim(), extension: null };

  const name = match[1].trim();
  const extensions = [match[2], match[3]].filter(Boolean).join(' ');

  return { name, extension: extensions || null };
}

/**
 * Apply Fountain emphasis markers to text
 */
function applyEmphasis(text: string): string {
  return text
    .replace(PATTERNS.boldItalic, '***$1***')
    .replace(PATTERNS.bold, '**$1**')
    .replace(PATTERNS.italic, '*$1*')
    .replace(PATTERNS.underline, '_$1_');
}

/**
 * Extract location name from scene heading
 */
function extractLocation(heading: string): string {
  // Remove INT./EXT. prefix and time of day suffix
  const withoutPrefix = heading.replace(/^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]+/i, '');
  const withoutTime = withoutPrefix.replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER).*$/i, '');
  return withoutTime.trim();
}

/**
 * Extract location type from scene heading
 */
function extractLocationType(heading: string): 'INT' | 'EXT' | 'INT/EXT' {
  if (/^INT\.?\/EXT|^I\.?\/E/i.test(heading)) return 'INT/EXT';
  if (/^INT/i.test(heading)) return 'INT';
  if (/^EXT|^EST/i.test(heading)) return 'EXT';
  return 'INT';
}

/**
 * Extract time of day from scene heading
 */
function extractTimeOfDay(heading: string): 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' {
  const match = heading.match(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER.*)$/i);
  if (!match) return 'DAY';

  const timeStr = match[1].toUpperCase();
  if (timeStr === 'NIGHT') return 'NIGHT';
  if (timeStr === 'DAWN' || timeStr === 'MORNING') return 'DAWN';
  if (timeStr === 'DUSK' || timeStr === 'EVENING' || timeStr === 'AFTERNOON') return 'DUSK';
  if (timeStr === 'CONTINUOUS' || timeStr === 'LATER' || timeStr === 'SAME' || timeStr.includes('LATER')) return 'CONTINUOUS';
  return 'DAY';
}

/**
 * Convert plain text to Fountain format
 */
export function toFountain(
  title: string,
  author: string,
  content: string,
  metadata?: Record<string, string>
): string {
  let fountain = '';

  // Title page
  fountain += `Title: ${title}\n`;
  if (author) fountain += `Author: ${author}\n`;
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      if (key !== 'title' && key !== 'author') {
        fountain += `${key}: ${value}\n`;
      }
    });
  }
  fountain += '\n';

  // Content - the content should already be in screenplay format
  fountain += content;

  return fountain;
}

/**
 * Validate if text looks like valid Fountain markup
 */
export function isFountainFormat(text: string): boolean {
  // Check for title page markers
  if (PATTERNS.titlePageKey.test(text.split('\n')[0])) {
    return true;
  }

  // Check for scene headings
  const lines = text.split('\n');
  for (const line of lines) {
    if (PATTERNS.sceneHeading.test(line.trim()) || PATTERNS.forcedSceneHeading.test(line.trim())) {
      return true;
    }
  }

  return false;
}
