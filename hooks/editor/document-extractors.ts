/**
 * Pure utility functions for extracting information from ProseMirror documents.
 * These are stateless functions that operate on document nodes.
 */

import { Node as ProseMirrorNode } from 'prosemirror-model';
import { detectTimeOfDay, type TimeOfDay } from '@/lib/prosemirror/utils/time-detection';
import { detectShot, getShotDisplayName } from '@/lib/screenplay/patterns';
import type { SceneInfo, CharacterInfo, ShotInfo } from './types';
import type { DetectedShot } from '@/types/shotlist';

/**
 * Calculate word count from a ProseMirror document.
 */
export function calculateWordCount(doc: ProseMirrorNode): number {
  let text = '';
  doc.descendants((node) => {
    if (node.isText) {
      text += node.text + ' ';
    }
    return true;
  });
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate page count (55 lines per page standard).
 * This is a fallback calculation; WASM pagination provides more accurate results.
 */
export function calculatePageCount(doc: ProseMirrorNode): number {
  let lineCount = 0;
  doc.forEach((node) => {
    const text = node.textContent;
    // Rough estimate: average 55 chars per line
    const nodeLines = Math.max(1, Math.ceil(text.length / 55));
    lineCount += nodeLines + 1; // +1 for spacing between elements
  });
  return Math.max(1, Math.ceil(lineCount / 55));
}

/**
 * Known time of day patterns for extraction.
 * Order matters - more specific patterns first.
 */
const TIME_PATTERNS = [
  // Specific times
  /\b(EARLY MORNING|LATE MORNING|MID-?MORNING)\b/i,
  /\b(EARLY AFTERNOON|LATE AFTERNOON|MID-?AFTERNOON)\b/i,
  /\b(EARLY EVENING|LATE EVENING)\b/i,
  /\b(LATE NIGHT|DEAD OF NIGHT|MIDDLE OF THE NIGHT)\b/i,
  /\b(HOURS BEFORE DAWN|CRACK OF DAWN|PRE-?DAWN)\b/i,
  /\b(GOLDEN HOUR|MAGIC HOUR|BLUE HOUR)\b/i,
  // Standard times
  /\b(DAWN|SUNRISE|DAYBREAK|FIRST LIGHT|SUNUP)\b/i,
  /\b(MORNING)\b/i,
  /\b(NOON|MIDDAY)\b/i,
  /\b(AFTERNOON)\b/i,
  /\b(DUSK|SUNSET|TWILIGHT|SUNDOWN|NIGHTFALL)\b/i,
  /\b(EVENING)\b/i,
  /\b(NIGHT|MIDNIGHT)\b/i,
  /\b(DAY)\b/i,
  /\b(CONTINUOUS|CONT\.?'?D?)\b/i,
];

/**
 * Parse scene heading text to extract type, location, and time of day.
 * Used as fallback when node attributes are not set (e.g., from imports or tests).
 *
 * Handles complex headings like:
 * - "INT. ROOT CELLAR - SOOTBRUCK - OPENING IMAGE - NIGHT (FLASHBACK - 1 YEAR AGO)"
 * - "EXT. THORNFIELD KEEP - SIEGE COMMAND - DAY 4 - EARLY MORNING"
 */
function parseSceneHeadingText(text: string): { type: string; location: string; timeOfDay?: string } {
  // Match INT/EXT prefix
  const prefixMatch = text.match(/^(INT|EXT|INT\/EXT|I\/E)\.?\s+/i);
  if (!prefixMatch) {
    return { type: 'INT', location: text || 'UNKNOWN' };
  }

  const type = prefixMatch[1].toUpperCase();
  let remainder = text.slice(prefixMatch[0].length);

  // Remove parenthetical content (flashbacks, etc.) for time detection
  const withoutParens = remainder.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  // Try to find a time pattern in the text
  let detectedTime: string | undefined;
  for (const pattern of TIME_PATTERNS) {
    const timeMatch = withoutParens.match(pattern);
    if (timeMatch) {
      detectedTime = timeMatch[1].toUpperCase();
      break;
    }
  }

  // Extract location - everything before the time segment
  // Split by " - " and find where the time starts
  const segments = remainder.split(/\s+-\s+/);
  let locationSegments: string[] = [];

  for (const segment of segments) {
    // Check if this segment contains a time pattern or day number like "DAY 4"
    const isTimeSegment = TIME_PATTERNS.some(p => p.test(segment)) ||
                          /^DAY\s*\d+/i.test(segment) ||
                          /^\d+$/.test(segment.trim());

    if (isTimeSegment) {
      break;
    }

    // Remove parenthetical from segment for location
    const cleanSegment = segment.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (cleanSegment) {
      locationSegments.push(cleanSegment);
    }
  }

  const location = locationSegments.join(' - ') || 'UNKNOWN';

  return {
    type,
    location,
    timeOfDay: detectedTime,
  };
}

/**
 * Extract scene information from document.
 * Also runs time-of-day detection to mark auto-detected times.
 * Includes characters appearing in each scene.
 */
export function extractScenes(doc: ProseMirrorNode): SceneInfo[] {
  // First pass: collect all scene positions and character positions
  const sceneData: Array<{
    id: string;
    type: string;
    location: string;
    timeOfDay: string;
    sceneNumber: string | null;
    position: number;
    autoDetectedTimeOfDay: boolean;
  }> = [];
  const characterPositions: Array<{ name: string; position: number }> = [];

  let sceneIndex = 0;
  let previousTimeOfDay: TimeOfDay | undefined;

  doc.forEach((node, offset) => {
    if (node.type.name === 'scene_heading') {
      sceneIndex++;
      // Generate deterministic ID from scene index + position + content hash to ensure uniqueness
      const contentHash = node.textContent
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
      const id = node.attrs.id || `scene-${sceneIndex}-${offset}-${contentHash || 'empty'}`;

      // Always parse text content to extract time properly from complex headings
      const textContent = node.textContent;
      const parsed = textContent ? parseSceneHeadingText(textContent) : null;

      // Use attrs if available, otherwise fall back to parsed values
      const type = node.attrs.type || parsed?.type || 'INT';
      const location = node.attrs.location || parsed?.location || '';

      // For time: prefer parsed time from text (handles complex headings better),
      // fall back to attrs, then to detection
      const explicitTime = parsed?.timeOfDay || node.attrs.timeOfDay;

      // Run time detection to check if time was auto-detected from keywords
      const detection = detectTimeOfDay(location, explicitTime, previousTimeOfDay);

      // Update previous time for next scene (for CONTINUOUS inheritance)
      previousTimeOfDay = detection.timeOfDay;

      sceneData.push({
        id,
        type,
        location,
        timeOfDay: explicitTime || detection.timeOfDay,
        sceneNumber: node.attrs.sceneNumber,
        position: offset,
        autoDetectedTimeOfDay: detection.autoDetected,
      });
    } else if (node.type.name === 'character') {
      // Strip extensions like (V.O.), (O.S.), (CONT'D) to get clean name
      const name = node.textContent.replace(/\s*\([^)]+\)\s*$/, '').trim();
      if (name) {
        characterPositions.push({ name, position: offset });
      }
    }
  });

  // Second pass: assign characters to scenes based on position
  const scenes: SceneInfo[] = sceneData.map((scene, index) => {
    const nextScenePosition = sceneData[index + 1]?.position ?? Infinity;

    // Find all unique characters between this scene and the next
    const sceneCharacters = new Set<string>();
    for (const char of characterPositions) {
      if (char.position > scene.position && char.position < nextScenePosition) {
        sceneCharacters.add(char.name);
      }
    }

    return {
      ...scene,
      characters: Array.from(sceneCharacters),
    };
  });

  return scenes;
}

/**
 * Extract character information from document.
 * Returns characters sorted by dialogue count (most dialogue first).
 */
export function extractCharacters(doc: ProseMirrorNode): CharacterInfo[] {
  const characterMap = new Map<string, CharacterInfo>();

  doc.forEach((node) => {
    if (node.type.name === 'character') {
      // Strip extensions like (V.O.), (O.S.), (CONT'D) before generating ID
      // This ensures "LYRA", "LYRA (V.O.)", "LYRA (O.S.)" all get the same ID
      const name = node.textContent.replace(/\s*\([^)]+\)\s*$/, '').trim();
      const id = node.attrs.characterId || name.toLowerCase().replace(/[^a-z0-9]/g, '-');

      if (characterMap.has(id)) {
        const existing = characterMap.get(id)!;
        existing.dialogueCount++;
      } else {
        characterMap.set(id, { id, name, dialogueCount: 1 });
      }
    }
  });

  return Array.from(characterMap.values()).sort((a, b) => b.dialogueCount - a.dialogueCount);
}

