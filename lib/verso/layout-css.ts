/**
 * WASM Config to CSS Variables Converter
 *
 * This module bridges the gap between WASM pagination config and CSS rendering.
 * WASM config is the single source of truth for all layout calculations.
 * CSS variables are derived from this config at runtime.
 */

import type { PageConfig } from './types';

// Standard screen DPI for pixel calculations
const DPI = 96;
// Convert points to pixels at 96 DPI (1pt = 1/72in, at 96 DPI = 96/72 = 1.333px)
const PT_TO_PX = DPI / 72;

/**
 * Layout values converted to CSS-ready strings
 */
export interface LayoutCSS {
  // Page dimensions
  pageWidth: string;
  pageHeight: string;
  contentWidth: string;

  // Page margins
  pageMarginTop: string;
  pageMarginBottom: string;
  pageMarginLeft: string;
  pageMarginRight: string;

  // Typography
  lineHeight: string;
  fontSize: string;

  // Element margins (left indentation from content edge)
  sceneHeadingMarginLeft: string;
  actionMarginLeft: string;
  characterMarginLeft: string;
  dialogueMarginLeft: string;
  dialogueMarginRight: string;
  parentheticalMarginLeft: string;
  parentheticalMarginRight: string;
  transitionMarginLeft: string;

  // Element widths (based on max_chars_per_line × char width)
  sceneHeadingWidth: string;
  actionWidth: string;
  characterWidth: string;
  dialogueWidth: string;
  parentheticalWidth: string;
  transitionWidth: string;

  // Spacing (space_before converted to padding-top)
  sceneHeadingSpaceBefore: string;
  actionSpaceBefore: string;
  characterSpaceBefore: string;
  transitionSpaceBefore: string;
}

/**
 * Convert WASM PageConfig to CSS-ready layout values
 */
export function configToCSS(config: PageConfig): LayoutCSS {
  const es = config.element_styles;
  const charWidthPx = config.char_width_pt * PT_TO_PX;
  const lineHeightPx = config.line_height_pt * PT_TO_PX;

  // Page dimensions (US Letter: 8.5" × 11")
  const pageWidthIn = config.paper_size === 'us_letter' ? 8.5 : 8.27; // A4 is 210mm ≈ 8.27"
  const pageHeightIn = config.paper_size === 'us_letter' ? 11 : 11.69; // A4 is 297mm ≈ 11.69"

  // Content area width = page width - left margin - right margin
  const contentWidthIn = pageWidthIn - config.margins.left - config.margins.right;

  return {
    // Page dimensions
    pageWidth: `${pageWidthIn * DPI}px`,
    pageHeight: `${pageHeightIn * DPI}px`,
    contentWidth: `${contentWidthIn * DPI}px`,

    // Page margins
    pageMarginTop: `${config.margins.top * DPI}px`,
    pageMarginBottom: `${config.margins.bottom * DPI}px`,
    pageMarginLeft: `${config.margins.left * DPI}px`,
    pageMarginRight: `${config.margins.right * DPI}px`,

    // Typography
    lineHeight: `${lineHeightPx}px`,
    fontSize: `${lineHeightPx}px`,

    // Element margins (inches to pixels)
    sceneHeadingMarginLeft: `${es.scene_heading.margin_left * DPI}px`,
    actionMarginLeft: `${es.action.margin_left * DPI}px`,
    characterMarginLeft: `${es.character.margin_left * DPI}px`,
    dialogueMarginLeft: `${es.dialogue.margin_left * DPI}px`,
    dialogueMarginRight: `${es.dialogue.margin_right * DPI}px`,
    parentheticalMarginLeft: `${es.parenthetical.margin_left * DPI}px`,
    parentheticalMarginRight: `${es.parenthetical.margin_right * DPI}px`,
    transitionMarginLeft: `${es.transition.margin_left * DPI}px`,

    // Element widths (chars × char width in pixels)
    sceneHeadingWidth: `${es.scene_heading.max_chars_per_line * charWidthPx}px`,
    actionWidth: `${es.action.max_chars_per_line * charWidthPx}px`,
    characterWidth: `${es.character.max_chars_per_line * charWidthPx}px`,
    dialogueWidth: `${es.dialogue.max_chars_per_line * charWidthPx}px`,
    parentheticalWidth: `${es.parenthetical.max_chars_per_line * charWidthPx}px`,
    transitionWidth: `${es.transition.max_chars_per_line * charWidthPx}px`,

    // Spacing (lines × line height = pixels)
    sceneHeadingSpaceBefore: `${es.scene_heading.space_before * lineHeightPx}px`,
    actionSpaceBefore: `${es.action.space_before * lineHeightPx}px`,
    characterSpaceBefore: `${es.character.space_before * lineHeightPx}px`,
    transitionSpaceBefore: `${es.transition.space_before * lineHeightPx}px`,
  };
}

/**
 * Apply WASM config as CSS custom properties on document root.
 * Call this when the editor initializes or when format changes.
 */
