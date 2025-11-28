/**
 * Fade In Parser Module
 *
 * Implements the ScreenplayParser interface for Fade In (.fadein) files.
 * Fade In files are ZIP archives containing document.xml in Open Screenplay Format.
 */

import JSZip from 'jszip';
import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
  ParseWarning,
} from '../types';
import { registerParser } from '../registry';
import { isZipFile } from '../detector';
import { Scene, SceneElement } from '@/types/screenplay';

// Fade In / Open Screenplay Format element types
const OSF_TYPES: Record<string, SceneElement['type']> = {
  'scene-heading': 'scene-heading',
  'scene heading': 'scene-heading',
  'action': 'action',
  'character': 'character',
  'dialogue': 'dialogue',
  'parenthetical': 'parenthetical',
  'transition': 'transition',
  'general': 'action',
  'shot': 'action',
};

class FadeInParser implements ScreenplayParser {
  readonly format = 'fadein' as const;
  readonly name = 'Fade In';
  readonly extensions = ['fadein'];
  readonly mimeTypes = ['application/zip', 'application/x-fadein'];

  /**
   * Check if content can be parsed as Fade In
   */
  canParse(content: string | ArrayBuffer): boolean {
    return isZipFile(content);
  }

  /**
   * Get confidence score for Fade In format (0-1)
   */
  getConfidence(content: string | ArrayBuffer): number {
    if (!isZipFile(content)) {
      return 0;
    }
    // Return moderate confidence for ZIP files
    // Lower than Highland since Fade In is less common
    return 0.35;
  }

  /**
   * Parse Fade In content
   */
  async parse(
    content: string | ArrayBuffer,
    options?: ParseOptions
  ): Promise<ParseOutcome> {
    const { onProgress } = options || {};

    try {
      // Stage: Reading
      onProgress?.({
        stage: 'reading',
        percent: 10,
        message: 'Reading Fade In archive...',
      });

      const arrayBuffer = content instanceof ArrayBuffer
        ? content
        : new TextEncoder().encode(content).buffer;

      // Stage: Extracting
      onProgress?.({
        stage: 'extracting',
        percent: 30,
        message: 'Extracting Fade In package...',
      });

      const zip = await JSZip.loadAsync(arrayBuffer);

      // Look for document.xml (Open Screenplay Format)
      let xmlContent: string | null = null;
      let xmlFilename: string | null = null;

      // Try common Fade In file names
      const possibleNames = [
        'document.xml',
        'screenplay.xml',
        'script.xml',
      ];

      for (const name of possibleNames) {
        const file = zip.file(name);
        if (file) {
          xmlContent = await file.async('string');
          xmlFilename = name;
          break;
        }
      }

      // If not found, look for any .xml file
      if (!xmlContent) {
        const xmlFiles = zip.file(/\.xml$/i);
        for (const file of xmlFiles) {
          const text = await file.async('string');
          // Check if it looks like Open Screenplay Format
          if (text.includes('<screenplay') || text.includes('<document')) {
            xmlContent = text;
            xmlFilename = file.name;
            break;
          }
        }
      }

      if (!xmlContent) {
        return {
          success: false,
          format: 'fadein',
          error: 'Could not find screenplay document in Fade In package',
          errorCode: 'EXTRACTION_ERROR',
          warnings: [],
        };
      }

      // Stage: Parsing
      onProgress?.({
        stage: 'parsing',
        percent: 60,
        message: 'Parsing screenplay content...',
      });

      const result = this.parseOSF(xmlContent);

      if (!result.success) {
        return result;
      }

      // Stage: Complete
      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'Import complete',
      });

      return {
        ...result,
        warnings: xmlFilename !== 'document.xml'
          ? [...result.warnings, { message: `Extracted from ${xmlFilename}`, severity: 'info' as const }]
          : result.warnings,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a valid zip')) {
        return {
          success: false,
          format: 'fadein',
          error: 'File is not a valid Fade In package',
          errorCode: 'INVALID_FORMAT',
          warnings: [],
        };
      }

