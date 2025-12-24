/**
 * Verso Pagination Engine TypeScript Types
 *
 * These types mirror the Rust types in the pagination engine
 * to ensure type safety across the WASM boundary.
 */

// ============================================================================
// Element Types
// ============================================================================

export type ElementType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'shot'
  | 'super'
  | 'chyron'
  | 'flashback'
  | 'montage'
  | 'intercut'
  | 'dual_dialogue_left'
  | 'dual_dialogue_right'
  | 'act_break'
  | 'page_break'
  | 'blank_line';

export type DualDialoguePosition = 'left' | 'right';

export interface Element {
  id: string;
  element_type: ElementType;
  content: string;
  character_name?: string;
  dual_dialogue_position?: DualDialoguePosition;
  force_page_break_after?: boolean;
  /** Set by engine when same character speaks after intervening action.
   * Frontend should append "(CONT'D)" to character name when true. */
  auto_contd?: boolean;
  /** Scene number assigned by engine (for SceneHeading elements).
   * Format: "1", "2", or with prefix: "A1", "A2".
   * Set by scene numbering pass when mode is 'auto'. */
  scene_number?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type PaperSize = 'us_letter' | 'a4';

// Scene Numbering Types

/** Scene numbering mode - determines how scene numbers are assigned */
export type SceneNumberingMode = 'disabled' | 'auto' | 'manual' | 'locked';

/** Configuration for scene numbering (production scripts) */
export interface SceneNumberingConfig {
  /** How scene numbers are assigned */
  mode: SceneNumberingMode;
  /** Starting number for auto-generation (for series continuation) */
  starting_number: number;
  /** Optional prefix for scene numbers (e.g., "A" for episode A -> "A1", "A2") */
  prefix?: string;
}

// ============================================================================
// Locked Page (A-Page) Configuration
// ============================================================================

/**
 * Configuration for locked page numbering (production script mode).
 *
 * In production/shooting scripts, page numbers are "locked" after a certain point.
 * When content is added that would push to a new page, instead of renumbering
 * all subsequent pages, "A-pages" are inserted (e.g., 47A, 47B).
 * When pages are removed, they become "OMITTED" markers.
 */
export interface LockedPageConfig {
  /** Whether page locking is enabled (production script mode).
   * When false, normal sequential page numbering is used. */
  enabled: boolean;

  /** The locked page count - pages beyond this get A-page suffixes.
   * For example, if locked_page_count is 100 and pagination produces 102 pages,
   * the extra pages become 100A and 100B instead of 101 and 102. */
  locked_page_count: number;