export function applyLayoutCSS(config: PageConfig): void {
  if (typeof document === 'undefined') return; // SSR guard

  const css = configToCSS(config);
  const root = document.documentElement;

  // Page dimensions
  root.style.setProperty('--pm-page-width', css.pageWidth);
  root.style.setProperty('--pm-page-height', css.pageHeight);
  root.style.setProperty('--pm-content-width', css.contentWidth);

  // Page margins
  root.style.setProperty('--pm-page-padding-top', css.pageMarginTop);
  root.style.setProperty('--pm-page-padding-bottom', css.pageMarginBottom);
  root.style.setProperty('--pm-page-padding-left', css.pageMarginLeft);
  root.style.setProperty('--pm-page-padding-right', css.pageMarginRight);

  // Typography
  root.style.setProperty('--pm-line-height', css.lineHeight);
  root.style.setProperty('--pm-font-size', css.fontSize);

  // Element margins
  root.style.setProperty('--pm-margin-scene-heading', css.sceneHeadingMarginLeft);
  root.style.setProperty('--pm-margin-action', css.actionMarginLeft);
  root.style.setProperty('--pm-margin-character', css.characterMarginLeft);
  root.style.setProperty('--pm-margin-dialogue-left', css.dialogueMarginLeft);
  root.style.setProperty('--pm-margin-dialogue-right', css.dialogueMarginRight);
  root.style.setProperty('--pm-margin-parenthetical-left', css.parentheticalMarginLeft);
  root.style.setProperty('--pm-margin-parenthetical-right', css.parentheticalMarginRight);
  root.style.setProperty('--pm-margin-transition', css.transitionMarginLeft);

  // Element widths
  root.style.setProperty('--pm-width-scene-heading', css.sceneHeadingWidth);
  root.style.setProperty('--pm-width-action', css.actionWidth);
  root.style.setProperty('--pm-width-character', css.characterWidth);
  root.style.setProperty('--pm-width-dialogue', css.dialogueWidth);
  root.style.setProperty('--pm-width-parenthetical', css.parentheticalWidth);
  root.style.setProperty('--pm-width-transition', css.transitionWidth);

  // Element spacing (space_before as padding-top)
  root.style.setProperty('--pm-space-scene-heading', css.sceneHeadingSpaceBefore);
  root.style.setProperty('--pm-space-action', css.actionSpaceBefore);
  root.style.setProperty('--pm-space-character', css.characterSpaceBefore);
  root.style.setProperty('--pm-space-transition', css.transitionSpaceBefore);
}

/**
 * Get layout constants for use in TypeScript code (e.g., pagination.ts)
 * Returns numeric values in pixels for calculations.
 */
export function getLayoutConstants(config: PageConfig) {
  return {
    DPI,
    PT_TO_PX,
    pageWidthPx: config.paper_size === 'us_letter' ? 8.5 * DPI : 8.27 * DPI,
    pageHeightPx: config.paper_size === 'us_letter' ? 11 * DPI : 11.69 * DPI,
    pageMarginTopPx: config.margins.top * DPI,
    pageMarginBottomPx: config.margins.bottom * DPI,
    pageMarginLeftPx: config.margins.left * DPI,
    pageMarginRightPx: config.margins.right * DPI,
    lineHeightPx: config.line_height_pt * PT_TO_PX,
    charWidthPx: config.char_width_pt * PT_TO_PX,
    linesPerPage: config.lines_per_page,
  };
}

/**
 * Apply WASM LayoutMetadata as CSS custom properties.
 *
 * This is the DYNAMIC counterpart to applyLayoutCSS() which sets config-derived values.
 * LayoutMetadata comes from actual pagination results and is the SINGLE SOURCE OF TRUTH
 * for all positioning calculations.
 *
 * Call this after EACH pagination result to ensure CSS matches WASM calculations exactly.
 *
 * @param layout - LayoutMetadata from PaginationResult.stats.layout
 */
export function applyLayoutMetadataCSS(layout: {
  page_height_px: number;
  page_gap_px: number;
  top_margin_px: number;
  bottom_margin_px: number;
  line_height_px: number;
  content_area_px: number;
  title_page_offset_px: number;
  has_title_page: boolean;
}): void {
  if (typeof document === 'undefined') return; // SSR guard

  const root = document.documentElement;

  // WASM-calculated values (single source of truth for positioning)
  root.style.setProperty('--wasm-page-height', `${layout.page_height_px}px`);
  root.style.setProperty('--wasm-page-gap', `${layout.page_gap_px}px`);
  root.style.setProperty('--wasm-top-margin', `${layout.top_margin_px}px`);
  root.style.setProperty('--wasm-bottom-margin', `${layout.bottom_margin_px}px`);
  root.style.setProperty('--wasm-line-height', `${layout.line_height_px}px`);
  root.style.setProperty('--wasm-content-area', `${layout.content_area_px}px`);
  root.style.setProperty('--wasm-title-page-offset', `${layout.title_page_offset_px}px`);

  // Title page content positioning (WGA standard: title ~40% down = 4.4" = 422px at 96 DPI)
  // TODO: Move this to WASM PageConfig for format profile customization
  const titlePageContentTop = 422; // 4.4" × 96 DPI
  root.style.setProperty('--wasm-title-page-content-top', `${titlePageContentTop}px`);

  // Derived values for convenience
  root.style.setProperty('--wasm-page-with-gap', `${layout.page_height_px + layout.page_gap_px}px`);

  // Boolean as CSS custom property (for conditional styling)
  root.style.setProperty('--wasm-has-title-page', layout.has_title_page ? '1' : '0');
}
