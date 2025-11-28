/**
 * Plain Text Parser Module
 *
 * Implements the ScreenplayParser interface for plain text (.txt) files.
 * Attempts to detect screenplay formatting in plain text.
 */

import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
} from '../types';
import { registerParser } from '../registry';
import { Scene, SceneElement } from '@/types/screenplay';

class TxtParser implements ScreenplayParser {
  readonly format = 'txt' as const;
  readonly name = 'Plain Text';
  readonly extensions = ['txt'];
  readonly mimeTypes = ['text/plain'];

  /**
   * Plain text can always be parsed
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canParse(content: string | ArrayBuffer): boolean {
    return true;
  }

  /**
   * Get confidence score - low for plain text (fallback parser)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getConfidence(content: string | ArrayBuffer): number {
    // Plain text is the fallback, so very low confidence
    return 0.1;
  }

  /**
   * Parse plain text content
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
        message: 'Reading text file...',
      });

      const text = content instanceof ArrayBuffer
        ? new TextDecoder('utf-8').decode(content)
        : content;

      if (!text.trim()) {
        return {
          success: false,
          format: 'txt',
          error: 'File is empty',
          errorCode: 'EMPTY_FILE',
          warnings: [],
        };
      }

      onProgress?.({
        stage: 'parsing',
        percent: 50,
        message: 'Processing text...',
      });

      // Try to detect screenplay structure
      const result = this.parseScreenplayText(text);

      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'Import complete',
      });

      return result;
    } catch (error) {
      return {
        success: false,
        format: 'txt',
        error: error instanceof Error ? error.message : 'Error parsing text file',
        errorCode: 'PARSE_ERROR',
        warnings: [],
      };
    }
  }

  /**
   * Attempt to parse plain text as screenplay
   */
  private parseScreenplayText(text: string): ParseOutcome {
    const lines = text.split('\n');
    const titlePage: TitlePage = {};
    const elements: SceneElement[] = [];
    const scenes: Scene[] = [];
    const contentLines: string[] = [];

    let currentScene: Scene | null = null;
    let sceneNumber = 0;
    let elementId = 0;
    let previousLineWasBlank = true;
    let previousElement: SceneElement | null = null;

    // Scene heading pattern
    const sceneHeadingPattern = /^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]/i;
    // Character pattern - more lenient for plain text
    const characterPattern = /^[A-Z][A-Z\s\d'.()-]+$/;
    // Transition pattern
    const transitionPattern = /^[A-Z\s]+TO:$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const isBlankLine = trimmedLine === '';

      // Scene heading
      if (previousLineWasBlank && sceneHeadingPattern.test(trimmedLine)) {
        if (currentScene) {
          scenes.push(currentScene);
        }

        sceneNumber++;
        currentScene = {
          id: `scene-${sceneNumber}`,
          number: sceneNumber,
          heading: trimmedLine.toUpperCase(),
          location: {
            id: `loc-${sceneNumber}`,
            name: this.extractLocation(trimmedLine),
            type: this.extractLocationType(trimmedLine),
            color: '#888888',
          },
          timeOfDay: this.extractTimeOfDay(trimmedLine),
          characters: [],
          elements: [],
          synopsis: '',
        };

        const element: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'scene-heading',
          content: trimmedLine.toUpperCase(),
        };
        elements.push(element);
        currentScene.elements.push(element);
        contentLines.push(`\n${trimmedLine.toUpperCase()}\n`);
        previousLineWasBlank = false;
        previousElement = element;
        continue;
      }

      // Transition
      if (previousLineWasBlank && transitionPattern.test(trimmedLine)) {
        const element: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'transition',
          content: trimmedLine.toUpperCase(),
        };
        elements.push(element);
        if (currentScene) currentScene.elements.push(element);
        contentLines.push(`\n                                                          ${trimmedLine.toUpperCase()}\n`);
        previousLineWasBlank = false;
        previousElement = element;
        continue;
      }

      // Character (after blank line, all caps, reasonable length)
      if (previousLineWasBlank &&
        characterPattern.test(trimmedLine) &&
        trimmedLine.length > 1 &&
        trimmedLine.length < 50) {
        const element: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'character',
          content: trimmedLine,
        };
        elements.push(element);
        if (currentScene) {
          currentScene.elements.push(element);
          const baseName = trimmedLine.replace(/\s*\([^)]+\)\s*$/, '').trim();
          if (!currentScene.characters.includes(baseName)) {
            currentScene.characters.push(baseName);
          }
        }
        contentLines.push(`\n                              ${trimmedLine}\n`);
        previousLineWasBlank = false;
        previousElement = element;
        continue;
      }

      // Parenthetical
      if (/^\s*\([^)]+\)\s*$/.test(line) &&
        (previousElement?.type === 'character' || previousElement?.type === 'dialogue')) {
        const element: SceneElement = {
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
        const element: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'dialogue',
          content: trimmedLine,
        };
        elements.push(element);
        if (currentScene) currentScene.elements.push(element);
        contentLines.push(`                    ${trimmedLine}\n`);
        previousLineWasBlank = false;
        previousElement = element;
        continue;
      }

      // Action (non-blank line)
      if (!isBlankLine) {
        const element: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'action',
          content: trimmedLine,
        };
        elements.push(element);
        if (currentScene) currentScene.elements.push(element);
        contentLines.push(`${trimmedLine}\n`);
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

    return {
      success: true,
      format: 'txt',
      titlePage,
      content: contentLines.join(''),
      scenes,
      elements,
      rawContent: text,
      warnings: scenes.length === 0
        ? [{ message: 'No scene headings detected - file may not be a screenplay', severity: 'warning' as const }]
        : [],
    };
  }

  private extractLocation(heading: string): string {
    const withoutPrefix = heading.replace(/^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]+/i, '');
    const withoutTime = withoutPrefix.replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER).*$/i, '');
    return withoutTime.trim();
  }

  private extractLocationType(heading: string): 'INT' | 'EXT' | 'INT/EXT' {
    if (/^INT\.?\/EXT|^I\.?\/E/i.test(heading)) return 'INT/EXT';
    if (/^INT/i.test(heading)) return 'INT';
    if (/^EXT|^EST/i.test(heading)) return 'EXT';
    return 'INT';
  }

  private extractTimeOfDay(heading: string): 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' {
    const match = heading.match(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER.*)$/i);
    if (!match) return 'DAY';

    const timeStr = match[1].toUpperCase();
    if (timeStr === 'NIGHT') return 'NIGHT';
    if (timeStr === 'DAWN' || timeStr === 'MORNING') return 'DAWN';
    if (timeStr === 'DUSK' || timeStr === 'EVENING' || timeStr === 'AFTERNOON') return 'DUSK';
    if (timeStr === 'CONTINUOUS' || timeStr === 'LATER' || timeStr === 'SAME' || timeStr.includes('LATER')) return 'CONTINUOUS';
    return 'DAY';
  }
}

// Create singleton instance
const txtParser = new TxtParser();

// Register with global registry
registerParser(txtParser);

export { txtParser, TxtParser };
