/**
 * Parser System
 *
 * Main entry point for the modular screenplay parser architecture.
 * Supports FDX, Fountain, Highland, Fade In, and plain text formats.
 */

// Export types
export * from './types';

// Export registry
export { getParserRegistry, registerParser, getParser, ParserRegistry } from './registry';

// Export detector
export { detectFormat, quickDetectFormat, isZipFile } from './detector';

// Import format parsers (this registers them with the registry)
import './formats/fdx';
import './formats/fountain';
import './formats/highland';
import './formats/fadein';
import './formats/txt';

// Re-export individual parsers
export { fdxParser, FDXParser } from './formats/fdx';
export { fountainParser, FountainParser } from './formats/fountain';
export { highlandParser, HighlandParser } from './formats/highland';
export { fadeInParser, FadeInParser } from './formats/fadein';
export { txtParser, TxtParser } from './formats/txt';

import { getParserRegistry } from './registry';
import { detectFormat } from './detector';
import { ParseOptions, ParseOutcome, ParserFormat } from './types';

/**
 * Parse screenplay content with automatic format detection
 */
export async function parseScreenplay(
  content: string | ArrayBuffer,
  options?: ParseOptions & { format?: ParserFormat }
): Promise<ParseOutcome> {
  const registry = getParserRegistry();
  const { format: requestedFormat, ...parseOptions } = options || {};

  // If format is specified, use that parser
  if (requestedFormat) {
    const parser = registry.getParser(requestedFormat);
    if (parser) {
      return parser.parse(content, parseOptions);
    }
    return {
      success: false,
      format: requestedFormat,
      error: `No parser found for format: ${requestedFormat}`,
      errorCode: 'INVALID_FORMAT',
      warnings: [],
    };
  }

  // Auto-detect format
  parseOptions.onProgress?.({
    stage: 'detecting',
    percent: 5,
    message: 'Detecting file format...',
  });

  const detection = await detectFormat(content, parseOptions.filename);

  if (!detection.format) {
    // Fall back to plain text
    const txtParser = registry.getParser('txt');
    if (txtParser) {
      return txtParser.parse(content, parseOptions);
    }
    return {
      success: false,
      format: 'unknown',
      error: 'Could not detect file format and no fallback parser available',
      errorCode: 'INVALID_FORMAT',
      warnings: [],
    };
  }

  const parser = registry.getParser(detection.format);
  if (!parser) {
    return {
      success: false,
      format: detection.format,
      error: `No parser found for detected format: ${detection.format}`,
      errorCode: 'INVALID_FORMAT',
      warnings: [],
    };
  }

  return parser.parse(content, parseOptions);
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return getParserRegistry().getSupportedExtensions();
}

/**
 * Get file input accept string (e.g., ".fdx,.fountain,.highland")
 */
export function getAcceptString(): string {
  return getParserRegistry().getAcceptString();
}

/**
 * Check if a file extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  const ext = extension.toLowerCase().replace(/^\./, '');
  return getSupportedExtensions().includes(ext);
}
