/**
 * Screenplay creation utilities.
 * Extracted from /api/screenplays route to enable reuse across the codebase.
 */

import { screenplaySchema } from '@/lib/prosemirror/schema';
import { serializeForStorage, plainTextToProseMirror } from '@/lib/prosemirror/serialization';

/** Maximum content size in bytes (5MB) */
export const MAX_CONTENT_SIZE = 5 * 1024 * 1024;

/** Title page node structure for ProseMirror document */
interface TitlePageContent {
  title?: string;
  author: string;
  logline?: string;
}

/**
 * Creates a ProseMirror title page node with the given content.
 * This node is prepended to all screenplay documents.
 */
export function createTitlePageNode(content: TitlePageContent) {
  return {
    type: 'title_page',
    content: [
      {
        type: 'title_page_title',
        content: content.title ? [{ type: 'text', text: content.title }] : undefined,
      },
      {
        type: 'title_page_author',
        content: [{ type: 'text', text: content.author }],
      },
      {
        type: 'title_page_logline',
        content: content.logline ? [{ type: 'text', text: content.logline }] : undefined,
      },
    ],
  };
}

/** Options for initializing screenplay content */
interface InitializeContentOptions {
  /** Raw content string (Fountain format or empty) */
  content: string;
  /** Screenplay title */
  title: string;
  /** Author name (falls back to "Written by...") */
  author: string;
  /** Optional logline for title page */
  logline?: string;
}

/** Result of content initialization */
interface InitializeContentResult {
  /** Serialized ProseMirror content for storage */
  content: string;
  /** Calculated word count */
  wordCount: number;
}

/**
 * Initializes screenplay content with a title page.
 * If content is provided, parses it as Fountain and prepends title page.
 * If no content, creates a starter document with empty scene heading.
 *
 * @throws Error if content exceeds MAX_CONTENT_SIZE
 */
export function initializeScreenplayContent(
  options: InitializeContentOptions
): InitializeContentResult {
  const { content, title, author, logline } = options;
  const authorName = author || 'Written by...';

  const titlePageNode = createTitlePageNode({
    title,
    author: authorName,
    logline,
  });

  if (content && content.trim() !== '') {
    // Content provided (from template) - validate size
    const contentSize = new TextEncoder().encode(content).length;
    if (contentSize > MAX_CONTENT_SIZE) {
      throw new Error('Content too large. Maximum size is 5MB.');
    }

    // Parse template content (Fountain text) to ProseMirror
    const parsedDoc = plainTextToProseMirror(content);
    const parsedJSON = parsedDoc.toJSON();

    // Prepend title page to the parsed content
    parsedJSON.content = [titlePageNode, ...parsedJSON.content];

    // Reconstruct document and serialize
    const docWithTitlePage = screenplaySchema.nodeFromJSON(parsedJSON);
    const finalContent = serializeForStorage(docWithTitlePage);
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return { content: finalContent, wordCount };
  }

  // No content - create starter document with title page
  const initialDoc = screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [
      titlePageNode,
      {
        type: 'scene_heading',
        attrs: {
          id: 'scene-1',
          type: 'INT',
          location: '',
          timeOfDay: 'DAY',
          sceneNumber: null,
        },
      },
      {
        type: 'action',
      },
    ],
  });

  const finalContent = serializeForStorage(initialDoc);
  // Word count from title page content
  const wordCount = [title, authorName, logline]
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return { content: finalContent, wordCount };
}