      return {
        success: false,
        format: 'fadein',
        error: error instanceof Error ? error.message : 'Unknown error parsing Fade In file',
        errorCode: 'PARSE_ERROR',
        warnings: [],
      };
    }
  }

  /**
   * Parse Open Screenplay Format XML
   */
  private parseOSF(xmlContent: string): ParseOutcome {
    const titlePage: TitlePage = {};
    const elements: SceneElement[] = [];
    const scenes: Scene[] = [];
    const contentLines: string[] = [];
    const warnings: ParseWarning[] = [];

    let currentScene: Scene | null = null;
    let sceneNumber = 0;
    let elementId = 0;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');

      // Check for parse errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return {
          success: false,
          format: 'fadein',
          error: `XML parse error: ${parseError.textContent}`,
          errorCode: 'PARSE_ERROR',
          warnings: [],
        };
      }

      // Parse title page
      const titleEl = doc.querySelector('titlepage, title-page, TitlePage');
      if (titleEl) {
        titlePage.title = this.getElementText(titleEl, 'title');
        titlePage.author = this.getElementText(titleEl, 'author, authors, written-by');
        titlePage.contact = this.getElementText(titleEl, 'contact');
        titlePage.copyright = this.getElementText(titleEl, 'copyright');
        titlePage.draftDate = this.getElementText(titleEl, 'draft-date, date');
      }

      // Parse paragraphs/elements
      const paragraphs = doc.querySelectorAll('para, paragraph, p, element');

      paragraphs.forEach((p) => {
        const typeAttr = p.getAttribute('type') ||
          p.getAttribute('style') ||
          p.getAttribute('format') ||
          'action';
        const type = typeAttr.toLowerCase();
        const elementType = OSF_TYPES[type] || 'action';
        const text = p.textContent?.trim() || '';

        if (!text) return;

        const element: SceneElement = {
          id: `elem-${++elementId}`,
          type: elementType,
          content: text,
        };

        // Handle scene headings
        if (elementType === 'scene-heading') {
          if (currentScene) {
            scenes.push(currentScene);
          }

          sceneNumber++;
          currentScene = {
            id: `scene-${sceneNumber}`,
            number: sceneNumber,
            heading: text,
            location: {
              id: `loc-${sceneNumber}`,
              name: this.extractLocation(text),
              type: this.extractLocationType(text),
              color: '#888888',
            },
            timeOfDay: this.extractTimeOfDay(text),
            characters: [],
            elements: [],
            synopsis: '',
          };

          contentLines.push(`\n${text}\n`);
        }
        // Handle character names
        else if (elementType === 'character') {
          if (currentScene) {
            const baseName = text.replace(/\s*\([^)]+\)\s*$/, '').trim();
            if (!currentScene.characters.includes(baseName)) {
              currentScene.characters.push(baseName);
            }
          }
          contentLines.push(`\n                              ${text}\n`);
        }
        // Handle dialogue
        else if (elementType === 'dialogue') {
          contentLines.push(`                    ${text}\n`);
        }
        // Handle parenthetical
        else if (elementType === 'parenthetical') {
          contentLines.push(`                         ${text}\n`);
        }
        // Handle transitions
        else if (elementType === 'transition') {
          contentLines.push(`\n                                                          ${text}\n`);
        }
        // Handle action
        else {
          contentLines.push(`\n${text}\n`);
        }

        elements.push(element);
        if (currentScene) {
          currentScene.elements.push(element);
        }
      });

      // Save final scene
      if (currentScene) {
        scenes.push(currentScene);
      }

      return {
        success: true,
        format: 'fadein',
        titlePage,
        content: contentLines.join(''),
        scenes,
        elements,
        rawContent: xmlContent,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        format: 'fadein',
        error: error instanceof Error ? error.message : 'Error parsing Open Screenplay Format',
        errorCode: 'PARSE_ERROR',
        warnings: [],
      };
    }
  }

  /**
   * Get text content of a child element
   */
  private getElementText(parent: Element, selectors: string): string | undefined {
    for (const selector of selectors.split(',').map(s => s.trim())) {
      const el = parent.querySelector(selector);
      if (el?.textContent) {
        return el.textContent.trim();
      }
    }
    return undefined;
  }

  /**
   * Extract location name from scene heading
   */
  private extractLocation(heading: string): string {
    const withoutPrefix = heading.replace(/^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]+/i, '');
    const withoutTime = withoutPrefix.replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER).*$/i, '');
    return withoutTime.trim();
  }

  /**
   * Extract location type
   */
  private extractLocationType(heading: string): 'INT' | 'EXT' | 'INT/EXT' {
    if (/^INT\.?\/EXT|^I\.?\/E/i.test(heading)) return 'INT/EXT';
    if (/^INT/i.test(heading)) return 'INT';
    if (/^EXT|^EST/i.test(heading)) return 'EXT';
    return 'INT';
  }

  /**
   * Extract time of day
   */
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
const fadeInParser = new FadeInParser();

// Register with global registry
registerParser(fadeInParser);

export { fadeInParser, FadeInParser };
