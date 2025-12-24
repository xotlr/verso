/**
 * Markdown Screenplay Parser
 *
 * Parses Markdown-formatted screenplays with patterns like:
 * - ### INT./EXT. LOCATION - TIME (scene headings)
 * - **CHARACTER** (character names)
 * - *(parenthetical)* (parentheticals)
 * - **CHARACTER^** (dual dialogue marker)
 */

import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
  ParseWarning,
} from '../types';
import { registerParser } from '../registry';
import { Scene, SceneElement, Location } from '@/types/screenplay';
import {
  isTransition,
  detectShot,
  FADE_OUT_REGEX,
} from '@/lib/screenplay/patterns';

// Markdown-specific patterns
const MD_PATTERNS = {
  // # Title at document start (h1)
  title: /^#\s+(.+)$/,

  // ## or ### with INT./EXT. pattern (scene heading)
  sceneHeading: /^#{2,3}\s+((?:INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s].*)$/i,

  // **CHARACTER** or **CHARACTER (V.O.)** or **CHARACTER^** (dual dialogue)
  character: /^\*\*([A-Z][A-Z\s'.\-0-9]+(?:\s*\([A-Z.'\s]+\))?)\*\*(\^)?$/,

  // *(parenthetical text)* or (*(parenthetical text)*)
  parenthetical: /^\*\(([^)]+)\)\*$|^\(\*([^*]+)\*\)$/,

  // --- horizontal rule (section break)
  sectionBreak: /^-{3,}$/,

  // Metadata line like "Author: Name" or "Draft: Date"
  metadataLine: /^([A-Za-z\s]+):\s*(.+)$/,

  // Bold text (for possible subtitle)
  boldText: /^\*\*(.+)\*\*$/,
};