  /** Omitted page numbers (pages that existed but content was removed).
   * These will be represented as "N OMITTED" markers in the output. */
  omitted_pages: number[];
}

export interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ElementStyle {
  margin_left: number;
  margin_right: number;
  max_chars_per_line: number;
  space_before: number;
  space_after: number;
  line_spacing: number;
  can_split: boolean;
  min_lines_before_split: number;
  min_lines_after_split: number;
  keep_with_next: boolean;
  keep_with_next_lines: number;
  force_uppercase: boolean;
}

export interface ContinuationStyle {
  more_marker: string;
  contd_marker: string;
  enabled: boolean;
  // Scene-level continuation markers (shooting script feature)
  /** Whether to show scene continuation markers when a page breaks mid-scene */
  scene_continued_enabled?: boolean;
  /** Marker at bottom of page when scene continues (e.g., "(CONTINUED)") */
  scene_continued_bottom?: string;
  /** Marker at top of next page when scene continues (e.g., "CONTINUED:") */
  scene_continued_top?: string;
  /** Whether to include scene number in continuation markers */
  scene_continued_with_number?: boolean;
  // Character CONT'D (same speaker after intervening action)
  /** Whether to auto-detect when same character speaks after intervening action.
   * Default: true (standard screenplay convention) */
  auto_contd_enabled?: boolean;
}

export interface OrphanControlConfig {
  scene_heading_min_following: number;
  character_min_dialogue_lines: number;
  dialogue_min_before_split: number;
  dialogue_min_after_split: number;
}

export interface PageConfig {
  paper_size: PaperSize;
  lines_per_page: number;
  char_width_pt: number;
  line_height_pt: number;
  margins: MarginConfig;
  element_styles: Record<ElementType, ElementStyle>;
  continuation_style: ContinuationStyle;
  orphan_control: OrphanControlConfig;
  /** Scene numbering configuration (production scripts) */
  scene_numbering?: SceneNumberingConfig;
  /** Dual dialogue column width in characters.
   * Each column in dual dialogue is roughly half the normal dialogue width.
   * Default: 17 characters (normal dialogue is 35 chars). */
  dual_dialogue_column_width?: number;
  /** Locked page configuration (production script mode for A-pages).
   * When enabled, pages beyond locked_page_count get A-page suffixes. */
  locked_pages?: LockedPageConfig;
}

// ============================================================================
// Page Types
// ============================================================================

export type PageIdentifier =
  | { type: 'Sequential'; value: number }
  | { type: 'Inserted'; value: { base: number; suffix: string } }
  | { type: 'Omitted'; value: number };

export type PageBreakReason =
  | 'page_full'
  | 'forced'
  | 'act_break'
  | 'orphan_prevention'
  | 'dialogue_continuation';

export interface LineRange {
  start: number;
  end: number;
}

export interface PageElement {
  element_id: string;
  start_line: number;
  line_count: number;
  is_continuation: boolean;
  line_range?: LineRange;
  continuation_prefix?: string;
}

export interface Page {
  identifier: PageIdentifier;
  elements: PageElement[];
  bottom_continuation?: string;
  lines_used: number;
  /** Pixel offset from document start (at 96 DPI) */
  pixel_y: number;
  /** Bottom padding in pixels - height of pm-page-bottom decoration
   * Calculated by WASM as: (lines_per_page - lines_used) * line_height_px + bottom_margin_px
   * WASM is single source of truth - TypeScript uses this value directly */
  bottom_padding_px: number;
  // Scene-level continuation markers (shooting script feature)
  /** Scene continuation marker at bottom of page (e.g., "(CONTINUED)") */
  scene_continued_bottom?: string;
  /** Scene continuation marker at top of page (e.g., "CONTINUED:") */
  scene_continued_top?: string;
  /** The scene number being continued (for markers like "CONTINUED: (42)") */
  continued_scene_number?: number;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Complete layout metadata - SINGLE SOURCE OF TRUTH for all positioning
 *
 * JavaScript should use these values directly without any offset calculations.
 * All values are in pixels at 96 DPI.
 */
export interface LayoutMetadata {
  /** Page height in pixels (e.g., 1056 for US Letter at 96 DPI) */
  page_height_px: number;

  /** Gap between pages in pixels */
  page_gap_px: number;

  /** Top margin inside page (content starts here) */
  top_margin_px: number;

  /** Bottom margin inside page */
  bottom_margin_px: number;

  /** Line height in pixels */
  line_height_px: number;

  /** Whether document has a title page */
  has_title_page: boolean;

  /** Total offset from title page (0 if no title page) */
  title_page_offset_px: number;

  /** Content area height (page_height - top_margin - bottom_margin) */
  content_area_px: number;
}

export interface ElementPosition {
  pages: PageIdentifier[];
  start_line: number;
  end_line: number;
  is_split: boolean;
  /** Exact container height in pixels - CSS should use this to force element height */
  height_px: number;
}

export type WarningType =
  | 'element_exceeds_page'
  | 'unpreventable_orphan'
  | 'configuration_warning'
  | 'dual_dialogue_overflow';

export interface PaginationWarning {
  element_id?: string;
  warning_type: WarningType;
  message: string;
}

export interface PaginationStats {
  page_count: number;
  element_count: number;
  break_count: number;
  continuation_count: number;
  timing_us: number;
  // Debug stats
  total_lines?: number;
  avg_lines_per_element?: number;
  // Layout constants (for CSS positioning, at 96 DPI)
  // DEPRECATED: Use layout.* instead
  line_height_px?: number;
  page_height_px?: number;
  page_gap_px?: number;
  /**
   * Complete layout metadata - SINGLE SOURCE OF TRUTH
   * JavaScript should use this for ALL layout calculations
   */
  layout?: LayoutMetadata;
}

/**
 * Document-level statistics calculated during pagination.
 *
 * These statistics help writers understand their screenplay at a glance,
 * including runtime estimates, scene counts, and character dialogue distribution.
 */
export interface DocumentStats {
  /** Total page count */
  page_count: number;

