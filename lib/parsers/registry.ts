/**
 * Parser Registry
 *
 * Manages registration and retrieval of screenplay parsers.
 */

import { ScreenplayParser, ParserFormat } from './types';

class ParserRegistry {
  private parsers: Map<ParserFormat, ScreenplayParser> = new Map();

  /**
   * Register a parser
   */
  register(parser: ScreenplayParser): void {
    this.parsers.set(parser.format, parser);
  }

  /**
   * Get a parser by format
   */
  getParser(format: ParserFormat): ScreenplayParser | undefined {
    return this.parsers.get(format);
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): ScreenplayParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Get a parser by file extension
   */
  getParserByExtension(extension: string): ScreenplayParser | undefined {
    const ext = extension.toLowerCase().replace(/^\./, '');
    return this.getAllParsers().find(p => p.extensions.includes(ext));
  }

  /**
   * Get all supported file extensions
   */
  getSupportedExtensions(): string[] {
    return this.getAllParsers().flatMap(p => p.extensions);
  }

  /**
   * Get file input accept string
   */
  getAcceptString(): string {
    return this.getSupportedExtensions().map(ext => `.${ext}`).join(',');
  }

  /**
   * Check if a format is registered
   */
  hasParser(format: ParserFormat): boolean {
    return this.parsers.has(format);
  }
}

// Singleton instance
let registryInstance: ParserRegistry | null = null;

/**
 * Get the parser registry singleton
 */
export function getParserRegistry(): ParserRegistry {
  if (!registryInstance) {
    registryInstance = new ParserRegistry();
  }
  return registryInstance;
}

/**
 * Register a parser with the global registry
 */
export function registerParser(parser: ScreenplayParser): void {
  getParserRegistry().register(parser);
}

/**
 * Get a parser by format from the global registry
 */
export function getParser(format: ParserFormat): ScreenplayParser | undefined {
  return getParserRegistry().getParser(format);
}

export { ParserRegistry };