// Character extension pattern
const CHARACTER_EXTENSION_REGEX = /^(.+?)\s*\(([A-Z.'\s]+)\)$/;

// Words that look like characters but aren't
const NON_CHARACTER_WORDS = ['THE END', 'END', 'FADE OUT', 'FADE IN', 'CUT TO', 'CONTINUED'];

type PreviousElement = 'blank' | 'scene_heading' | 'character' | 'parenthetical' | 'dialogue' | 'action' | 'transition' | 'shot';

class MarkdownScreenplayParser implements ScreenplayParser {
  readonly format = 'markdown-screenplay' as const;
  readonly name = 'Markdown Screenplay';
  readonly extensions = ['md', 'markdown', 'mdown'];
  readonly mimeTypes = ['text/markdown', 'text/x-markdown'];

  /**
   * Check if content can be parsed as Markdown Screenplay
   */
  canParse(content: string | ArrayBuffer): boolean {
    const text = this.getTextContent(content);
    return this.getConfidence(text) >= 0.4;
  }

  /**
   * Get confidence score for Markdown Screenplay format (0-1)
   */
  getConfidence(content: string | ArrayBuffer): number {
    const text = this.getTextContent(content);
    const lines = text.split('\n').slice(0, 150); // Check first 150 lines

    let score = 0;
    let hasMdSceneHeadings = false;
    let hasBoldCharacters = false;
    let hasItalicParens = false;

    // Penalize if it's clearly another format
    if (text.includes('<FinalDraft') || text.includes('<?xml')) {
      return 0;
    }

    for (const line of lines) {
      const trimmed = line.trim();

      // Signal 1: Markdown h2/h3 scene headings (### INT./EXT.)
      if (MD_PATTERNS.sceneHeading.test(trimmed)) {
        hasMdSceneHeadings = true;
        score += 0.15;
      }

      // Signal 2: Bold character names (**CHARACTER**)
      if (MD_PATTERNS.character.test(trimmed)) {
        hasBoldCharacters = true;
        score += 0.1;
      }

      // Signal 3: Italic parentheticals (*(text)*)
      if (MD_PATTERNS.parenthetical.test(trimmed)) {
        hasItalicParens = true;
        score += 0.05;
      }

      // Signal 4: Title as h1 (# Title) near start
      if (MD_PATTERNS.title.test(trimmed) && lines.indexOf(line) < 5) {
        score += 0.1;
      }
    }

    // Must have at least one Markdown-specific indicator
    if (!hasMdSceneHeadings && !hasBoldCharacters) {
      // No clear Markdown screenplay patterns - likely standard Fountain
      return 0.1;
    }

    // Bonus for having multiple Markdown patterns
    if (hasMdSceneHeadings && hasBoldCharacters) {
      score += 0.15;
    }
    if (hasItalicParens) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  /**
   * Parse Markdown screenplay content
   */
  async parse(
    content: string | ArrayBuffer,
    options?: ParseOptions
  ): Promise<ParseOutcome> {
    const { onProgress } = options || {};

    try {
      onProgress?.({
        stage: 'reading',
        percent: 10,
        message: 'Reading Markdown file...',
      });

      const text = this.getTextContent(content);

      if (!text.trim()) {
        return {
          success: false,
          format: 'markdown-screenplay',
          error: 'File is empty',
          errorCode: 'EMPTY_FILE',
          warnings: [],
        };
      }

      onProgress?.({
        stage: 'parsing',
        percent: 30,
        message: 'Parsing screenplay content...',
      });

      const { titlePage, scenes, elements, warnings, plainContent } = this.parseContent(text);

      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'Import complete',
      });

      return {
        success: true,
        format: 'markdown-screenplay',
        titlePage,
        content: plainContent,
        scenes,
        elements,
        rawContent: text,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        format: 'markdown-screenplay',
        error: error instanceof Error ? error.message : 'Unknown error parsing Markdown',
        errorCode: 'PARSE_ERROR',
        warnings: [],
      };
    }
  }

  /**
   * Parse the content into scenes and elements
   */
  private parseContent(text: string): {
    titlePage: TitlePage;
    scenes: Scene[];
    elements: SceneElement[];
    warnings: ParseWarning[];
    plainContent: string;
  } {
    const lines = text.split('\n');
    const titlePage: TitlePage = {};
    const scenes: Scene[] = [];
    const elements: SceneElement[] = [];
    const warnings: ParseWarning[] = [];
    const plainContentLines: string[] = [];

    let previousElement: PreviousElement = 'blank';
    let currentScene: Scene | null = null;
    let sceneNumber = 0;
    let elementId = 0;
    let inTitlePage = true;
    let lastCharacterId: string | undefined;
    let pendingDualDialogue = false;

    const generateId = () => `elem-${++elementId}`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines but track blank state
      if (!trimmed) {
        previousElement = 'blank';
        continue;
      }

      // Title page parsing (at document start)
      if (inTitlePage) {
        // Check for h1 title
        const titleMatch = trimmed.match(MD_PATTERNS.title);
        if (titleMatch && i < 5) {
          titlePage.title = titleMatch[1].trim();
          continue;
        }

        // Check for metadata lines
        const metaMatch = trimmed.match(MD_PATTERNS.metadataLine);
        if (metaMatch) {
          const key = metaMatch[1].toLowerCase().trim();
          const value = metaMatch[2].trim();
          if (key === 'author' || key === 'by') {
            titlePage.author = value;
          } else if (key === 'draft' || key === 'draft date') {
            titlePage.draftDate = value;
          } else if (key === 'contact') {
            titlePage.contact = value;
          } else if (key === 'copyright') {
            titlePage.copyright = value;
          }
          continue;
        }

        // Check for bold subtitle (like **A Short Film**)
        const boldMatch = trimmed.match(MD_PATTERNS.boldText);
        if (boldMatch && !MD_PATTERNS.character.test(trimmed)) {
          // Treat as subtitle/credit if it's not a character name
          const boldContent = boldMatch[1];
          if (!this.looksLikeCharacterName(boldContent)) {
            titlePage.credit = boldContent;
            continue;
          }
        }

        // Section break ends title page area
        if (MD_PATTERNS.sectionBreak.test(trimmed)) {
          inTitlePage = false;
          continue;
        }

        // Scene heading also ends title page
        if (MD_PATTERNS.sceneHeading.test(trimmed)) {
          inTitlePage = false;
          // Don't continue - process as scene heading below
        }
      }

      // Section breaks (---)
      if (MD_PATTERNS.sectionBreak.test(trimmed)) {
        previousElement = 'blank';
        continue;
      }

      // Scene heading (### INT./EXT.)
      const sceneMatch = trimmed.match(MD_PATTERNS.sceneHeading);
      if (sceneMatch) {
        const headingText = sceneMatch[1].trim();
        sceneNumber++;

        const location = this.extractLocation(headingText);
        currentScene = {
          id: `scene-${sceneNumber}`,
          number: sceneNumber,
          heading: headingText,
          location,
          timeOfDay: this.extractTimeOfDay(headingText),
          elements: [],
          characters: [],
        };
        scenes.push(currentScene);

        const element: SceneElement = {
          id: generateId(),
          type: 'scene-heading',
          content: headingText,
        };
        elements.push(element);
        currentScene.elements.push(element);
        plainContentLines.push(headingText);

        previousElement = 'scene_heading';
        continue;
      }

      // Character name (**CHARACTER** or **CHARACTER (V.O.)**)
      const charMatch = trimmed.match(MD_PATTERNS.character);
      if (charMatch) {
        const characterText = charMatch[1].trim();
        const isDual = charMatch[2] === '^';

        // Skip non-character words like "THE END"
        if (NON_CHARACTER_WORDS.includes(characterText.toUpperCase())) {
          // Treat as ending or transition
          const element: SceneElement = {
            id: generateId(),
            type: 'action',
            content: characterText,
          };
          elements.push(element);
          currentScene?.elements.push(element);
          plainContentLines.push(characterText);
          previousElement = 'action';
          continue;
        }

        // Parse character name and extension
        const { name, extension } = this.parseMarkdownCharacter(characterText);

        const characterId = name.toUpperCase().replace(/\s+/g, '_');
        lastCharacterId = characterId;

        // Track character in scene
        if (currentScene && !currentScene.characters.includes(name)) {
          currentScene.characters.push(name);
        }

        const element: SceneElement = {
          id: generateId(),
          type: 'character',
          content: extension ? `${name} ${extension}` : name,
          characterId,
          isDualDialogue: isDual || pendingDualDialogue,
        };
        elements.push(element);
        currentScene?.elements.push(element);
        plainContentLines.push(extension ? `${name} ${extension}` : name);

        previousElement = 'character';
        pendingDualDialogue = isDual; // Next character starts dual dialogue
        continue;
      }

      // Parenthetical (*(text)* or (*(text)*))
      if (MD_PATTERNS.parenthetical.test(trimmed) &&
          (previousElement === 'character' || previousElement === 'dialogue' || previousElement === 'parenthetical')) {
        const parenMatch = trimmed.match(MD_PATTERNS.parenthetical);
        const parenContent = parenMatch?.[1] || parenMatch?.[2] || trimmed;

        const element: SceneElement = {
          id: generateId(),
          type: 'parenthetical',
          content: `(${parenContent})`,
          characterId: lastCharacterId,
        };
        elements.push(element);
        currentScene?.elements.push(element);
        plainContentLines.push(`(${parenContent})`);

        previousElement = 'parenthetical';
        continue;
      }

      // Transitions (FADE IN:, CUT TO:, etc.)
      if (isTransition(trimmed) || FADE_OUT_REGEX.test(trimmed)) {
        const element: SceneElement = {
          id: generateId(),
          type: 'transition',
          content: trimmed,
        };
        elements.push(element);
        currentScene?.elements.push(element);
        plainContentLines.push(trimmed);

        previousElement = 'transition';
        continue;
      }

      // Shots (CLOSE ON, WIDE SHOT, etc.)
      const shotInfo = detectShot(trimmed);
      if (shotInfo) {
        const element: SceneElement = {
          id: generateId(),
          type: 'action', // Shots are stored as action with the content
          content: trimmed,
        };
        elements.push(element);
        currentScene?.elements.push(element);
        plainContentLines.push(trimmed);

        previousElement = 'shot';
        continue;
      }

      // Dialogue (plain text after character/parenthetical)
      if (previousElement === 'character' || previousElement === 'parenthetical' || previousElement === 'dialogue') {
        const element: SceneElement = {
          id: generateId(),
          type: 'dialogue',
          content: trimmed,
          characterId: lastCharacterId,
        };
        elements.push(element);
        currentScene?.elements.push(element);
        plainContentLines.push(trimmed);

        previousElement = 'dialogue';
        continue;
      }

      // Action (default for non-matching paragraphs)
      const element: SceneElement = {
        id: generateId(),
        type: 'action',
        content: trimmed,
      };
      elements.push(element);
      currentScene?.elements.push(element);
      plainContentLines.push(trimmed);

      previousElement = 'action';
    }

    // Prepend title page data to content so editor serialization can detect it
    const titlePageLines: string[] = [];
    if (titlePage.title) {
      titlePageLines.push(titlePage.title); // First line = title (extractCoverPageFromLines detects this)
    }
    if (titlePage.author) {
      titlePageLines.push('Written by');
      titlePageLines.push(titlePage.author);
    }
    if (titlePage.credit) {
      // Subtitle like "A Short Film" - add as-is
      titlePageLines.push(titlePage.credit);
    }
    if (titlePage.draftDate) {
      titlePageLines.push(`Draft: ${titlePage.draftDate}`);
    }
    if (titlePageLines.length > 0) {
      titlePageLines.push(''); // Blank line separator before screenplay content
    }

    return {
      titlePage,
      scenes,
      elements,
      warnings,
      plainContent: [...titlePageLines, ...plainContentLines].join('\n'),
    };
  }

  /**
   * Parse Markdown character name with extension
   * Input: "RONALD (V.O.)" or "RONALD"
   */
  private parseMarkdownCharacter(text: string): { name: string; extension: string | null } {
    const match = text.match(CHARACTER_EXTENSION_REGEX);
    if (match) {
      return {
        name: match[1].trim(),
        extension: `(${match[2].trim()})`,
      };
    }
    return { name: text.trim(), extension: null };
  }

  /**
   * Extract location from scene heading
   */
  private extractLocation(heading: string): Location {
    // Remove INT./EXT. prefix
    const withoutPrefix = heading.replace(/^(INT\.?\/EXT\.?|INT\.?|EXT\.?|I\.?\/E\.?|EST\.?)\s*/i, '');

    // Split by " - " to get location and time
    const parts = withoutPrefix.split(/\s+-\s+/);
    const locationName = parts[0]?.trim() || 'UNKNOWN';

    // Determine location type
    let type: 'INT' | 'EXT' | 'INT/EXT' = 'INT';
    if (/^(INT\.?\/EXT|I\.?\/E)/i.test(heading)) {
      type = 'INT/EXT';
    } else if (/^EXT/i.test(heading)) {
      type = 'EXT';
    }

    return {
      id: locationName.toLowerCase().replace(/\s+/g, '-'),
      name: locationName,
      type,
      color: '#888888',
    };
  }

  /**
   * Extract time of day from scene heading
   */
  private extractTimeOfDay(heading: string): 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' {
    const upperHeading = heading.toUpperCase();

    if (/\b(NIGHT|EVENING|MIDNIGHT|LATE\s*NIGHT)\b/.test(upperHeading)) {
      return 'NIGHT';
    }
    if (/\b(DAWN|SUNRISE|EARLY\s*MORNING|DAYBREAK)\b/.test(upperHeading)) {
      return 'DAWN';
    }
    if (/\b(DUSK|SUNSET|TWILIGHT|GOLDEN\s*HOUR)\b/.test(upperHeading)) {
      return 'DUSK';
    }
    if (/\b(CONTINUOUS|CONT\.?|LATER|MOMENTS?\s*LATER|SAME)\b/.test(upperHeading)) {
      return 'CONTINUOUS';
    }
    if (/\b(MORNING|EARLY|AFTERNOON|DAY)\b/.test(upperHeading)) {
      return 'DAY';
    }

    // Default to DAY
    return 'DAY';
  }

  /**
   * Check if bold text looks like a character name
   */
  private looksLikeCharacterName(text: string): boolean {
    // Character names are typically all caps
    const isAllCaps = text === text.toUpperCase();
    // And short
    const isShort = text.length < 30;
    // And don't contain lowercase
    const hasLowercase = /[a-z]/.test(text);

    return isAllCaps && isShort && !hasLowercase;
  }

  /**
   * Convert ArrayBuffer to string if needed
   */
  private getTextContent(content: string | ArrayBuffer): string {
    if (content instanceof ArrayBuffer) {
      return new TextDecoder('utf-8').decode(content);
    }
    return content;
  }
}

// Create singleton instance
const markdownScreenplayParser = new MarkdownScreenplayParser();

// Register with global registry
registerParser(markdownScreenplayParser);

export { markdownScreenplayParser, MarkdownScreenplayParser };
