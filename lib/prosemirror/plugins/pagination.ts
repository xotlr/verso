import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import type { PaginationResult, PageIdentifier } from '@/lib/verso/types';
import type { PositionMap } from '@/lib/verso/serializer';
import { getLayoutConstants, DEFAULT_FEATURE_FILM_CONFIG } from '@/lib/verso';

export const paginationPluginKey = new PluginKey<PaginationState>('pagination');

/**
 * Page metrics for standard screenplay format.
 * US Letter: 8.5" x 11"
 * Margins: 1" top, 1" bottom, 1.5" left, 1" right
 * Font: Courier 12pt (10 chars/inch, 6 lines/inch)
 */
const PAGE_METRICS = {
  // Lines per page (standard screenplay - matches WASM engine)
  LINES_PER_PAGE: 52,

  // Approximate characters per line
  CHARS_PER_LINE: 58,

  // Line height in pixels (12pt Courier at 96 DPI = 16px)
  LINE_HEIGHT_PX: 16,

  // Page content height in pixels (9" usable at 96 DPI)
  PAGE_HEIGHT_PX: 864,

  // Minimum lines to keep together for dialogue
  MIN_DIALOGUE_LINES: 2,

  // Minimum lines before page break for character name
  MIN_LINES_BEFORE_BREAK: 3,
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
  linesUsedOnPrevPage: number; // Lines used on previous page (for gap calculation)
  /** Pixel Y position from WASM - exact position for this page */
  pixelY: number;
}

/**
 * Layout stats from WASM (single source of truth for CSS positioning).
 */
export interface WasmLayoutStats {
  lineHeightPx: number;
  pageHeightPx: number;
  pageGapPx: number;
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
  // Layout stats from WASM for CSS positioning
  layoutStats: WasmLayoutStats | null;
  // Track if we're using WASM or fallback calculation
  // 'stale' means we're keeping old page breaks while waiting for WASM
  source: 'wasm' | 'fallback' | 'stale';
}

/**
 * Build a map of element ID (position-based) to document position.
 * This is the fallback when no position map is provided.
 */
function buildElementPositions(doc: ProseMirrorNode): Map<string, number> {
  const elementPositions: Map<string, number> = new Map();
  doc.forEach((node, offset) => {
    // Use position as ID - matches serializeDocument()
    elementPositions.set(offset.toString(), offset);

    // For dual dialogue, also map child positions
    if (node.type.name === 'dual_dialogue') {
      let childOffset = 1; // Start after the dual_dialogue node opening
      node.forEach((column) => {
        if (column.type.name === 'dual_dialogue_column') {
          let innerOffset = 1; // Start after column node opening
          column.forEach((child) => {
            const childId = `${offset}_${childOffset + innerOffset}`;
            elementPositions.set(childId, offset + childOffset + innerOffset);
            innerOffset += child.nodeSize;
          });
        }
        childOffset += column.nodeSize;
      });
    }
  });
  return elementPositions;
}

/**
 * Convert WASM pagination result to page breaks for decoration rendering.
 * This maps element IDs back to document positions.
 * Uses position-based IDs to match the serializer.
 *
 * @param doc - The current document (used as fallback for position mapping)
 * @param result - The WASM pagination result
 * @param positionMap - Optional position map from serialization (preferred, as it matches the WASM result)
 */
