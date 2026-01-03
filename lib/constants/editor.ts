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
