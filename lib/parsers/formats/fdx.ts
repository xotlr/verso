/**
 * FDX Parser Module
 *
 * Implements the ScreenplayParser interface for Final Draft XML (.fdx) files.
 */

import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
} from '../types';
import { parseFDX, isFDXFormat } from '@/lib/fdx-parser';
import { registerParser } from '../registry';

class FDXParser implements ScreenplayParser {
  readonly format = 'fdx' as const;
  readonly name = 'Final Draft';
  readonly extensions = ['fdx'];
  readonly mimeTypes = ['application/xml', 'text/xml'];

  /**
   * Check if content can be parsed as FDX
   */
  canParse(content: string | ArrayBuffer): boolean {
    const text = this.getTextContent(content);
    return isFDXFormat(text);
  }

  /**
   * Get confidence score for FDX format (0-1)
   */
  getConfidence(content: string | ArrayBuffer): number {
    const text = this.getTextContent(content);

    // Must be XML
    if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<')) {
      return 0;
    }

    let score = 0;

    // Strong indicators
    if (text.includes('<FinalDraft')) score += 0.5;
    if (text.includes('</FinalDraft>')) score += 0.2;
    if (text.includes('DocumentType="Script"')) score += 0.15;

    // Element indicators
    if (text.includes('<Content>')) score += 0.05;
    if (text.includes('<Paragraph')) score += 0.05;
    if (text.includes('Type="Scene Heading"')) score += 0.05;

    return Math.min(1, score);
  }

  /**
   * Parse FDX content
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
        message: 'Reading FDX file...',
      });

      const text = this.getTextContent(content);

      if (!text.trim()) {
        return {
          success: false,
          format: 'fdx',
          error: 'File is empty',
          errorCode: 'EMPTY_FILE',
          warnings: [],
        };
      }

      // Stage: Detecting
      onProgress?.({
        stage: 'detecting',
        percent: 20,
        message: 'Validating FDX format...',
      });

      if (!this.canParse(text)) {
        return {
          success: false,
          format: 'fdx',
          error: 'File does not appear to be a valid Final Draft document',
          errorCode: 'INVALID_FORMAT',
          warnings: [],
        };
      }

      // Stage: Parsing
      onProgress?.({
        stage: 'parsing',
        percent: 40,
        message: 'Parsing screenplay content...',
      });

      const result = parseFDX(text);

      // Check for parse errors
      if (result.content.startsWith('Error parsing FDX file:')) {
        return {
          success: false,
          format: 'fdx',
          error: result.content,
          errorCode: 'PARSE_ERROR',
          warnings: [],
        };
      }

      // Stage: Complete
      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'Import complete',
      });

      // Convert FDXTitlePage to TitlePage
      const titlePage: TitlePage = {
        title: result.titlePage.title,
        author: result.titlePage.author,
        contact: result.titlePage.contact,
        copyright: result.titlePage.copyright,
        draftDate: result.titlePage.draftDate,
      };

      return {
        success: true,
        format: 'fdx',
        titlePage,
        content: result.content,
        scenes: result.scenes,
        elements: result.elements,
        rawContent: result.rawXml,
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        format: 'fdx',
        error: error instanceof Error ? error.message : 'Unknown error parsing FDX',
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
const fdxParser = new FDXParser();

// Register with global registry
registerParser(fdxParser);

export { fdxParser, FDXParser };
