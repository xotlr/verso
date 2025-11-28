/**
 * ImportDropZone Types
 */

import { ParseProgress, ParserFormat, ParseWarning } from '@/lib/parsers/types';
import { Scene, SceneElement } from '@/types/screenplay';

export type ImportContext = 'dashboard' | 'editor';
export type ImportMode = 'replace' | 'append';

export interface ImportResult {
  success: boolean;
  content?: string;
  title?: string;
  format?: ParserFormat;
  scenes?: Scene[];
  elements?: SceneElement[];
  wordCount?: number;
  error?: string;
  warnings?: ParseWarning[];
}

export interface ImportDropZoneProps {
  /** Where the drop zone is being used */
  context: ImportContext;
  /** Called when import completes successfully */
  onImportComplete: (result: ImportResult) => void;
  /** Called when import fails */
  onImportError?: (error: string) => void;
  /** For editor context - the screenplay being edited */
  screenplayId?: string;
  /** How to handle imported content in editor */
  mode?: ImportMode;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export type ImportState = 'idle' | 'dragging' | 'processing' | 'success' | 'error';

export interface ImportProgress extends ParseProgress {
  filename?: string;
}

export interface UseFileImportOptions {
  onProgress?: (progress: ImportProgress) => void;
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: string) => void;
}

export interface UseFileImportReturn {
  /** Current import state */
  state: ImportState;
  /** Progress information */
  progress: ImportProgress | null;
  /** Error message if state is 'error' */
  error: string | null;
  /** Import result if state is 'success' */
  result: ImportResult | null;
  /** Start import from a File */
  importFile: (file: File) => Promise<void>;
  /** Start import from an ArrayBuffer */
  importBuffer: (buffer: ArrayBuffer, filename: string) => Promise<void>;
  /** Reset state to idle */
  reset: () => void;
  /** Whether import is in progress */
  isProcessing: boolean;
}
