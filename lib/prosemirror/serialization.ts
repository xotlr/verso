import { Node as ProseMirrorNode } from 'prosemirror-model';
import { screenplaySchema } from './schema';
import {
  isSceneHeading,
  isTransition,
  isParenthetical,
  couldBeCharacterName,
  parseCharacterLine,
} from '../screenplay/patterns';

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
 * Extract cover page data (title, author, logline) from lines before first scene heading.
 */
function extractCoverPageFromLines(lines: string[]): {
  title?: string;
  author?: string;
  logline?: string;
} {
  const coverPage: { title?: string; author?: string; logline?: string } = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for explicit key: value patterns
    if (/^title:\s*/i.test(trimmed)) {
      coverPage.title = trimmed.replace(/^title:\s*/i, '').trim();
    } else if (/^(written by|by|author:?)\s*/i.test(trimmed)) {
      coverPage.author = trimmed.replace(/^(written by|by|author:?)\s*/i, '').trim();
    } else if (/^logline:\s*/i.test(trimmed)) {
      coverPage.logline = trimmed.replace(/^logline:\s*/i, '').trim();
    } else if (!coverPage.title && trimmed.length > 1 && !trimmed.includes(':')) {
      // First substantial line without a colon = likely title
      coverPage.title = trimmed;
    }
  }

  return coverPage;
}

/**
 * Convert plain text screenplay to ProseMirror document.
 */
