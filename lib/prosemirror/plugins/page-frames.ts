/**
 * Page Frames Plugin
 *
 * Manages visual page frame data for discrete page view.
 * Works alongside the pagination plugin to provide frame positions.
 */

import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import type { PageIdentifier, PaginationResult } from '@/lib/verso/types';
import { PAGE_HEIGHT_PX } from '@/lib/constants';

export const pageFramesPluginKey = new PluginKey<PageFramesState>('pageFrames');

/** Gap between pages in pixels */
export const PAGE_GAP_PX = 32;

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
}

/** Meta key for updating page frames from WASM results */
export const PAGE_FRAMES_UPDATE_META = 'pageFramesUpdate';

/** Meta key for toggling discrete mode */
export const DISCRETE_MODE_META = 'discreteMode';

/**
 * Convert WASM pagination result to page frames
 */
export function createPageFramesFromWasm(
  result: PaginationResult
): PageFrame[] {
  const frames: PageFrame[] = [];

  for (let i = 0; i < result.pages.length; i++) {
    const page = result.pages[i];
    const prevPage = i > 0 ? result.pages[i - 1] : null;

    // Calculate Y offset: page height + gap for each previous page
    const yOffset = i * (PAGE_HEIGHT_PX + PAGE_GAP_PX);

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
  switch (identifier.type) {
    case 'Sequential':
      return String(identifier.value);
    case 'Inserted':
      return `${identifier.value.base}${identifier.value.suffix}`;
    case 'Omitted':
      return String(identifier.value);
  }
}

/**
 * Calculate total document height with page gaps
 */
function calculateTotalHeight(pageCount: number): number {
  if (pageCount === 0) return PAGE_HEIGHT_PX;
  return pageCount * PAGE_HEIGHT_PX + (pageCount - 1) * PAGE_GAP_PX;
}

/**
 * Create the page frames plugin
 */
export function createPageFramesPlugin(initialDiscreteMode = true): Plugin {
  return new Plugin({
    key: pageFramesPluginKey,

    state: {
      init(): PageFramesState {
        // Start with a single page frame
        return {
          frames: [{
            pageNumber: 1,
            pageIdentifier: { type: 'Sequential', value: 1 },
            yOffset: 0,
            hasMoreMarker: false,
          }],
          discreteMode: initialDiscreteMode,
          totalHeight: PAGE_HEIGHT_PX,
        };
      },

      apply(tr, prevState): PageFramesState {
        // Check for WASM pagination update
        const wasmResult = tr.getMeta(PAGE_FRAMES_UPDATE_META) as PaginationResult | undefined;

        if (wasmResult) {
          const frames = createPageFramesFromWasm(wasmResult);
          return {
            ...prevState,
            frames,
            totalHeight: calculateTotalHeight(frames.length),
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
