/**
 * Format Detector
 *
 * Automatically detects the format of screenplay files.
 */

import { ParserFormat, DetectionResult } from './types';
import { getParserRegistry } from './registry';

// ZIP file magic number (PK)
const ZIP_SIGNATURE = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);

/**
 * Check if content is a ZIP file
 */
export function isZipFile(content: string | ArrayBuffer): boolean {
  if (content instanceof ArrayBuffer) {
    const arr = new Uint8Array(content.slice(0, 4));
    return arr.every((byte, i) => byte === ZIP_SIGNATURE[i]);
  }
  // Check string for ZIP signature (PK..)
  return content.charCodeAt(0) === 0x50 && content.charCodeAt(1) === 0x4B;
}

/**
 * Detect the format of screenplay content
 */
export async function detectFormat(
  content: string | ArrayBuffer,
  filename?: string
): Promise<DetectionResult> {
  const registry = getParserRegistry();
  const scores = new Map<ParserFormat, number>();

  // Phase 1: Extension hint (if available)
  let extensionHint: ParserFormat | null = null;
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const parser = registry.getParserByExtension(ext || '');
    if (parser) {
      extensionHint = parser.format;
    }
  }

  // Phase 2: Content-based detection
  for (const parser of registry.getAllParsers()) {
    try {
      const confidence = parser.getConfidence(content);
      scores.set(parser.format, confidence);
    } catch {
      // Parser couldn't analyze content
      scores.set(parser.format, 0);
    }
  }

  // Phase 3: Weighted scoring
  // Extension match adds 0.2 bonus but doesn't override content detection
  if (extensionHint && scores.has(extensionHint)) {
    const current = scores.get(extensionHint) || 0;
    scores.set(extensionHint, Math.min(1, current + 0.2));
  }

  // Find best match
  let bestFormat: ParserFormat | null = null;
  let bestScore = 0;

  for (const [format, score] of scores) {
    if (score > bestScore && score >= 0.3) { // Minimum 30% confidence
      bestScore = score;
      bestFormat = format;
    }
  }

  return {
    format: bestFormat,
    confidence: bestScore,
    allScores: scores
  };
}

/**
 * Quick format check without full detection
 */
export function quickDetectFormat(
  content: string | ArrayBuffer,
  filename?: string
): ParserFormat | null {
  // Check extension first
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'fdx') return 'fdx';
    if (ext === 'fountain') return 'fountain';
    if (ext === 'highland') return 'highland';
    if (ext === 'fadein') return 'fadein';
    if (ext === 'txt') return 'txt';
  }

  // Check for ZIP (highland or fadein)
  if (isZipFile(content)) {
    // Default to highland for ZIP, will be refined by actual parser
    return 'highland';
  }

  // Check content signature
  const text = content instanceof ArrayBuffer
    ? new TextDecoder().decode(content.slice(0, 1000))
    : content.slice(0, 1000);

  // FDX XML check
  if (text.includes('<FinalDraft') || text.includes('<finaldraft')) {
    return 'fdx';
  }

  // Fountain checks
  if (/^(Title|Author|Credit|Draft date):\s/im.test(text)) {
    return 'fountain';
  }
  if (/^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]/im.test(text)) {
    return 'fountain';
  }

  // Default to txt
  return 'txt';
}