function convertWasmResultToPageBreaks(
  doc: ProseMirrorNode,
  result: PaginationResult,
  positionMap?: PositionMap | null
): PageBreak[] {
  const breaks: PageBreak[] = [];

  // Use the provided position map if available (from serialization, matches WASM result).
  // Otherwise fall back to building from current doc (may be stale if doc changed).
  const elementPositions: Map<string, number> = positionMap?.elementToPos
    ? new Map(Array.from(positionMap.elementToPos.entries()).map(([id, range]) => [id, range.from]))
    : buildElementPositions(doc);

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
      linesUsedOnPrevPage: prevPage.lines_used,
      pixelY: page.pixel_y,
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
  if (!identifier || !identifier.type) return '';

  switch (identifier.type) {
    case 'Sequential':
      return String(identifier.value ?? '');
    case 'Inserted':
      return `${identifier.value?.base ?? ''}${identifier.value?.suffix ?? ''}`;
    case 'Omitted':
      return String(identifier.value ?? '');
    default:
      return '';
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
              linesUsedOnPrevPage: currentLineCount,
              pixelY: 0, // Fallback - WASM will provide accurate value
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
          linesUsedOnPrevPage: currentLineCount,
          pixelY: 0, // Fallback - WASM will provide accurate value
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
        linesUsedOnPrevPage: currentLineCount,
        pixelY: 0, // Fallback - WASM will provide accurate value
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
 * Calculate the bottom padding needed to fill the remaining space on a page.
 * This ensures content aligns properly with page frame overlays in discrete mode.
 *
 * The calculation accounts for:
 * 1. Remaining content area on the current page
 * 2. Bottom margin space on current page
 * 3. Top margin space on next page (where page number appears)
 *
 * @param linesUsed - Lines used on the previous page
 * @returns Padding in pixels to add before the gap
 */
function calculatePageBottomPadding(linesUsed: number): number {
  // Get layout constants from WASM config - single source of truth
  const layout = getLayoutConstants(DEFAULT_FEATURE_FILM_CONFIG);

  const LINE_HEIGHT_PX = layout.lineHeightPx;
  const PAGE_TOP_MARGIN = layout.pageMarginTopPx;
  const PAGE_BOTTOM_MARGIN = layout.pageMarginBottomPx;
  const CONTENT_AREA_HEIGHT = layout.pageHeightPx - PAGE_TOP_MARGIN - PAGE_BOTTOM_MARGIN;

  // Content used = lines × line height (using WASM's exact line height)
  const contentUsed = linesUsed * LINE_HEIGHT_PX;

  // Remaining space on this page
  const remainingContentArea = Math.max(0, CONTENT_AREA_HEIGHT - contentUsed);

  // Total padding = remaining content + bottom margin only
  // Note: PAGE_TOP_MARGIN is provided by pm-page-top, not here
  return remainingContentArea + PAGE_BOTTOM_MARGIN;
}

/**
 * Create decorations for page breaks with 3-zone structure:
 * 1. pm-page-bottom - Bottom edge of previous page (fills remaining space)
 * 2. pm-page-gap - Transparent gap between pages (shows editor background)
 * 3. pm-page-top - Top edge of next page with industry-standard page number (top-right)
 */
function createPageBreakDecorations(
  doc: ProseMirrorNode,
  pageBreaks: PageBreak[]
): DecorationSet {
  const decorations: Decoration[] = [];

  // FIRST PAGE TOP MARGIN - Add spacer at document start
  // This provides the 96px top margin for page 1 (same as pages 2+ get from page break decorations)
  // Note: CSS ::before pseudo-elements don't work with ProseMirror's contentEditable
  // Skip if first node is title_page - it handles its own spacing (fills entire first page)
  const firstNode = doc.firstChild;
  const hasTitlePage = firstNode?.type.name === 'title_page';

  if (!hasTitlePage) {
    const firstPageMargin = Decoration.widget(
      0, // Position 0 = start of document
      () => {
        const spacer = document.createElement('div');
        spacer.className = 'pm-first-page-margin';
        return spacer;
      },
      { side: -1 } // Render before content at this position
    );
    decorations.push(firstPageMargin);
  } else {
    // When there's a title page, add page 2 margin and number after it
    // Title page = UI page 1 (no number), first content = UI page 2 (needs "2.")
    const posAfterTitlePage = firstNode.nodeSize;
    const page2Decoration = Decoration.widget(
      posAfterTitlePage,
      () => {
        const container = document.createElement('div');
        container.className = 'pm-page-break-container pm-page-2-break';
        container.contentEditable = 'false';
        container.setAttribute('data-pm-ignore', 'true');

        // Page bottom (title page bottom) - fills remaining space
        const pageBottom = document.createElement('div');
        pageBottom.className = 'pm-page-bottom';
        pageBottom.style.setProperty('--page-bottom-padding', '0px');
        container.appendChild(pageBottom);

        // Gap between pages
        const gap = document.createElement('div');
        gap.className = 'pm-page-gap';
        container.appendChild(gap);

        // Page top with "2." page number
        const pageTop = document.createElement('div');
        pageTop.className = 'pm-page-top';
        const pageNum = document.createElement('span');
        pageNum.className = 'pm-page-number';
        pageNum.textContent = '2.';
        pageTop.appendChild(pageNum);
        container.appendChild(pageTop);

        return container;
      },
      { side: 1 } // Render after title page content
    );
    decorations.push(page2Decoration);
  }

  pageBreaks.forEach((pageBreak) => {
    // Validate position is within document bounds
    if (pageBreak.position < 0 || pageBreak.position > doc.content.size) {
      return;
    }

    // Calculate padding needed to fill remaining page space (for discrete mode alignment)
    const bottomPadding = calculatePageBottomPadding(pageBreak.linesUsedOnPrevPage);

    // Create the 3-zone page break widget
    const pageBreakWidget = Decoration.widget(
      pageBreak.position,
      () => {
        // Outer container - full width block, non-editable
        const container = document.createElement('div');
        container.className = 'pm-page-break-container';
        container.contentEditable = 'false';
        container.setAttribute('data-pm-ignore', 'true');
        container.setAttribute('data-page-number', displayPageIdentifier(pageBreak.pageIdentifier));
        container.setAttribute('data-break-type', pageBreak.type);
        // Store lines used for CSS calculations
        container.setAttribute('data-lines-used', String(pageBreak.linesUsedOnPrevPage));
        // Store WASM pixel position for CSS positioning (single source of truth)
        container.style.setProperty('--wasm-pixel-y', `${pageBreak.pixelY}px`);

        // ---- ZONE 1: PREVIOUS PAGE BOTTOM ----
        // This zone fills the remaining space on the page to ensure alignment
        const pageBottom = document.createElement('div');
        pageBottom.className = 'pm-page-bottom';
        // Set dynamic height to fill remaining page space (used in discrete mode)
        pageBottom.style.setProperty('--page-bottom-padding', `${bottomPadding}px`);

        // MORE indicator for split dialogue (at bottom of previous page)
        if (pageBreak.type === 'dialogue-split' && pageBreak.moreMarker) {
          const more = document.createElement('div');
          more.className = 'pm-more-indicator';
          more.textContent = pageBreak.moreMarker;
          pageBottom.appendChild(more);
        }
        container.appendChild(pageBottom);

        // ---- ZONE 2: GAP BETWEEN PAGES ----
        // Transparent gap - no content, just shows editor background
        const gap = document.createElement('div');
        gap.className = 'pm-page-gap';
        container.appendChild(gap);

        // ---- ZONE 3: NEXT PAGE TOP ----
        // Page number positioned inside the page-top zone (not in frame overlay)
        const pageTop = document.createElement('div');
        pageTop.className = 'pm-page-top';

        // Calculate UI page number (WASM doesn't know about title page)
        // If title page exists, add 1 to WASM page number
        const uiPageNumber = hasTitlePage ? pageBreak.pageNumber + 1 : pageBreak.pageNumber;

        // Add page number for UI page 2+ (page 1 = title page or first content page, no number)
        if (uiPageNumber >= 2) {
          const pageNum = document.createElement('span');
          pageNum.className = 'pm-page-number';
          pageNum.textContent = `${uiPageNumber}.`;
          pageTop.appendChild(pageNum);
        }

        // CONT'D indicator (at top of next page)
        if (pageBreak.type === 'dialogue-split' && pageBreak.contdMarker) {
          const contd = document.createElement('div');
          contd.className = 'pm-contd-indicator';
          contd.textContent = pageBreak.contdMarker;
          pageTop.appendChild(contd);
        } else if (pageBreak.type === 'dialogue-split' && pageBreak.characterName) {
          const contd = document.createElement('div');
          contd.className = 'pm-contd-indicator';
          contd.textContent = `${pageBreak.characterName} (CONT'D)`;
          pageTop.appendChild(contd);
        }
        container.appendChild(pageTop);

        return container;
      },
      { side: -1 }
    );

    decorations.push(pageBreakWidget);
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
 * Payload for WASM pagination update.
 */
interface PaginationUpdatePayload {
  result: PaginationResult;
  positionMap?: PositionMap | null;
}

/**
 * Create a transaction that updates the pagination state with WASM results.
 */
export function createPaginationUpdateTransaction(
  state: EditorState,
  result: PaginationResult,
  positionMap?: PositionMap | null
): Transaction {
  const payload: PaginationUpdatePayload = { result, positionMap };
  return state.tr.setMeta(PAGINATION_UPDATE_META, payload);
}

/**
 * Update pagination state in an editor view.
 *
 * @param view - The ProseMirror editor view
 * @param result - The WASM pagination result
 * @param positionMap - Optional position map from serialization (ensures element IDs match)
 */
export function updatePaginationState(
  view: EditorView,
  result: PaginationResult,
  positionMap?: PositionMap | null
): void {
  const tr = createPaginationUpdateTransaction(view.state, result, positionMap);
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
          layoutStats: null,
          source: 'fallback',
        };
      },

      apply(tr, prevState, oldState, newState): PaginationState {
        // Check for WASM pagination update
        const wasmPayload = tr.getMeta(PAGINATION_UPDATE_META) as PaginationUpdatePayload | undefined;

        if (wasmPayload) {
          // Use WASM result with position map from serialization
          const { result: wasmResult, positionMap } = wasmPayload;
          const pageBreaks = convertWasmResultToPageBreaks(newState.doc, wasmResult, positionMap);

          // Extract layout stats from WASM (single source of truth)
          const layoutStats: WasmLayoutStats | null = wasmResult.stats.line_height_px != null ? {
            lineHeightPx: wasmResult.stats.line_height_px,
            pageHeightPx: wasmResult.stats.page_height_px ?? 1056,
            pageGapPx: wasmResult.stats.page_gap_px ?? 40,
          } : null;

          return {
            pageBreaks,
            pageCount: wasmResult.stats.page_count,
            currentPage: getCurrentPage(newState, pageBreaks),
            wasmResult,
            layoutStats,
            source: 'wasm',
          };
        }

        // If document changed, keep previous page breaks (stale but fast)
        // WASM will update with accurate results shortly
        // Only recalculate fallback on first load (when we have no page breaks)
        if (tr.docChanged) {
          if (prevState.pageBreaks.length === 0) {
            // First calculation - use fallback
            const pageBreaks = calculateFallbackPageBreaks(newState.doc);
            return {
              pageBreaks,
              pageCount: pageBreaks.length + 1,
              currentPage: getCurrentPage(newState, pageBreaks),
              wasmResult: null,
              layoutStats: null,
              source: 'fallback',
            };
          }
          // Keep stale page breaks - WASM will update shortly
          return {
            ...prevState,
            wasmResult: null,
            source: 'stale',
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
