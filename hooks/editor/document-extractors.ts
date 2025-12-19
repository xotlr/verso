/**
 * Pure utility functions for extracting information from ProseMirror documents.
 * These are stateless functions that operate on document nodes.
 */

import { Node as ProseMirrorNode } from 'prosemirror-model';
import { detectTimeOfDay, type TimeOfDay } from '@/lib/prosemirror/utils/time-detection';
import type { SceneInfo, CharacterInfo, ShotInfo } from './types';

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
 * Extract scene information from document.
 * Also runs time-of-day detection to mark auto-detected times.
 */
export function extractScenes(doc: ProseMirrorNode): SceneInfo[] {
  const scenes: SceneInfo[] = [];
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

      // Run time detection to check if time was auto-detected from keywords
      const location = node.attrs.location || '';
      const explicitTime = node.attrs.timeOfDay;
      const detection = detectTimeOfDay(location, explicitTime, previousTimeOfDay);

      // Update previous time for next scene (for CONTINUOUS inheritance)
      previousTimeOfDay = detection.timeOfDay;

      scenes.push({
        id,
        type: node.attrs.type,
        location: node.attrs.location,
        timeOfDay: node.attrs.timeOfDay || detection.timeOfDay,
        sceneNumber: node.attrs.sceneNumber,
        position: offset,
        autoDetectedTimeOfDay: detection.autoDetected,
      });
    }
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
      const id = node.attrs.characterId || node.textContent.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const name = node.textContent.replace(/\s*\([^)]+\)\s*$/, '').trim();

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
