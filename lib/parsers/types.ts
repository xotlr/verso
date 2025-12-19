/**
 * Parser Types
 *
 * Core interfaces for the modular parser architecture.
 */

import { Scene, SceneElement } from '@/types/screenplay';

// Supported parser formats
export type ParserFormat = 'fdx' | 'fountain' | 'highland' | 'fadein' | 'txt' | 'pdf' | 'docx' | 'markdown-screenplay';

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

// ============================================================================
// ENHANCED IMPORT TYPES (for preview workflow)
// ============================================================================

// Detailed import statistics
export interface ImportStats {
  scenes: number;
  characters: string[];
  pages: number;
  dialogueBlocks: number;
  actionBlocks: number;
  transitions: number;
  dualDialogues: number;
  revisionMarks: number;
}

// Enhanced warning with location tracking
export interface ImportWarning {
  type: 'element' | 'formatting' | 'character' | 'structure';
  message: string;
  location: {
    page?: number;
    scene?: number;
    line?: number;
  };
  suggestion?: string;
}

// Import error codes
export type ImportErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'CORRUPTED_FILE'
  | 'UNSUPPORTED_FDX_VERSION'
  | 'PARSE_FAILED'
  | 'EMPTY_DOCUMENT'
  | 'TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'EXTRACTION_ERROR';

// Import error with code
export interface ImportError {
  code: ImportErrorCode;
  message: string;
  details?: string;
  recoverable: boolean;
}

// Text run with styling (for FDX parsing)
export interface StyledTextRun {
  text: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
  revisionId?: string;
}

// Character with extension parsed
export interface ParsedCharacter {
  name: string;
  extension?: string | null; // (V.O.), (O.S.), (CONT'D), etc.
  dialogueCount?: number;
}

// Dual dialogue group
export interface DualDialogueGroup {
  left: {
    character: string;
    extension?: string;
    dialogue: string[];
    parentheticals?: string[];
  };
  right: {
    character: string;
    extension?: string;
    dialogue: string[];
    parentheticals?: string[];
  };
}

// Enhanced parse result with full stats and warnings
export interface EnhancedParseResult {
  success: true;
  format: ParserFormat;
  titlePage: TitlePage;
  content: string;
  scenes: Scene[];
  elements: SceneElement[];
  rawContent: string;
  stats: ImportStats;
  warnings: ImportWarning[];
  characters: ParsedCharacter[];
  dualDialogues: DualDialogueGroup[];
}

// Enhanced parse error
export interface EnhancedParseError {
  success: false;
  format: ParserFormat | 'unknown';
  error: ImportError;
  partialContent?: string;
  warnings: ImportWarning[];
}

// Combined enhanced result
export type EnhancedParseOutcome = EnhancedParseResult | EnhancedParseError;

// Progress stages for detailed tracking
export type ImportStage =
  | 'reading'
  | 'validating'
  | 'extracting'
  | 'parsing'
  | 'mapping'
  | 'complete';

// Enhanced progress with element counts
export interface ImportProgress {
  stage: ImportStage;
  percent: number;
  message: string;
  currentItem?: number;
  totalItems?: number;
  itemType?: 'scenes' | 'elements' | 'characters' | 'pages';
}
