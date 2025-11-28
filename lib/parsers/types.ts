/**
 * Parser Types
 *
 * Core interfaces for the modular parser architecture.
 */

import { Scene, SceneElement } from '@/types/screenplay';

// Supported parser formats
export type ParserFormat = 'fdx' | 'fountain' | 'highland' | 'fadein' | 'txt';

// Title page metadata
export interface TitlePage {
  title?: string;
  author?: string;
  authors?: string;
  credit?: string;
  source?: string;
  draftDate?: string;
  contact?: string;
  copyright?: string;
  notes?: string;
  [key: string]: string | undefined;
}

// Progress reporting
export interface ParseProgress {
  stage: 'reading' | 'detecting' | 'extracting' | 'parsing' | 'complete';
  percent: number; // 0-100
  message: string;
  linesProcessed?: number;
  totalLines?: number;
}

// Parse options
export interface ParseOptions {
  onProgress?: (progress: ParseProgress) => void;
  filename?: string;
}

// Parse warnings
export interface ParseWarning {
  line?: number;
  message: string;
  severity: 'info' | 'warning';
}

// Successful parse result
export interface ParseResult {
  success: true;
  format: ParserFormat;
  titlePage: TitlePage;
  content: string;
  scenes: Scene[];
  elements: SceneElement[];
  rawContent: string;
  warnings: ParseWarning[];
}

// Failed parse result
export interface ParseError {
  success: false;
  format: ParserFormat | 'unknown';
  error: string;
  errorCode: 'INVALID_FORMAT' | 'PARSE_ERROR' | 'EXTRACTION_ERROR' | 'EMPTY_FILE';
  partialContent?: string;
  warnings: ParseWarning[];
}

// Combined result type
export type ParseOutcome = ParseResult | ParseError;

// Parser interface
export interface ScreenplayParser {
  readonly format: ParserFormat;
  readonly name: string;
  readonly extensions: string[];
  readonly mimeTypes: string[];

  // Content detection
  canParse(content: string | ArrayBuffer): boolean;
  getConfidence(content: string | ArrayBuffer): number; // 0-1

  // Parsing
  parse(content: string | ArrayBuffer, options?: ParseOptions): Promise<ParseOutcome>;
}

// Detection result
export interface DetectionResult {
  format: ParserFormat | null;
  confidence: number;
  allScores: Map<ParserFormat, number>;
}

// Import result for UI
export interface ImportResult {
  success: boolean;
  content?: string;
  title?: string;
  format?: ParserFormat;
  scenes?: number;
  wordCount?: number;
  error?: string;
}
