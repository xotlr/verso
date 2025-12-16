/**
 * Page Frames Plugin
 *
 * Manages visual page frame data for discrete page view.
 * Works alongside the pagination plugin to provide frame positions.
 *
 * WASM is the single source of truth for all layout values.
 * Hardcoded constants are FALLBACKS only (used before WASM loads).
 */

import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import type { PageIdentifier, PaginationResult, LayoutMetadata } from '@/lib/verso/types';
import { PAGE_HEIGHT_PX } from '@/lib/constants';

export const pageFramesPluginKey = new PluginKey<PageFramesState>('pageFrames');

/**
 * Gap between pages in pixels.
 * @deprecated Use WASM layout.page_gap_px instead. This is a FALLBACK only.
 */
export const PAGE_GAP_PX = 40;

/**
 * Represents a single page frame for rendering
 */
export interface PageFrame {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Full page identifier for A-pages etc. */
  pageIdentifier: PageIdentifier;
  /** Y offset from document top in pixels */
  yOffset: number;
  /** Whether this page has MORE marker at bottom */
  hasMoreMarker: boolean;
  /** CONT'D marker text if any */
  contdText?: string;
  /** Character name for split dialogue */
  characterName?: string;
  /** Whether this is the first page (should not show page number) */
  isFirstPage?: boolean;
}

/**
 * State managed by the page frames plugin
 */
export interface PageFramesState {
  /** Array of page frames to render */
  frames: PageFrame[];
  /** Whether discrete page mode is enabled */
  discreteMode: boolean;
  /** Total document height with gaps */
  totalHeight: number;
  /** Layout metadata from WASM (single source of truth) */
  layoutMetadata: LayoutMetadata | null;
}

/** Meta key for updating page frames from WASM results */
export const PAGE_FRAMES_UPDATE_META = 'pageFramesUpdate';

/** Meta key for toggling discrete mode */
export const DISCRETE_MODE_META = 'discreteMode';

/**
 * Convert WASM pagination result to page frames
 *
 * WASM is now the single source of truth for all positioning.
 * - `pixel_y` values are absolute content start positions
 * - Layout metadata provides margins and offsets
 * - Title page (if present) is included as pages[0] with pixel_y: 0
 */
export function createPageFramesFromWasm(
  result: PaginationResult
): PageFrame[] {
  const frames: PageFrame[] = [];

  // Get layout metadata from WASM (single source of truth)
  const layout = result.stats.layout;
  const topMargin = layout?.top_margin_px ?? 96;

  for (let i = 0; i < result.pages.length; i++) {
    const page = result.pages[i];
    const prevPage = i > 0 ? result.pages[i - 1] : null;

    // Determine frame position from WASM's pixel_y:
    // - Title page (no elements, pixel_y = 0): frame at pixel_y
    // - Content pages: frame at pixel_y - top_margin (frame starts before content)
    const isTitlePage = page.elements.length === 0 && page.pixel_y === 0;
    const yOffset = isTitlePage ? page.pixel_y : page.pixel_y - topMargin;

    // Check for MORE/CONT'D markers
    const hasMoreMarker = !!prevPage?.bottom_continuation;

    let contdText: string | undefined;
    let characterName: string | undefined;

    // Get first element on page to check for continuation
    if (page.elements.length > 0) {
      const firstElement = page.elements[0];
      if (firstElement.is_continuation && firstElement.continuation_prefix) {
        contdText = firstElement.continuation_prefix;
        // Extract character name from "JOHN (CONT'D)"
        const match = firstElement.continuation_prefix.match(/^([A-Z][A-Z\s]+)/);
        if (match) {
          characterName = match[1].trim();
        }
      }
    }

    frames.push({
      pageNumber: getPageNumber(page.identifier),
      pageIdentifier: page.identifier,
      yOffset,
      hasMoreMarker,
      contdText,
      characterName,
      isFirstPage: isTitlePage || i === 0,  // Title page or first content page
    });
  }

  return frames;
}

/**
 * Extract numeric page number from PageIdentifier
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
 * Get display string for page identifier (e.g., "47", "47A")
 */
export function displayPageIdentifier(identifier: PageIdentifier): string {
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
 * Calculate total document height with page gaps
 * Uses WASM layout values when available (single source of truth)
 */
function calculateTotalHeight(pageCount: number, layout: LayoutMetadata | null): number {
  const pageHeight = layout?.page_height_px ?? PAGE_HEIGHT_PX;
  const pageGap = layout?.page_gap_px ?? PAGE_GAP_PX;

  if (pageCount === 0) return pageHeight;
  return pageCount * pageHeight + (pageCount - 1) * pageGap;
}

/**
 * Create the page frames plugin
 */
export function createPageFramesPlugin(initialDiscreteMode = true): Plugin {
  return new Plugin({
    key: pageFramesPluginKey,

    state: {
      init(): PageFramesState {
        // Start with a single page frame (using fallback values before WASM loads)
        return {
          frames: [{
            pageNumber: 1,
            pageIdentifier: { type: 'Sequential', value: 1 },
            yOffset: 0,
            hasMoreMarker: false,
          }],
          discreteMode: initialDiscreteMode,
          totalHeight: PAGE_HEIGHT_PX, // Fallback - WASM will update
          layoutMetadata: null, // Will be set when WASM result arrives
        };
      },

      apply(tr, prevState): PageFramesState {
        // Check for WASM pagination update
        const wasmResult = tr.getMeta(PAGE_FRAMES_UPDATE_META) as PaginationResult | undefined;

        if (wasmResult) {
          const frames = createPageFramesFromWasm(wasmResult);
          const layout = wasmResult.stats.layout ?? null;
          return {
            ...prevState,
            frames,
            totalHeight: calculateTotalHeight(frames.length, layout),
            layoutMetadata: layout,
          };
        }

        // Check for discrete mode toggle
        const discreteMode = tr.getMeta(DISCRETE_MODE_META);
        if (discreteMode !== undefined) {
          return {
            ...prevState,
            discreteMode,
          };
        }

        return prevState;
      },
    },
  });
}

/**
 * Get page frames state from editor state
 */
export function getPageFramesState(state: EditorState): PageFramesState | undefined {
  return pageFramesPluginKey.getState(state);
}