/**
 * Extract shot information from document.
 * Returns shots with their scene context.
 */
export function extractShots(doc: ProseMirrorNode, scenes: SceneInfo[]): ShotInfo[] {
  const shots: ShotInfo[] = [];
  let shotIndex = 0;

  doc.forEach((node, offset) => {
    if (node.type.name === 'shot') {
      shotIndex++;
      // Find which scene this shot belongs to
      let currentSceneId: string | null = null;
      for (const scene of scenes) {
        if (scene.position < offset) {
          currentSceneId = scene.id;
        } else {
          break;
        }
      }

      // Generate deterministic ID
      const contentHash = node.textContent
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
      const id = `shot-${shotIndex}-${offset}-${contentHash || 'empty'}`;

      shots.push({
        id,
        shotType: node.attrs.shotType || null,
        subject: node.attrs.subject || null,
        content: node.textContent,
        position: offset,
        sceneId: currentSceneId,
        linkedShotId: node.attrs.linkedShotId || null,
      });
    }
  });

  return shots;
}

/**
 * Extract detected shots from document text content.
 * Scans action blocks, shot elements, and other text for shot patterns
 * like "CLOSE-UP:", "WIDE SHOT:", "POV", etc.
 *
 * Returns shots that can be suggested to the user for adding to the shotlist.
 */
export function extractDetectedShotsFromDocument(
  doc: ProseMirrorNode,
  scenes: SceneInfo[]
): DetectedShot[] {
  const detectedShots: DetectedShot[] = [];
  let lineNumber = 0;

  doc.forEach((node, offset) => {
    lineNumber++;
    const text = node.textContent.trim();

    // Skip empty lines
    if (!text) return;

    // Try to detect shot pattern in the text
    const detected = detectShot(text);

    if (detected) {
      // Find which scene this belongs to
      let currentSceneId: string | null = null;
      for (const scene of scenes) {
        if (scene.position < offset) {
          currentSceneId = scene.id;
        } else {
          break;
        }
      }

      // Generate unique ID based on position and content
      const contentHash = text.slice(0, 20).replace(/[^a-z0-9]/gi, '').toLowerCase();
      const id = `detected-${offset}-${contentHash}`;

      detectedShots.push({
        id,
        sceneId: currentSceneId,
        shotType: detected.shotType,
        subject: detected.subject,
        lineContent: text,
        position: offset,
        lineNumber,
      });
    }
  });

  return detectedShots;
}

/**
 * Get display name for a detected shot type.
 * Re-exports from screenplay-patterns for convenience.
 */
export { getShotDisplayName };
