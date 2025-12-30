/**
 * Detect shots from parsed screenplay scenes.
 * Scans action lines for shot patterns (CLOSE-UP, WIDE SHOT, POV, etc.)
 * and returns suggestions that can be added to the shotlist.
 */

import { Scene } from '@/types/screenplay';
import { DetectedShot } from '@/types/shotlist';
import { detectShot } from '@/lib/screenplay/patterns';

/**
 * Scan parsed screenplay scenes for shot patterns in action lines.
 * Returns an array of detected shots that can be shown as suggestions.
 *
 * @param scenes - Array of parsed screenplay scenes
 * @returns Array of detected shots with scene context
 */
export function detectShotsFromScenes(scenes: Scene[]): DetectedShot[] {
  const detected: DetectedShot[] = [];
  let lineNumber = 0;

  for (const scene of scenes) {
    for (const element of scene.elements) {
      lineNumber++;

      // Only scan action lines for shot patterns
      if (element.type !== 'action') continue;

      const content = element.content.trim();
      if (!content) continue;

      const shot = detectShot(content);
      if (shot) {
        detected.push({
          id: `detected-${scene.id}-${element.id}`,
          sceneId: scene.id,
          shotType: shot.shotType,
          subject: shot.subject,
          lineContent: content,
          position: lineNumber,
          lineNumber,
        });
      }
    }
  }

  return detected;
}
