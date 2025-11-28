import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';

export const paginationPluginKey = new PluginKey('pagination');

/**
 * Page metrics for standard screenplay format.
 * US Letter: 8.5" x 11"
 * Margins: 1" top, 1" bottom, 1.5" left, 1" right
 * Font: Courier 12pt (10 chars/inch, 6 lines/inch)
 */
const PAGE_METRICS = {
  // Lines per page (standard screenplay)
  LINES_PER_PAGE: 55,

  // Approximate characters per line
  CHARS_PER_LINE: 60,

  // Line height in pixels (12pt Courier at 96 DPI)
  LINE_HEIGHT_PX: 18,

  // Page content height in pixels (9.5" usable at 96 DPI)
  PAGE_HEIGHT_PX: 912,

  // Minimum lines to keep together for dialogue
  MIN_DIALOGUE_LINES: 2,

  // Minimum lines before page break for character name
  MIN_LINES_BEFORE_BREAK: 2,
};

/**
 * Pagination state.
 */
export interface PaginationState {
  pageBreaks: PageBreak[];
  pageCount: number;
  currentPage: number;
}

/**
 * Page break information.
 */
export interface PageBreak {
  position: number;      // Document position
  pageNumber: number;    // Page number after this break
  type: 'normal' | 'dialogue-split';
  characterName?: string; // For CONT'D tracking
}

/**
 * Estimate lines for a node based on content.
 */
function estimateNodeLines(node: ProseMirrorNode): number {
  const text = node.textContent;
  const textLength = text.length;

  // Base calculation: characters / chars per line
  let lines = Math.max(1, Math.ceil(textLength / PAGE_METRICS.CHARS_PER_LINE));

  // Add spacing based on element type
  switch (node.type.name) {
    case 'scene_heading':
      lines += 2; // Extra space before and after
      break;
    case 'action':
      lines += 1; // Space after
      break;
    case 'character':
      lines += 1; // Space before
      break;
    case 'transition':
      lines += 2; // Extra space before and after
      break;
    default:
      break;
  }

  return lines;
}

/**
 * Calculate page breaks for a document.
 */
function calculatePageBreaks(doc: ProseMirrorNode): PageBreak[] {
  const breaks: PageBreak[] = [];
  let currentLineCount = 0;
  let currentPage = 1;
  let lastCharacterName: string | null = null;
  let lastCharacterPos: number | null = null;

  doc.forEach((node, offset) => {
    const nodeLines = estimateNodeLines(node);
    const nodeType = node.type.name;

    // Track character names for CONT'D
    if (nodeType === 'character') {
      lastCharacterName = node.textContent.replace(/\s*\([^)]+\)\s*$/, '').trim();
      lastCharacterPos = offset;
    }

    // Check if we need a page break
    if (currentLineCount + nodeLines > PAGE_METRICS.LINES_PER_PAGE) {
      // Determine break type
      let breakType: PageBreak['type'] = 'normal';
      let characterName: string | undefined;

      // Check if we're splitting dialogue
      if (nodeType === 'dialogue' && lastCharacterName) {
        // Don't break if we'd leave only 1-2 lines of dialogue on previous page
        const linesOnPrevPage = PAGE_METRICS.LINES_PER_PAGE - currentLineCount;
        if (linesOnPrevPage < PAGE_METRICS.MIN_DIALOGUE_LINES) {
          // Move character + dialogue to next page instead
          if (lastCharacterPos !== null) {
            breaks.push({
              position: lastCharacterPos,
              pageNumber: currentPage + 1,
              type: 'normal',
            });
            currentPage++;
            currentLineCount = nodeLines + 2; // Character + dialogue
            return;
          }
        } else {
          breakType = 'dialogue-split';
          characterName = lastCharacterName;
        }
      }

      // Don't break right before a character name
      if (nodeType === 'character' && currentLineCount > PAGE_METRICS.LINES_PER_PAGE - PAGE_METRICS.MIN_LINES_BEFORE_BREAK) {
        // Move to next page
        breaks.push({
          position: offset,
          pageNumber: currentPage + 1,
          type: 'normal',
        });
        currentPage++;
        currentLineCount = nodeLines;
        return;
      }

      // Normal page break
      breaks.push({
        position: offset,
        pageNumber: currentPage + 1,
        type: breakType,
        characterName,
      });
      currentPage++;
      currentLineCount = nodeLines;
    } else {
      currentLineCount += nodeLines;
    }

    // Reset character tracking after non-dialogue elements
    if (nodeType !== 'dialogue' && nodeType !== 'parenthetical') {
      lastCharacterName = null;
      lastCharacterPos = null;
    }
  });

  return breaks;
}

