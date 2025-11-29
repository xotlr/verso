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
}

// ============================================================================
// Configuration Types
// ============================================================================

export type PaperSize = 'us_letter' | 'a4';

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
}

// ============================================================================
// Result Types
// ============================================================================

export interface ElementPosition {
  pages: PageIdentifier[];
  start_line: number;
  end_line: number;
  is_split: boolean;
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
}

export interface PaginationResult {
  pages: Page[];
  element_positions: Record<string, ElementPosition>;
  warnings: PaginationWarning[];
  stats: PaginationStats;
}

// ============================================================================
// Worker Message Types
// ============================================================================

export interface PaginateRequest {
  type: 'paginate';
  requestId: string;
  elements: Element[];
  config: PageConfig;
}

export interface InitRequest {
  type: 'init';
}

export type WorkerRequest = PaginateRequest | InitRequest;

export interface PaginateResponse {
  type: 'paginate';
  requestId: string;
  result: PaginationResult;
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

export type WorkerResponse = PaginateResponse | InitResponse | ErrorResponse;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display string for a page identifier
 */
export function displayPageIdentifier(id: PageIdentifier): string {
  switch (id.type) {
    case 'Sequential':
      return String(id.value);
    case 'Inserted':
      return `${id.value.base}${id.value.suffix}`;
    case 'Omitted':
      return `${id.value} OMITTED`;
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
