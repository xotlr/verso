import type { ShotNumberFormat } from '@/types/settings';

/**
 * Format a shot number based on the selected numbering format.
 *
 * @param shotNumber - The shot's sequential number within its scene (1-indexed)
 * @param sceneNumber - The scene number (1-indexed)
 * @param format - The numbering format to use
 * @param showScenePrefix - Whether to show "Scene X - Shot Y" for sequential format
 * @param globalIndex - The shot's global index across the entire shotlist (for global-sequential)
 */
export function formatShotNumber(
  shotNumber: number,
  sceneNumber: number,
  format: ShotNumberFormat,
  showScenePrefix: boolean = false,
  globalIndex?: number
): string {
  switch (format) {
    case 'scene-shot':
      // Industry standard: 14.1, 14.2, etc.
      return `${sceneNumber}.${shotNumber}`;

    case 'scene-letter':
      // Letter suffix: 14A, 14B, etc.
      // Handles up to 26 shots per scene (A-Z), then AA, AB, etc.
      return `${sceneNumber}${numberToLetter(shotNumber)}`;

    case 'sequential':
      // Per-scene sequential: 1, 2, 3 or "Scene 14 - Shot 1"
      if (showScenePrefix) {
        return `Scene ${sceneNumber} - Shot ${shotNumber}`;
      }
      return `${shotNumber}`;

    case 'global-sequential':
      // Global sequential across entire shotlist
      return globalIndex !== undefined ? `${globalIndex}` : `${shotNumber}`;

    default:
      return `${sceneNumber}.${shotNumber}`;
  }
}

/**
 * Convert a number to letter(s) for shot numbering.
 * 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, etc.
 */
function numberToLetter(num: number): string {
  let result = '';
  let n = num;

  while (n > 0) {
    n--; // Adjust for 0-indexed
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }

  return result;
}

/**
 * Get a compact display label for the shot card.
 * Returns a shorter version suitable for badges/thumbnails.
 */
export function formatShotLabel(
  shotNumber: number,
  sceneNumber: number,
  format: ShotNumberFormat
): string {
  switch (format) {
    case 'scene-shot':
      return `${sceneNumber}.${shotNumber}`;

    case 'scene-letter':
      return `${sceneNumber}${numberToLetter(shotNumber)}`;

    case 'sequential':
    case 'global-sequential':
      return `${shotNumber}`;

    default:
      return `${sceneNumber}.${shotNumber}`;
  }
}
