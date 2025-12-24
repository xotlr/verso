/**
 * Paste Handler Plugin
 *
 * Handles paste events to:
 * 1. Detect cover page metadata (title, author, logline) before the first scene heading
 * 2. Parse plain text screenplay into proper ProseMirror nodes (scene_heading, character, dialogue, etc.)
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { Slice } from 'prosemirror-model';
import { plainTextToProseMirror } from '../serialization';
import { looksLikeScreenplay } from '../../screenplay/patterns';

export const pastePluginKey = new PluginKey('pasteHandler');

/**
 * Cover page metadata extracted from pasted text
 */
export interface CoverPageData {
  title?: string;
  author?: string;
  logline?: string;
  contact?: string;
  draftDate?: string;
}

/**
 * Scene heading pattern to detect where screenplay content begins
 */
const SCENE_HEADING_PATTERN = /^(\d+\.?\s*)?(INT\.|EXT\.|INT\/EXT\.|I\/E\.|INT\/EXT|I\/E).*/i;

/**
 * Extract cover page metadata from text before first scene heading
 *
 * Looks for patterns like:
 * - Title: My Script
 * - Written by John Doe
 * - Logline: A story about...
 * - Or infers title from first substantial line
 */
function extractCoverPage(text: string): {
  coverPage: CoverPageData | null;
  contentText: string;
} {
  const lines = text.split('\n');

  // Find first scene heading (INT./EXT.)
  const firstSceneIndex = lines.findIndex((line) =>
    SCENE_HEADING_PATTERN.test(line.trim())
  );

  // If no scene heading found, or it's at the start, no cover page
  if (firstSceneIndex <= 0) {
    return { coverPage: null, contentText: text };
  }

  const headerLines = lines.slice(0, firstSceneIndex);
  const coverPage: CoverPageData = {};

  for (const line of headerLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for explicit key: value patterns
    if (/^title:\s*/i.test(trimmed)) {
      coverPage.title = trimmed.replace(/^title:\s*/i, '').trim();
    } else if (/^(written by|by|author:?)\s*/i.test(trimmed)) {
      coverPage.author = trimmed.replace(/^(written by|by|author:?)\s*/i, '').trim();
    } else if (/^logline:\s*/i.test(trimmed)) {
      coverPage.logline = trimmed.replace(/^logline:\s*/i, '').trim();
    } else if (/^contact:\s*/i.test(trimmed)) {
      coverPage.contact = trimmed.replace(/^contact:\s*/i, '').trim();
    } else if (/^(draft date|date):\s*/i.test(trimmed)) {
      coverPage.draftDate = trimmed.replace(/^(draft date|date):\s*/i, '').trim();
    } else if (!coverPage.title && trimmed.length > 1 && !trimmed.includes(':')) {
      // First substantial line without a colon = likely title
      // (centered titles on cover pages are often just text)
      coverPage.title = trimmed;
    }
  }

  // Only return cover page if we found at least a title
  const contentText = lines.slice(firstSceneIndex).join('\n');
  return {
    coverPage: coverPage.title ? coverPage : null,
    contentText,
  };
}

/**
 * Options for the paste handler plugin
 */
export interface PastePluginOptions {
  /**
   * Callback when cover page metadata is detected in pasted content
   */
  onCoverPageDetected?: (coverPage: CoverPageData) => void;
}

/**
 * Create the paste handler plugin
 *
 * @param options - Plugin options including callbacks
 * @returns ProseMirror plugin
 */
export function createPastePlugin(options: PastePluginOptions = {}): Plugin {
  return new Plugin({
    key: pastePluginKey,

    props: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');

        // Only process multi-line paste (single line is handled normally)
        if (!text || !text.includes('\n')) {
          return false; // Let default handling proceed
        }

        // Check for cover page metadata
        const { coverPage } = extractCoverPage(text);

        // If cover page detected, notify via callback
        if (coverPage && options.onCoverPageDetected) {
          options.onCoverPageDetected(coverPage);
        }

        // If this looks like screenplay content, parse it properly
        // This ensures scene headings, characters, dialogue, etc. are detected
        if (looksLikeScreenplay(text)) {
          try {
            // Parse plain text into ProseMirror document with proper node types
            const doc = plainTextToProseMirror(text);

            // Create a slice from the document content (skip doc node itself)
            const slice = new Slice(doc.content, 0, 0);

            // Insert the parsed content at current selection
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr);

            return true; // Prevent default paste handling
          } catch (error) {
            console.error('Failed to parse screenplay paste:', error);
            // Fall through to default handling on error
          }
        }

        // Let default paste handling proceed for non-screenplay content
        return false;
      },
    },
  });
}

export { extractCoverPage };