export function plainTextToProseMirror(text: string): ProseMirrorNode {
  const lines = text.split('\n');
  const content: ProseMirrorJSON[] = [];

  // First, find the first scene heading to identify cover page content
  // Scene headings can be numbered (e.g., "1.  INT. LOCATION") or plain
  const firstSceneIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return isSceneHeading(trimmed) || /^\d+\.\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed);
  });

  // Extract cover page if content exists before first scene heading
  if (firstSceneIndex > 0) {
    const headerLines = lines.slice(0, firstSceneIndex);
    const coverPage = extractCoverPageFromLines(headerLines);

    // Create title_page node if we found any cover page data
    if (coverPage.title || coverPage.author || coverPage.logline) {
      const draftText = `Draft\n${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      content.push({
        type: 'title_page',
        content: [
          {
            type: 'title_page_title',
            content: coverPage.title ? [{ type: 'text', text: coverPage.title }] : undefined,
          },
          {
            type: 'title_page_author',
            content: coverPage.author ? [{ type: 'text', text: coverPage.author }] : undefined,
          },
          {
            type: 'title_page_logline',
            content: coverPage.logline ? [{ type: 'text', text: coverPage.logline }] : undefined,
          },
          { type: 'title_page_contact' },
          { type: 'title_page_copyright' },
          {
            type: 'title_page_draft',
            content: [{ type: 'text', text: draftText }],
          },
        ],
      });
    }
  }

  // Start parsing from first scene heading (or beginning if no cover page found)
  let i = firstSceneIndex > 0 ? firstSceneIndex : 0;
  let sceneCount = 0;
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

    // Scene heading (handle numbered scene headings too, e.g., "1.  INT. LOCATION")
    const isNumberedSceneHeading = /^\d+\.\s*(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed);
    if (isSceneHeading(trimmed) || isNumberedSceneHeading) {
      // Strip scene number prefix if present for parsing
      const cleanedHeading = trimmed.replace(/^\d+\.\s*/, '');
      const { type, location, timeOfDay } = parseSceneHeading(cleanedHeading);
      sceneCount++;
      // Generate unique ID using scene count + line number to ensure uniqueness
      const contentHash = trimmed.slice(0, 20).replace(/[^a-z0-9]/gi, '').toLowerCase();
      content.push({
        type: 'scene_heading',
        attrs: {
          id: `scene-${sceneCount}-${i}-${contentHash || 'empty'}`,
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
      case 'title_page':
        // Title page outputs centered cover page format from child nodes
        node.forEach((child) => {
          const childText = child.textContent.trim();
          if (!childText) return;

          switch (child.type.name) {
            case 'title_page_title':
              lines.push('');
              lines.push(childText.toUpperCase());
              lines.push('');
              break;
            case 'title_page_author':
              lines.push('');
              lines.push('Written by');
              lines.push(childText);
              lines.push('');
              break;
            case 'title_page_logline':
              lines.push('');
              lines.push(`Logline: ${childText}`);
              lines.push('');
              break;
          }
        });
        lines.push('');
        break;

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
 * Normalizes document to ensure minimum structure (all 6 title page fields).
 */
export function deserializeFromStorage(content: string | null | undefined): ProseMirrorNode {
  if (!content || !content.trim()) {
    // Return starter document with title page for new documents
    return createStarterDocument();
  }

  // Try to parse as ProseMirror JSON
  if (isProseMirrorContent(content)) {
    try {
      const parsed = JSON.parse(content) as SerializedScreenplay;
      // Normalize JSON BEFORE passing to schema (schema now requires all 6 title page fields)
      const normalizedJson = normalizeDocumentJson(parsed.content);
      return screenplaySchema.nodeFromJSON(normalizedJson);
    } catch (error) {
      console.error('Failed to parse ProseMirror JSON, falling back to plain text:', error);
    }
  }

  // Treat as plain text and convert (normalization happens inside)
  return plainTextToProseMirror(content);
}

/**
 * Check if a title page field node is empty (no content or empty text).
 */
function isFieldEmpty(field: ProseMirrorJSON): boolean {
  if (!field.content) return true;
  if (field.content.length === 0) return true;
  // Check if all text content is empty
  return field.content.every((child: ProseMirrorJSON) => !child.text?.trim());
}

/**
 * Normalize document JSON to ensure minimum required structure:
 * - Title page with all 6 fields
 * - At least one content block after title page
 * - Draft field auto-populated with current date if empty
 *
 * Works on raw JSON before schema validation to handle legacy documents.
 */
function normalizeDocumentJson(json: ProseMirrorJSON): ProseMirrorJSON {
  const content = json.content || [];

  // Check for title page
  const firstNode = content[0];
  const hasTitlePage = firstNode?.type === 'title_page';

  if (!hasTitlePage) {
    // Insert title page at beginning with auto-populated draft
    const draftText = `Draft\n${formatDraftDate()}`;
    content.unshift({
      type: 'title_page',
      content: [
        { type: 'title_page_title' },
        { type: 'title_page_author' },
        { type: 'title_page_logline' },
        { type: 'title_page_contact' },
        { type: 'title_page_copyright' },
        {
          type: 'title_page_draft',
          content: [{ type: 'text', text: draftText }],
        },
      ],
    });
  } else {
    // Title page exists - ensure all 6 fields are present
    const titlePageContent = firstNode.content || [];
    const requiredFields = [
      'title_page_title',
      'title_page_author',
      'title_page_logline',
      'title_page_contact',
      'title_page_copyright',
      'title_page_draft',
    ];

    const existingFields = new Set(titlePageContent.map((n: ProseMirrorJSON) => n.type));
    const missingFields = requiredFields.filter((f) => !existingFields.has(f));

    if (missingFields.length > 0) {
      // Add missing fields at the end
      for (const fieldType of missingFields) {
        if (fieldType === 'title_page_draft') {
          // Auto-populate draft with current date
          const draftText = `Draft\n${formatDraftDate()}`;
          titlePageContent.push({
            type: fieldType,
            content: [{ type: 'text', text: draftText }],
          });
        } else {
          titlePageContent.push({ type: fieldType });
        }
      }
      firstNode.content = titlePageContent;
    }

    // Check if draft field exists but is empty - populate with current date
    const draftField = titlePageContent.find((n: ProseMirrorJSON) => n.type === 'title_page_draft');
    if (draftField && isFieldEmpty(draftField)) {
      const draftText = `Draft\n${formatDraftDate()}`;
      draftField.content = [{ type: 'text', text: draftText }];
    }
  }

  // Check for content after title page
  const contentStartIndex = content[0]?.type === 'title_page' ? 1 : 0;
  if (content.length <= contentStartIndex) {
    // No content block - add action as starter
    content.push({ type: 'action' });
  }

  json.content = content;
  return json;
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
 * Format current date for draft field (e.g., "January 2026")
 */
function formatDraftDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Create a document with title page and scene heading starter.
 * Draft field is auto-populated with current date.
 */
export function createStarterDocument(): ProseMirrorNode {
  const draftText = `Draft\n${formatDraftDate()}`;

  return screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'title_page',
        content: [
          { type: 'title_page_title' },     // Empty - placeholder shows "Title"
          { type: 'title_page_author' },    // Empty - placeholder shows "Written by"
          { type: 'title_page_logline' },   // Empty - placeholder shows "Logline"
          { type: 'title_page_contact' },   // Empty - placeholder shows "Contact"
          { type: 'title_page_copyright' }, // Empty - hidden by default
          {
            type: 'title_page_draft',
            content: [{ type: 'text', text: draftText }],
          },
        ],
      },
      {
        type: 'action',
        // Empty - CSS placeholder shows hint text
      },
    ],
  });
}
