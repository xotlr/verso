import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import type { PaginationResult, PageIdentifier } from '@/lib/verso/types';

export const paginationPluginKey = new PluginKey<PaginationState>('pagination');

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
 * Page break information derived from WASM pagination results.
 */
export interface PageBreak {
  position: number;           // Document position
  pageNumber: number;         // Page number after this break
  pageIdentifier: PageIdentifier; // Full page identifier (for A-pages, etc.)
  type: 'normal' | 'dialogue-split';
  characterName?: string;     // For CONT'D tracking
  moreMarker?: string;        // MORE marker text
  contdMarker?: string;       // CONT'D marker text
}

/**
 * Pagination state - now receives results from WASM engine.
 */
export interface PaginationState {
  pageBreaks: PageBreak[];
  pageCount: number;
  currentPage: number;
  // Store the full WASM result for advanced queries
  wasmResult: PaginationResult | null;
  // Track if we're using WASM or fallback calculation
  source: 'wasm' | 'fallback';
}

/**
 * Convert WASM pagination result to page breaks for decoration rendering.
 * This maps element IDs back to document positions.
 */
function convertWasmResultToPageBreaks(
  doc: ProseMirrorNode,
  result: PaginationResult
): PageBreak[] {
  const breaks: PageBreak[] = [];

  // Build a map of element index to document position
  const elementPositions: Map<string, number> = new Map();
  let elementIndex = 0;
  doc.forEach((node, offset) => {
    elementPositions.set(elementIndex.toString(), offset);
    elementIndex++;
  });

  // Process each page to find where breaks should be rendered
  for (let i = 1; i < result.pages.length; i++) {
    const page = result.pages[i];
    const prevPage = result.pages[i - 1];

    if (page.elements.length === 0) continue;

    // Get the first element on this page
    const firstElement = page.elements[0];
    const position = elementPositions.get(firstElement.element_id);

    if (position === undefined) continue;

    // Determine if this is a dialogue split
    let breakType: PageBreak['type'] = 'normal';
    let characterName: string | undefined;
    let moreMarker: string | undefined;
    let contdMarker: string | undefined;

    // Check if previous page has a continuation marker
    if (prevPage.bottom_continuation) {
      breakType = 'dialogue-split';
      moreMarker = '(MORE)';
    }

    // Check if this element is a continuation
    if (firstElement.is_continuation && firstElement.continuation_prefix) {
      breakType = 'dialogue-split';
      contdMarker = firstElement.continuation_prefix;
      // Extract character name from continuation prefix (e.g., "JOHN (CONT'D)")
      const match = firstElement.continuation_prefix.match(/^([A-Z\s]+)/);
      if (match) {
        characterName = match[1].trim();
      }
    }

    breaks.push({
      position,
      pageNumber: getPageNumber(page.identifier),
      pageIdentifier: page.identifier,
      type: breakType,
      characterName,
      moreMarker,
      contdMarker,
    });
  }

  return breaks;
}

/**
 * Extract numeric page number from PageIdentifier.
 */
function getPageNumber(identifier: PageIdentifier): number {
  switch (identifier.type) {
    case 'Sequential':
      return identifier.value;
    case 'Inserted':
      return identifier.value.base;
    case 'Omitted':
      return identifier.value;
  }
}

/**
 * Get display string for page identifier.
 */
function displayPageIdentifier(identifier: PageIdentifier): string {
  switch (identifier.type) {
    case 'Sequential':
      return String(identifier.value);
    case 'Inserted':
      return `${identifier.value.base}${identifier.value.suffix}`;
    case 'Omitted':
      return `${identifier.value}`;
  }
}

/**
 * Fallback: Estimate lines for a node based on content.
 * Used when WASM results are not yet available.
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
 * Fallback: Calculate page breaks for a document.
 * Used when WASM results are not yet available.
 */
