/**
 * Editor timing and threshold constants
 */

/** Debounce timings for editor operations (ms) */
export const EDITOR_DEBOUNCE = {
  /** Stats calculation (word count, page count) */
  STATS: 300,
  /** Content serialization for parent notification */
  CONTENT_UPDATE: 150,
  /** Scene/character extraction */
  EXTRACTION: 300,
  /** Default pagination trigger */
  PAGINATION: 150,
} as const;

/** Pagination throttle thresholds based on document size */
export const PAGINATION_THROTTLE = {
  /** Element count threshold for "large" document (~20+ pages) */
  LARGE_DOC_THRESHOLD: 100,
  /** Element count threshold for "very large" document (~100+ pages) */
  VERY_LARGE_DOC_THRESHOLD: 500,
  /** Throttle interval for large docs (ms) */
  LARGE_INTERVAL: 300,
  /** Throttle interval for very large docs (ms) - reduced from 1000ms for better responsiveness */
  VERY_LARGE_INTERVAL: 300,
} as const;

/** Responsive layout values */
export const EDITOR_LAYOUT = {
  /** Mobile horizontal padding (px) */
  MOBILE_PADDING: 32,
  /** Desktop horizontal padding (px) */
  DESKTOP_PADDING: 96,
  /** Buffer pages for virtualization */
  VIRTUALIZATION_BUFFER: 3,
  /** Minimum pages to enable virtualization */
  VIRTUALIZATION_THRESHOLD: 10,
} as const;

/** Revision color CSS classes */
export const REVISION_COLOR_CLASSES: Record<string, string> = {
  white: 'bg-card border-2 border-border',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
  yellow: 'bg-yellow-300',
  green: 'bg-green-400',
  goldenrod: 'bg-yellow-600',
  buff: 'bg-orange-200',
  salmon: 'bg-orange-300',
  cherry: 'bg-red-400',
} as const;

/**
 * Page metrics for standard screenplay format.
 * US Letter: 8.5" x 11"
 * Margins: 1" top, 1" bottom, 1.5" left, 1" right
 * Font: Courier 12pt (10 chars/inch, 6 lines/inch)
 */
export const PAGE_METRICS = {
  /** Lines per page (standard screenplay - matches WASM engine) */
  LINES_PER_PAGE: 52,
  /** Approximate characters per line */
  CHARS_PER_LINE: 58,
  /** Line height in pixels (12pt Courier at 96 DPI = 16px) */
  LINE_HEIGHT_PX: 16,
  /** Page content height in pixels (9" usable at 96 DPI) */
  PAGE_HEIGHT_PX: 864,
  /** Minimum lines to keep together for dialogue */
  MIN_DIALOGUE_LINES: 2,
  /** Minimum lines before page break for character name */
  MIN_LINES_BEFORE_BREAK: 3,
} as const;

/**
 * Z-index scale for consistent layering.
 * Use these instead of arbitrary z-* values in components.
 */
export const Z_INDEX = {
  /** Sticky headers, toolbars */
  STICKY: 10,
  /** Fixed position overlays within content */
  OVERLAY: 20,
  /** Floating elements, popovers */
  POPOVER: 40,
  /** Dropdowns, menus */
  DROPDOWN: 50,
  /** Modals, dialogs */
  MODAL: 60,
  /** Drawers (higher than modal for mobile UX) */
  DRAWER: 60,
  /** Toast notifications */
  TOAST: 70,
  /** Tooltips (highest - should always be visible) */
  TOOLTIP: 80,
} as const;