/**
 * Create decorations for page breaks.
 */
function createPageBreakDecorations(
  doc: ProseMirrorNode,
  pageBreaks: PageBreak[]
): DecorationSet {
  const decorations: Decoration[] = [];

  pageBreaks.forEach((pageBreak) => {
    // Page break line decoration
    const pageBreakWidget = Decoration.widget(
      pageBreak.position,
      () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'pm-page-break';

        // Page number
        const pageNum = document.createElement('span');
        pageNum.className = 'pm-page-number';
        pageNum.textContent = `${pageBreak.pageNumber}`;
        wrapper.appendChild(pageNum);

        // MORE indicator for split dialogue
        if (pageBreak.type === 'dialogue-split' && pageBreak.characterName) {
          const more = document.createElement('div');
          more.className = 'pm-more-indicator';
          more.textContent = '(MORE)';
          wrapper.appendChild(more);
        }

        return wrapper;
      },
      { side: -1 }
    );

    decorations.push(pageBreakWidget);

    // CONT'D indicator after page break
    if (pageBreak.type === 'dialogue-split' && pageBreak.characterName) {
      const contdWidget = Decoration.widget(
        pageBreak.position,
        () => {
          const contd = document.createElement('div');
          contd.className = 'pm-contd-indicator';
          contd.textContent = `${pageBreak.characterName} (CONT'D)`;
          return contd;
        },
        { side: 1 }
      );
      decorations.push(contdWidget);
    }
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Get current page based on cursor position.
 */
function getCurrentPage(state: EditorState, pageBreaks: PageBreak[]): number {
  const cursorPos = state.selection.head;

  for (let i = pageBreaks.length - 1; i >= 0; i--) {
    if (cursorPos >= pageBreaks[i].position) {
      return pageBreaks[i].pageNumber;
    }
  }

  return 1;
}

/**
 * Create the pagination plugin.
 */
export function createPaginationPlugin(): Plugin {
  return new Plugin({
    key: paginationPluginKey,

    state: {
      init(_, state): PaginationState {
        const pageBreaks = calculatePageBreaks(state.doc);
        return {
          pageBreaks,
          pageCount: pageBreaks.length + 1,
          currentPage: 1,
        };
      },

      apply(tr, prevState, oldState, newState): PaginationState {
        // Recalculate on document change
        if (tr.docChanged) {
          const pageBreaks = calculatePageBreaks(newState.doc);
          return {
            pageBreaks,
            pageCount: pageBreaks.length + 1,
            currentPage: getCurrentPage(newState, pageBreaks),
          };
        }

        // Update current page on selection change
        if (tr.selectionSet) {
          return {
            ...prevState,
            currentPage: getCurrentPage(newState, prevState.pageBreaks),
          };
        }

        return prevState;
      },
    },

    props: {
      decorations(state) {
        const pluginState = paginationPluginKey.getState(state) as PaginationState;
        if (!pluginState) return DecorationSet.empty;

        return createPageBreakDecorations(state.doc, pluginState.pageBreaks);
      },
    },
  });
}

/**
 * Get pagination state from editor state.
 */
export function getPaginationState(state: EditorState): PaginationState | undefined {
  return paginationPluginKey.getState(state) as PaginationState | undefined;
}

export { PAGE_METRICS };
