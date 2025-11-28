import { Node as ProseMirrorNode } from 'prosemirror-model';
import { screenplaySchema } from './schema';
import {
  isSceneHeading,
  isTransition,
  isParenthetical,
  couldBeCharacterName,
  parseCharacterLine,
} from '../screenplay-patterns';

/**
 * Serialized ProseMirror document format for database storage.
 */
export interface SerializedScreenplay {
  version: number;
  type: 'prosemirror';
  content: ProseMirrorJSON;
}

/**
 * ProseMirror JSON document structure.
 */
export interface ProseMirrorJSON {
  type: string;
  content?: ProseMirrorJSON[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Check if content is in ProseMirror JSON format.
 */
export function isProseMirrorContent(content: string): boolean {
  if (!content || !content.trim()) return false;

  try {
    const parsed = JSON.parse(content);
    return (
      parsed &&
      typeof parsed === 'object' &&
      parsed.type === 'prosemirror' &&
      parsed.content &&
      parsed.content.type === 'doc'
    );
  } catch {
    return false;
  }
}

/**
 * Parse a scene heading line into components.
 */
function parseSceneHeading(line: string): {
  type: 'INT' | 'EXT' | 'INT/EXT';
  location: string;
  timeOfDay: string;
} {
  const trimmed = line.trim();

  // Extract INT/EXT type
  let type: 'INT' | 'EXT' | 'INT/EXT' = 'INT';
  let rest = trimmed;

  if (/^INT\/EXT\.|^I\/E\./i.test(trimmed)) {
    type = 'INT/EXT';
    rest = trimmed.replace(/^(INT\/EXT\.|I\/E\.)\s*/i, '');
  } else if (/^INT\./i.test(trimmed)) {
    type = 'INT';
    rest = trimmed.replace(/^INT\.\s*/i, '');
  } else if (/^EXT\./i.test(trimmed)) {
    type = 'EXT';
    rest = trimmed.replace(/^EXT\.\s*/i, '');
  }

  // Split by " - " to get location and time of day
  const parts = rest.split(/\s+-\s+/);
  const location = parts[0] || '';
  const timeOfDay = parts[1] || 'DAY';

  return { type, location, timeOfDay };
}

/**
 * Convert plain text screenplay to ProseMirror document.
 */
export function plainTextToProseMirror(text: string): ProseMirrorNode {
  const lines = text.split('\n');
  const content: ProseMirrorJSON[] = [];

  let i = 0;
  let lastCharacterId: string | null = null;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (they become paragraph breaks naturally)
    if (!trimmed) {
      // If previous was dialogue/character, empty line resets context
      lastCharacterId = null;
      i++;
      continue;
    }

    // Scene heading
    if (isSceneHeading(trimmed)) {
      const { type, location, timeOfDay } = parseSceneHeading(trimmed);
      // Generate deterministic ID from line number and content
      const contentHash = trimmed.slice(0, 20).replace(/[^a-z0-9]/gi, '').toLowerCase();
      content.push({
        type: 'scene_heading',
        attrs: {
          id: `scene-${i}-${contentHash || 'empty'}`,
          type,
          location,
          timeOfDay,
          sceneNumber: null,
        },
        content: trimmed ? [{ type: 'text', text: trimmed }] : undefined,
      });
      lastCharacterId = null;
      i++;
      continue;
    }

    // Transition
    if (isTransition(trimmed)) {
      content.push({
        type: 'transition',
        content: [{ type: 'text', text: trimmed }],
      });
      lastCharacterId = null;
      i++;
      continue;
    }

    // Parenthetical
    if (isParenthetical(trimmed)) {
      content.push({
        type: 'parenthetical',
        content: [{ type: 'text', text: trimmed }],
      });
      i++;
      continue;
    }

    // Character name check (look ahead for dialogue)
    if (couldBeCharacterName(trimmed)) {
      // Look at next non-empty line to see if it's dialogue
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;

      const nextLine = j < lines.length ? lines[j].trim() : '';
      const hasDialogueFollowing =
        nextLine && !couldBeCharacterName(nextLine) && !isSceneHeading(nextLine) && !isTransition(nextLine);

      if (hasDialogueFollowing || isParenthetical(nextLine)) {
        const { name, extension } = parseCharacterLine(trimmed);
        const characterId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        content.push({
          type: 'character',
          attrs: {
            characterId,
            extension,
            isDual: false,
          },
          content: [{ type: 'text', text: trimmed }],
        });

        lastCharacterId = characterId;
        i++;
        continue;
      }
    }

    // If we just had a character, this is likely dialogue
    if (lastCharacterId && !couldBeCharacterName(trimmed) && !isSceneHeading(trimmed) && !isTransition(trimmed)) {
      // Collect multi-line dialogue
      let dialogueText = trimmed;
      let j = i + 1;

      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (!nextLine) break; // Empty line ends dialogue
        if (isParenthetical(nextLine)) break; // Parenthetical is separate
        if (couldBeCharacterName(nextLine)) break; // New character
        if (isSceneHeading(nextLine)) break;
        if (isTransition(nextLine)) break;

        dialogueText += '\n' + nextLine;
        j++;
      }

      content.push({
        type: 'dialogue',
        attrs: { characterId: lastCharacterId },
        content: [{ type: 'text', text: dialogueText }],
      });

      i = j;
      continue;
    }

    // Default: treat as action
    content.push({
      type: 'action',
      content: trimmed ? [{ type: 'text', text: trimmed }] : undefined,
    });
    lastCharacterId = null;
    i++;
  }

