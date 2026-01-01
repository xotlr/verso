import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import type { PaginationResult, PageIdentifier, ElementPosition } from '@/lib/verso/types';
import type { PositionMap } from '@/lib/verso/serializer';

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
  /** Bottom padding from WASM - exact height for pm-page-bottom decoration
   * WASM is single source of truth - TypeScript uses this value directly */
  bottomPaddingPx: number;
  // Scene-level continuation markers (shooting script feature)
  /** Scene continuation marker at bottom of previous page (e.g., "(CONTINUED)") */
  sceneContinuedBottom?: string;
  /** Scene continuation marker at top of this page (e.g., "CONTINUED:") */
  sceneContinuedTop?: string;
  /** The scene number being continued (for markers like "CONTINUED: (42)") */
  continuedSceneNumber?: number;
}

/**
 * Layout stats from WASM (single source of truth for CSS positioning).
 */
export interface WasmLayoutStats {
  lineHeightPx: number;
  pageHeightPx: number;
  pageGapPx: number;
  topMarginPx: number;
  bottomMarginPx: number;
  contentAreaPx: number;
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
      // WASM is single source of truth for bottom padding
      bottomPaddingPx: prevPage.bottom_padding_px,
      // Scene-level continuation markers from WASM
      sceneContinuedBottom: prevPage.scene_continued_bottom,
      sceneContinuedTop: page.scene_continued_top,
      continuedSceneNumber: page.continued_scene_number,
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
              bottomPaddingPx: 0, // Fallback - WASM will provide accurate value
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
          bottomPaddingPx: 0, // Fallback - WASM will provide accurate value
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
        bottomPaddingPx: 0, // Fallback - WASM will provide accurate value
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
 * Create decorations for page breaks with 3-zone structure:
 * 1. pm-page-bottom - Bottom edge of previous page (fills remaining space)
 * 2. pm-page-gap - Transparent gap between pages (shows editor background)
 * 3. pm-page-top - Top edge of next page with industry-standard page number (top-right)
 *
 * Also creates node decorations for element height quantization - forcing each
 * element to its exact WASM-calculated height to prevent subpixel drift.
 *
 * @param doc - The document
 * @param pageBreaks - Page breaks from WASM
 * @param layoutStats - Layout stats from WASM (single source of truth for positioning)
 * @param elementPositions - Element positions with height_px from WASM
 */
function createPageBreakDecorations(
  doc: ProseMirrorNode,
  pageBreaks: PageBreak[],
  layoutStats: WasmLayoutStats | null,
  elementPositions: Record<string, ElementPosition> | null
): DecorationSet {
  const decorations: Decoration[] = [];

  // Get layout values from WASM (single source of truth)
  // These are used DIRECTLY on elements, not via CSS variables
  const pageGap = layoutStats?.pageGapPx ?? 40;
  const topMargin = layoutStats?.topMarginPx ?? 96;

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
        spacer.style.height = `${topMargin}px`;  // Direct from WASM, not CSS variable
        return spacer;
      },
      { side: -1 } // Render before content at this position
    );
    decorations.push(firstPageMargin);
  } else {
    // When there's a title page, add page 2 margin and number after it
    // Title page = UI page 1 (no number), first content = UI page 2 (needs "2.")
    // NOTE: Title page CSS sets height: var(--wasm-page-height), so it already
    // occupies the full page height. We DON'T need bottomPadding here - just gap + top.
    const posAfterTitlePage = firstNode.nodeSize;
    const page2Decoration = Decoration.widget(
      posAfterTitlePage,
      () => {
        const container = document.createElement('div');
        container.className = 'pm-page-break-container pm-page-2-break';
        container.contentEditable = 'false';
        container.setAttribute('data-pm-ignore', 'true');

        // Page bottom - 0px because title page CSS already fills the page
        const pageBottom = document.createElement('div');
        pageBottom.className = 'pm-page-bottom';
        pageBottom.style.setProperty('height', '0px', 'important');  // Title page CSS handles full page
        container.appendChild(pageBottom);

        // Gap between pages - WASM is single source of truth
        const gap = document.createElement('div');
        gap.className = 'pm-page-gap';
        gap.style.setProperty('height', `${pageGap}px`, 'important');  // Direct from WASM
        container.appendChild(gap);

        // Page top with "2." page number - WASM is single source of truth
        const pageTop = document.createElement('div');
        pageTop.className = 'pm-page-top';
        pageTop.style.setProperty('height', `${topMargin}px`, 'important');  // Direct from WASM
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

  // When there's a title page, skip pageBreaks[0] because pm-page-2-break
  // handles the same position (posAfterTitlePage). pm-page-2-break uses
  // pageBreaks[0].bottomPaddingPx for the WASM-calculated bottom padding.
  const startIndex = hasTitlePage ? 1 : 0;

  for (let i = startIndex; i < pageBreaks.length; i++) {
    const pageBreak = pageBreaks[i];

    // Validate position is within document bounds
    if (pageBreak.position < 0 || pageBreak.position > doc.content.size) {
      continue;
    }

    // Use WASM's bottomPaddingPx directly - single source of truth
    const bottomPadding = pageBreak.bottomPaddingPx;

    // Create the 3-zone page break widget
    const pageBreakWidget = Decoration.widget(
      pageBreak.position,
      () => {
        // Outer container - full width block, non-editable
        // Decoration heights (set by WASM) create gaps in document flow
        const container = document.createElement('div');
        container.className = 'pm-page-break-container';
        container.contentEditable = 'false';
        container.setAttribute('data-pm-ignore', 'true');
        container.setAttribute('data-page-number', displayPageIdentifier(pageBreak.pageIdentifier));
        container.setAttribute('data-break-type', pageBreak.type);
        // Store WASM pixel position for debugging
        container.style.setProperty('--wasm-pixel-y', `${pageBreak.pixelY}px`);
        container.style.setProperty('--wasm-bottom-padding', `${bottomPadding}px`);

        // ---- ZONE 1: PREVIOUS PAGE BOTTOM ----
        // This zone fills the remaining space on the page - WASM is single source of truth
        const pageBottom = document.createElement('div');
        pageBottom.className = 'pm-page-bottom';
        // Set height directly from WASM with !important to guarantee CSS override
        pageBottom.style.setProperty('height', `${bottomPadding}px`, 'important');

        // MORE indicator for split dialogue (at bottom of previous page)
        if (pageBreak.type === 'dialogue-split' && pageBreak.moreMarker) {
          const more = document.createElement('div');
          more.className = 'pm-more-indicator';
          more.textContent = pageBreak.moreMarker;
          pageBottom.appendChild(more);
        }

        // Scene continuation marker at bottom of previous page (shooting script feature)
        if (pageBreak.sceneContinuedBottom) {
          const sceneCont = document.createElement('div');
          sceneCont.className = 'pm-scene-continued-bottom';
          sceneCont.textContent = pageBreak.sceneContinuedBottom;
          pageBottom.appendChild(sceneCont);
        }
        container.appendChild(pageBottom);

        // ---- ZONE 2: GAP BETWEEN PAGES ----
        // Transparent gap - WASM is single source of truth for height
        const gap = document.createElement('div');
        gap.className = 'pm-page-gap';
        gap.style.setProperty('height', `${pageGap}px`, 'important');  // Direct from WASM with !important
        container.appendChild(gap);

        // ---- ZONE 3: NEXT PAGE TOP ----
        // Page number positioned inside the page-top zone - WASM is single source of truth
        const pageTop = document.createElement('div');
        pageTop.className = 'pm-page-top';
        pageTop.style.setProperty('height', `${topMargin}px`, 'important');  // Direct from WASM with !important

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

        // Scene continuation marker at top of next page (shooting script feature)
        if (pageBreak.sceneContinuedTop) {
          const sceneCont = document.createElement('div');
          sceneCont.className = 'pm-scene-continued-top';
          sceneCont.textContent = pageBreak.sceneContinuedTop;
          pageTop.appendChild(sceneCont);
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
  }

  // ---- ELEMENT HEIGHT QUANTIZATION ----
  // Create node decorations that force each element to its exact WASM-calculated height.
  // This contains subpixel font rendering drift within each element's boundaries.
  if (elementPositions) {
    // Screenplay element types that need height quantization
    const quantizedTypes = new Set([
      'scene_heading', 'action', 'character', 'dialogue',
      'parenthetical', 'transition', 'shot', 'ending'
    ]);

    doc.forEach((node, offset) => {
      // Skip non-quantized types (title_page, dual_dialogue handled separately)
      if (!quantizedTypes.has(node.type.name)) return;

      // Element ID is the string position (matches serializer)
      const elementId = offset.toString();
      const position = elementPositions[elementId];

      if (position && position.height_px > 0 && !position.is_split) {
        // Create node decoration with exact height from WASM
        const heightDecoration = Decoration.node(offset, offset + node.nodeSize, {
          style: `height: ${position.height_px}px !important; overflow: hidden;`,
          class: 'pm-quantized-height'
        });
        decorations.push(heightDecoration);
      }
    });
  }

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
          // Prefer stats.layout (full LayoutMetadata) over deprecated individual fields
          const layoutStats: WasmLayoutStats | null = wasmResult.stats.layout ? {
            lineHeightPx: wasmResult.stats.layout.line_height_px,
            pageHeightPx: wasmResult.stats.layout.page_height_px,
            pageGapPx: wasmResult.stats.layout.page_gap_px,
            topMarginPx: wasmResult.stats.layout.top_margin_px,
            bottomMarginPx: wasmResult.stats.layout.bottom_margin_px,
            contentAreaPx: wasmResult.stats.layout.content_area_px,
          } : wasmResult.stats.line_height_px != null ? {
            // Fallback to deprecated individual fields
            lineHeightPx: wasmResult.stats.line_height_px,
            pageHeightPx: wasmResult.stats.page_height_px ?? 1056,
            pageGapPx: wasmResult.stats.page_gap_px ?? 40,
            topMarginPx: 96, // Fallback
            bottomMarginPx: 48, // Fallback
            contentAreaPx: 864, // Fallback
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

        // If document changed, map previous page break positions through the transaction
        // This keeps decorations at sensible positions while waiting for WASM
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
          // Map page break positions through the transaction to keep them valid
          // This prevents decorations from jumping to wrong positions during WASM update
          const mappedBreaks = prevState.pageBreaks.map(pb => ({
            ...pb,
            position: tr.mapping.map(pb.position),
          })).filter(pb => pb.position >= 0 && pb.position <= newState.doc.content.size);

          return {
            ...prevState,
            pageBreaks: mappedBreaks,
            // Keep wasmResult for height quantization - only page breaks are stale
            // Clearing this caused visual "breathing" as elements lost their heights
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

        // Pass element_positions from WASM result for height quantization
        const elementPositions = pluginState.wasmResult?.element_positions ?? null;
        return createPageBreakDecorations(state.doc, pluginState.pageBreaks, pluginState.layoutStats, elementPositions);
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