function calculateFallbackPageBreaks(doc: ProseMirrorNode): PageBreak[] {
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
              pageIdentifier: { type: 'Sequential', value: currentPage + 1 },
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
          pageIdentifier: { type: 'Sequential', value: currentPage + 1 },
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
        pageIdentifier: { type: 'Sequential', value: currentPage + 1 },
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
    // Validate position is within document bounds
    if (pageBreak.position < 0 || pageBreak.position > doc.content.size) {
      return;
    }

    // Page break line decoration
    const pageBreakWidget = Decoration.widget(
      pageBreak.position,
      () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'pm-page-break';
        wrapper.setAttribute('data-page-number', displayPageIdentifier(pageBreak.pageIdentifier));

        // Visual separator line
        const separator = document.createElement('div');
        separator.className = 'pm-page-separator';
        wrapper.appendChild(separator);

        // Page number badge
        const pageNum = document.createElement('div');
        pageNum.className = 'pm-page-number';
        pageNum.textContent = `Page ${displayPageIdentifier(pageBreak.pageIdentifier)}`;
        wrapper.appendChild(pageNum);

        // MORE indicator for split dialogue
        if (pageBreak.type === 'dialogue-split' && pageBreak.moreMarker) {
          const more = document.createElement('div');
          more.className = 'pm-more-indicator';
          more.textContent = pageBreak.moreMarker;
          wrapper.appendChild(more);
        }

        return wrapper;
      },
      { side: -1 }
    );

    decorations.push(pageBreakWidget);

    // CONT'D indicator after page break
    if (pageBreak.type === 'dialogue-split' && pageBreak.contdMarker) {
      const contdWidget = Decoration.widget(
        pageBreak.position,
        () => {
          const contd = document.createElement('div');
          contd.className = 'pm-contd-indicator';
          contd.textContent = pageBreak.contdMarker!;
          return contd;
        },
        { side: 1 }
      );
      decorations.push(contdWidget);
    } else if (pageBreak.type === 'dialogue-split' && pageBreak.characterName) {
      // Fallback for legacy format
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
 * Meta key for updating pagination state from external source (WASM engine).
 */
export const PAGINATION_UPDATE_META = 'paginationUpdate';

/**
 * Create a transaction that updates the pagination state with WASM results.
 */
export function createPaginationUpdateTransaction(
  state: EditorState,
  result: PaginationResult
): Transaction {
  return state.tr.setMeta(PAGINATION_UPDATE_META, result);
}

/**
 * Update pagination state in an editor view.
 */
export function updatePaginationState(
  view: EditorView,
  result: PaginationResult
): void {
  const tr = createPaginationUpdateTransaction(view.state, result);
  view.dispatch(tr);
}

/**
 * Create the pagination plugin.
 *
 * This plugin operates in "receiver" mode - it receives pagination results
 * from the external WASM engine via transaction metadata and renders them
 * as decorations. It also provides fallback pagination when WASM results
 * are not yet available.
 */
export function createPaginationPlugin(): Plugin {
  return new Plugin({
    key: paginationPluginKey,

    state: {
      init(_, state): PaginationState {
        // Start with fallback calculation
        const pageBreaks = calculateFallbackPageBreaks(state.doc);
        return {
          pageBreaks,
          pageCount: pageBreaks.length + 1,
          currentPage: 1,
          wasmResult: null,
          source: 'fallback',
        };
      },

      apply(tr, prevState, oldState, newState): PaginationState {
        // Check for WASM pagination update
        const wasmResult = tr.getMeta(PAGINATION_UPDATE_META) as PaginationResult | undefined;

        if (wasmResult) {
          // Use WASM result
          const pageBreaks = convertWasmResultToPageBreaks(newState.doc, wasmResult);
          return {
            pageBreaks,
            pageCount: wasmResult.stats.page_count,
            currentPage: getCurrentPage(newState, pageBreaks),
            wasmResult,
            source: 'wasm',
          };
        }

        // If document changed, recalculate with fallback (WASM update will come later)
        if (tr.docChanged) {
          const pageBreaks = calculateFallbackPageBreaks(newState.doc);
          return {
            pageBreaks,
            pageCount: pageBreaks.length + 1,
            currentPage: getCurrentPage(newState, pageBreaks),
            wasmResult: null,
            source: 'fallback',
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
        const pluginState = paginationPluginKey.getState(state);
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
  return paginationPluginKey.getState(state);
}

export { PAGE_METRICS };