  // Ensure document has at least one node
  if (content.length === 0) {
    content.push({
      type: 'action',
      content: undefined,
    });
  }

  const docJSON: ProseMirrorJSON = {
    type: 'doc',
    content,
  };

  return screenplaySchema.nodeFromJSON(docJSON);
}

/**
 * Convert ProseMirror document to plain text.
 */
export function proseMirrorToPlainText(doc: ProseMirrorNode): string {
  const lines: string[] = [];

  doc.forEach((node) => {
    const text = node.textContent;

    switch (node.type.name) {
      case 'scene_heading':
        lines.push('');
        lines.push(text);
        lines.push('');
        break;

      case 'action':
        lines.push(text);
        lines.push('');
        break;

      case 'character':
        lines.push('');
        lines.push(text);
        break;

      case 'dialogue':
        lines.push(text);
        lines.push('');
        break;

      case 'parenthetical':
        lines.push(text);
        break;

      case 'transition':
        lines.push('');
        lines.push(text);
        lines.push('');
        break;

      case 'dual_dialogue':
        // Handle dual dialogue by serializing columns
        node.forEach((column) => {
          column.forEach((child) => {
            lines.push(child.textContent);
          });
          lines.push('');
        });
        break;

      default:
        lines.push(text);
    }
  });

  // Clean up excessive blank lines
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Serialize ProseMirror document for database storage.
 */
export function serializeForStorage(doc: ProseMirrorNode): string {
  const serialized: SerializedScreenplay = {
    version: 1,
    type: 'prosemirror',
    content: doc.toJSON() as ProseMirrorJSON,
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize content from database to ProseMirror document.
 * Handles both JSON and plain text formats.
 */
export function deserializeFromStorage(content: string | null | undefined): ProseMirrorNode {
  if (!content || !content.trim()) {
    // Return empty document with single action paragraph
    return screenplaySchema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'action' }],
    });
  }

  // Try to parse as ProseMirror JSON
  if (isProseMirrorContent(content)) {
    try {
      const parsed = JSON.parse(content) as SerializedScreenplay;
      return screenplaySchema.nodeFromJSON(parsed.content);
    } catch (error) {
      console.error('Failed to parse ProseMirror JSON, falling back to plain text:', error);
    }
  }

  // Treat as plain text and convert
  return plainTextToProseMirror(content);
}

/**
 * Create an empty ProseMirror document.
 */
export function createEmptyDocument(): ProseMirrorNode {
  return screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [{ type: 'action' }],
  });
}

/**
 * Create a document with a scene heading starter.
 */
export function createStarterDocument(): ProseMirrorNode {
  return screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'scene_heading',
        attrs: {
          id: 'scene-1',
          type: 'INT',
          location: '',
          timeOfDay: 'DAY',
          sceneNumber: null,
        },
        content: [{ type: 'text', text: 'INT. LOCATION - DAY' }],
      },
      {
        type: 'action',
      },
    ],
  });
}
