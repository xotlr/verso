/**
 * Fountain Parser Module
 *
 * Implements the ScreenplayParser interface for Fountain markup (.fountain) files.
 */

import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
} from '../types';
import { parseFountain, isFountainFormat } from '@/lib/fountain-parser';
import { registerParser } from '../registry';

class FountainParser implements ScreenplayParser {
  readonly format = 'fountain' as const;
  readonly name = 'Fountain';
  readonly extensions = ['fountain', 'txt', 'spmd'];
  readonly mimeTypes = ['text/plain', 'text/x-fountain'];

  /**
   * Check if content can be parsed as Fountain
   */
  canParse(content: string | ArrayBuffer): boolean {
    const text = this.getTextContent(content);
    return isFountainFormat(text);
  }

  /**
   * Get confidence score for Fountain format (0-1)
   */
  getConfidence(content: string | ArrayBuffer): number {
    const text = this.getTextContent(content);
    const lines = text.split('\n').slice(0, 100); // Check first 100 lines

    let score = 0;
    let sceneHeadingCount = 0;
    let characterCount = 0;
    let hasDialogue = false;

    // Check for title page markers (strong indicator)
    const titlePagePattern = /^(Title|Author|Credit|Draft date|Contact|Copyright):\s/im;
    if (titlePagePattern.test(text)) {
      score += 0.3;
    }

    // Scene heading pattern
    const sceneHeadingPattern = /^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]/i;

    // Character pattern (ALL CAPS followed by dialogue)
    const characterPattern = /^[A-Z][A-Z\s\d'.\-]+(\s*\([A-Z.'\s]+\))?$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (sceneHeadingPattern.test(line)) {
        sceneHeadingCount++;
      }

      if (characterPattern.test(line) && line.length > 1 && line.length < 50) {
        // Check if next non-empty line could be dialogue
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !sceneHeadingPattern.test(nextLine)) {
          characterCount++;
          hasDialogue = true;
        }
      }
    }

    // Score based on screenplay structure
    if (sceneHeadingCount >= 1) score += 0.2;
    if (sceneHeadingCount >= 3) score += 0.1;
    if (characterCount >= 1) score += 0.1;
    if (characterCount >= 3) score += 0.1;
    if (hasDialogue) score += 0.1;

    // Penalize if it looks like other formats
    if (text.includes('<FinalDraft') || text.includes('<?xml')) {
      score = 0;
    }

    return Math.min(1, score);
  }

  /**
   * Parse Fountain content with progress reporting
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
        message: 'Reading Fountain file...',
      });

      const text = this.getTextContent(content);

      if (!text.trim()) {
        return {
          success: false,
          format: 'fountain',
          error: 'File is empty',
          errorCode: 'EMPTY_FILE',
          warnings: [],
        };
      }

      // Stage: Detecting
      onProgress?.({
        stage: 'detecting',
        percent: 20,
        message: 'Validating Fountain format...',
      });

      // Stage: Parsing
      onProgress?.({
        stage: 'parsing',
        percent: 40,
        message: 'Parsing screenplay content...',
      });

      // Parse the content
      const result = parseFountain(text);

      // Stage: Complete
      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'Import complete',
      });

      // Convert FountainTitlePage to TitlePage
      const titlePage: TitlePage = {
        title: result.titlePage.title,
        author: result.titlePage.author || result.titlePage.authors,
        credit: result.titlePage.credit,
        source: result.titlePage.source,
        draftDate: result.titlePage.draftDate,
        contact: result.titlePage.contact,
        copyright: result.titlePage.copyright,
        notes: result.titlePage.notes,
      };

      return {
        success: true,
        format: 'fountain',
        titlePage,
        content: result.content,
        scenes: result.scenes,
        elements: result.elements,
        rawContent: result.rawText,
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        format: 'fountain',
        error: error instanceof Error ? error.message : 'Unknown error parsing Fountain',
        errorCode: 'PARSE_ERROR',
        warnings: [],
      };
    }
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
const fountainParser = new FountainParser();

// Register with global registry
registerParser(fountainParser);

export { fountainParser, FountainParser };
