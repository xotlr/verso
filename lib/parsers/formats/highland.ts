/**
 * Highland Parser Module
 *
 * Implements the ScreenplayParser interface for Highland (.highland) files.
 * Highland files are ZIP archives containing a document.fountain file.
 */

import JSZip from 'jszip';
import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
} from '../types';
import { parseFountain } from '@/lib/fountain-parser';
import { registerParser } from '../registry';
import { isZipFile } from '../detector';

class HighlandParser implements ScreenplayParser {
  readonly format = 'highland' as const;
  readonly name = 'Highland';
  readonly extensions = ['highland'];
  readonly mimeTypes = ['application/zip', 'application/x-highland'];

  /**
   * Check if content can be parsed as Highland
   */
  canParse(content: string | ArrayBuffer): boolean {
    // Must be a ZIP file
    return isZipFile(content);
  }

  /**
   * Get confidence score for Highland format (0-1)
   */
  getConfidence(content: string | ArrayBuffer): number {
    // ZIP file check
    if (!isZipFile(content)) {
      return 0;
    }

    // We can't easily peek inside the ZIP synchronously,
    // so return moderate confidence for ZIP files
    // The actual parse will confirm if it's Highland
    return 0.4;
  }

  /**
   * Parse Highland content
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
        message: 'Reading Highland archive...',
      });

      const arrayBuffer = content instanceof ArrayBuffer
        ? content
        : new TextEncoder().encode(content).buffer;

      // Stage: Extracting
      onProgress?.({
        stage: 'extracting',
        percent: 30,
        message: 'Extracting Highland package...',
      });

      const zip = await JSZip.loadAsync(arrayBuffer);

      // Look for the Fountain document inside
      // Highland uses document.fountain or Story.fountain
      let fountainContent: string | null = null;
      let fountainFilename: string | null = null;

      // Try common Highland file names
      const possibleNames = [
        'document.fountain',
        'Story.fountain',
        'screenplay.fountain',
        'script.fountain',
      ];

      for (const name of possibleNames) {
        const file = zip.file(name);
        if (file) {
          fountainContent = await file.async('string');
          fountainFilename = name;
          break;
        }
      }

      // If not found, look for any .fountain file
      if (!fountainContent) {
        const files = zip.file(/\.fountain$/i);
        if (files.length > 0) {
          fountainContent = await files[0].async('string');
          fountainFilename = files[0].name;
        }
      }

      // Also check for .txt files that might be Fountain
      if (!fountainContent) {
        const txtFiles = zip.file(/\.txt$/i);
        for (const file of txtFiles) {
          const text = await file.async('string');
          // Check if it looks like Fountain
          if (/^(Title|Author|INT|EXT)[\s.:]/im.test(text)) {
            fountainContent = text;
            fountainFilename = file.name;
            break;
          }
        }
      }

      if (!fountainContent) {
        return {
          success: false,
          format: 'highland',
          error: 'Could not find Fountain document in Highland package',
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

      const result = parseFountain(fountainContent);

      // Stage: Complete
      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'Import complete',
      });

      // Convert title page
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
        format: 'highland',
        titlePage,
        content: result.content,
        scenes: result.scenes,
        elements: result.elements,
        rawContent: fountainContent,
        warnings: fountainFilename !== 'document.fountain'
          ? [{ message: `Extracted from ${fountainFilename}`, severity: 'info' }]
          : [],
      };
    } catch (error) {
      // Check if it's not a valid ZIP
      if (error instanceof Error && error.message.includes('not a valid zip')) {
        return {
          success: false,
          format: 'highland',
          error: 'File is not a valid Highland package',
          errorCode: 'INVALID_FORMAT',
          warnings: [],
        };
      }

      return {
        success: false,
        format: 'highland',
        error: error instanceof Error ? error.message : 'Unknown error parsing Highland file',
        errorCode: 'PARSE_ERROR',
        warnings: [],
      };
    }
  }
}

// Create singleton instance
const highlandParser = new HighlandParser();

// Register with global registry
registerParser(highlandParser);

export { highlandParser, HighlandParser };