  /** Estimated runtime in minutes (industry standard: 1 page = 1 minute) */
  estimated_runtime_minutes: number;

  /** Total scene count (number of SceneHeading elements) */
  scene_count: number;

  /** Total dialogue blocks (CHARACTER + DIALOGUE pairs) */
  dialogue_block_count: number;

  /** Unique character names that have dialogue, sorted alphabetically */
  speaking_characters: string[];

  /** Character dialogue stats: character name -> number of dialogue lines */
  character_dialogue_lines: Record<string, number>;

  /**
   * Action vs dialogue ratio (0.0 = all dialogue, 1.0 = all action)
   * Calculated as: action_lines / (action_lines + dialogue_lines)
   */
  action_dialogue_ratio: number;
}

export interface PaginationResult {
  pages: Page[];
  element_positions: Record<string, ElementPosition>;
  warnings: PaginationWarning[];
  stats: PaginationStats;
  /** Document-level statistics (scene count, character stats, etc.) */
  document_stats?: DocumentStats;
  /** Document metadata (title, author, draft info, etc.) for title page rendering and exports */
  metadata?: DocumentMetadata;
  /** Cache for incremental pagination. Store this and pass it back on the next pagination call for faster updates. */
  cache?: PaginationCache;
}

// ============================================================================
// Incremental Pagination Types
// ============================================================================

/**
 * Type of document change for incremental pagination.
 */
export type ChangeType = 'insert' | 'delete' | 'modify';

/**
 * Represents a change to the document for incremental pagination.
 *
 * Changes are specified as a range of element indices that were modified.
 * The pagination engine uses this information to determine which pages
 * need to be recalculated.
 */
export interface DocumentChange {
  /** Index of first element that changed (0-based, inclusive) */
  start_index: number;
  /** Index after last element that changed (exclusive) */
  end_index: number;
  /** Type of change that occurred */
  change_type: ChangeType;
}

/**
 * Cache of pagination results for incremental re-pagination.
 *
 * This cache stores information about the previous pagination run,
 * allowing subsequent paginations to skip unchanged pages and only
 * recalculate from the point where changes occurred.
 *
 * # Performance Benefits
 *
 * For a 120-page script where only page 100 changed:
 * - Without cache: Must recalculate all 120 pages (~50ms)
 * - With cache: Reuse pages 1-99, recalculate 100+ (~10ms)
 *
 * # Important Considerations
 *
 * Page breaks ripple forward, so a change on page 5 may affect all
 * subsequent pages. The optimization is in skipping pages BEFORE the
 * first change, not after.
 */
export interface PaginationCache {
  /** Element ID to page number mapping from last pagination */
  element_pages: Record<string, number>;
  /** Page boundaries: index i contains the element index where page i+1 starts */
  page_boundaries: number[];
  /** Hash of the PageConfig used for the last pagination */
  config_hash: number;
  /** Total number of elements in the last pagination */
  element_count: number;
  /** Whether the last pagination had a title page */
  has_title_page: boolean;
}

/**
 * Helper to create a DocumentChange for a single element modification.
 */
export function createModifyChange(index: number): DocumentChange {
  return {
    start_index: index,
    end_index: index + 1,
    change_type: 'modify',
  };
}

/**
 * Helper to create a DocumentChange for inserting elements.
 */
export function createInsertChange(startIndex: number, count: number): DocumentChange {
  return {
    start_index: startIndex,
    end_index: startIndex + count,
    change_type: 'insert',
  };
}

/**
 * Helper to create a DocumentChange for deleting elements.
 */
export function createDeleteChange(startIndex: number, count: number): DocumentChange {
  return {
    start_index: startIndex,
    end_index: startIndex + count,
    change_type: 'delete',
  };
}

// ============================================================================
// Document Metadata Types
// ============================================================================

/**
 * Revision color for production script revision tracking.
 *
 * In professional film/TV production, script revisions are tracked using
 * colored pages. Each revision gets a new color, allowing crew members
 * to easily identify which version of a page they have.
 *
 * Standard industry color order:
 * 1. white (original)
 * 2. blue (1st revision)
 * 3. pink (2nd revision)
 * 4. yellow (3rd revision)
 * 5. green (4th revision)
 * 6. goldenrod (5th revision)
 * 7. buff (6th revision)
 * 8. salmon (7th revision)
 * 9. cherry (8th revision)
 */
export type RevisionColor =
  | 'white'
  | 'blue'
  | 'pink'
  | 'yellow'
  | 'green'
  | 'goldenrod'
  | 'buff'
  | 'salmon'
  | 'cherry';

/**
 * Document metadata for title page rendering and export headers.
 *
 * This structure stores information typically displayed on a screenplay's
 * title page and used in export headers. All fields are optional to support
 * partial metadata.
 */
export interface DocumentMetadata {
  /** Script title */
  title?: string;
  /** Author/Writer credit */
  author?: string;
  /** Contact information (address, phone, email, agent) */
  contact?: string;
  /** Draft information (e.g., "First Draft", "Final Draft", "Shooting Script") */
  draft?: string;
  /** Draft date (e.g., "December 18, 2025") */
  date?: string;
  /** Copyright notice (e.g., "Copyright 2025 Jane Writer") */
  copyright?: string;
  /** Additional notes (e.g., "Based on the novel by...") */
  notes?: string;
  /** Revision color for colored revision pages (production scripts) */
  revision_color?: RevisionColor;
}

// ============================================================================
// Worker Message Types
// ============================================================================

export interface PaginateRequest {
  type: 'paginate';
  requestId: string;
  elements: Element[];
  config: PageConfig;
  /** Whether the document has a title page */
  hasTitlePage?: boolean;
  /** Document metadata for title page rendering and exports */
  metadata?: DocumentMetadata;
}

export interface ExportFountainRequest {
  type: 'export_fountain';
  requestId: string;
  elements: Element[];
  /** Document metadata for title page */
  metadata?: DocumentMetadata;
}

export interface ExportFdxRequest {
  type: 'export_fdx';
  requestId: string;
  elements: Element[];
  /** Document metadata for title page */
  metadata?: DocumentMetadata;
}

export interface InitRequest {
  type: 'init';
}

export type WorkerRequest = PaginateRequest | ExportFountainRequest | ExportFdxRequest | InitRequest;

export interface PaginateResponse {
  type: 'paginate';
  requestId: string;
  result: PaginationResult;
}

export interface ExportFountainResponse {
  type: 'export_fountain';
  requestId: string;
  /** Fountain-formatted string */
  result: string;
}

export interface ExportFdxResponse {
  type: 'export_fdx';
  requestId: string;
  /** FDX-formatted XML string */
  result: string;
}

export interface InitResponse {
  type: 'init';
  success: boolean;
  error?: string;
}

export interface ErrorResponse {
  type: 'error';
  requestId?: string;
  error: string;
}

export type WorkerResponse = PaginateResponse | ExportFountainResponse | ExportFdxResponse | InitResponse | ErrorResponse;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display string for a page identifier
 */
export function displayPageIdentifier(id: PageIdentifier): string {
  if (!id || !id.type) return '';

  switch (id.type) {
    case 'Sequential':
      return String(id.value ?? '');
    case 'Inserted':
      return `${id.value?.base ?? ''}${id.value?.suffix ?? ''}`;
    case 'Omitted':
      return `${id.value ?? ''} OMITTED`;
    default:
      return '';
  }
}

/**
 * Compare two page identifiers for sorting
 */
export function comparePageIdentifiers(a: PageIdentifier, b: PageIdentifier): number {
  const aKey = getPageSortKey(a);
  const bKey = getPageSortKey(b);

  if (aKey[0] !== bKey[0]) {
    return aKey[0] - bKey[0];
  }
  return aKey[1] - bKey[1];
}

function getPageSortKey(id: PageIdentifier): [number, number] {
  switch (id.type) {
    case 'Sequential':
      return [id.value, 0];
    case 'Inserted':
      return [id.value.base, id.value.suffix.charCodeAt(0) - 64];
    case 'Omitted':
      return [id.value, 0];
  }
}
