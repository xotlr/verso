/* tslint:disable */
/* eslint-disable */

/**
 * Calculate lines for a single element (useful for preview)
 */
export function calculate_element_lines(element_json: string, config_json: string): number;

/**
 * Export elements to FDX (Final Draft) format
 *
 * FDX is Final Draft's XML-based screenplay format, widely used in the
 * professional screenwriting industry. This function converts the internal
 * element representation to valid FDX syntax.
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array
 * * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
 *
 * # Returns
 *
 * FDX-formatted XML string
 *
 * # Example
 *
 * ```javascript
 * const elements = [
 *     { id: "1", element_type: "scene_heading", content: "INT. OFFICE - DAY" },
 *     { id: "2", element_type: "action", content: "A busy office." },
 *     { id: "3", element_type: "character", content: "JOHN" },
 *     { id: "4", element_type: "dialogue", content: "Hello, is anyone here?" },
 * ];
 * const metadata = { title: "My Script", author: "John Smith" };
 *
 * const fdx = export_fdx(JSON.stringify(elements), JSON.stringify(metadata));
 * // Save as .fdx file for Final Draft
 * ```
 */
export function export_fdx(elements_json: string, metadata_json: string): string;

/**
 * Export elements to Fountain format
 *
 * Fountain is a plain-text screenplay format widely supported by screenplay editors.
 * This function converts the internal element representation to valid Fountain syntax.
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array
 * * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
 *
 * # Returns
 *
 * Fountain-formatted string
 *
 * # Example
 *
 * ```javascript
 * const elements = [
 *     { id: "1", element_type: "scene_heading", content: "INT. OFFICE - DAY" },
 *     { id: "2", element_type: "action", content: "A busy office." },
 * ];
 * const metadata = { title: "My Script", author: "John Smith" };
 *
 * const fountain = export_fountain(JSON.stringify(elements), JSON.stringify(metadata));
 * ```
 */
export function export_fountain(elements_json: string, metadata_json: string): string;

/**
 * Get the default Feature Film configuration as JSON
 */
export function get_feature_film_config(): string;

/**
 * Get the TV Half-Hour Comedy configuration as JSON
 */
export function get_tv_half_hour_config(): string;

/**
 * Get the TV Multi-Camera Sitcom configuration as JSON
 */
export function get_tv_multi_cam_config(): string;

/**
 * Get the TV One-Hour Drama configuration as JSON
 */
export function get_tv_one_hour_config(): string;

/**
 * Initialize panic hook for better error messages in WASM
 */
export function init(): void;

/**
 * Main entry point for pagination from JavaScript
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array
 * * `config_json` - JSON string of PageConfig
 *
 * # Returns
 *
 * JSON string of PaginationResult
 */
export function paginate_document(elements_json: string, config_json: string): string;

/**
 * Incremental pagination with caching support - PERFORMANCE OPTIMIZED ENTRY POINT
 *
 * This function extends paginate_document_v3 with incremental pagination support.
 * When a cache and changes are provided, it can skip recalculating pages that
 * haven't changed, significantly improving performance for large documents.
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array (content elements)
 * * `config_json` - JSON string of PageConfig
 * * `has_title_page` - Whether the document has a title page
 * * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
 * * `changes_json` - Optional JSON string of DocumentChange array (pass empty string or "null" to skip)
 * * `cache_json` - Optional JSON string of PaginationCache from previous result (pass empty string or "null" for first call)
 *
 * # Returns
 *
 * JSON string of PaginationResult with `cache` field populated for subsequent incremental calls.
 *
 * # Performance
 *
 * - First call (no cache): Same as paginate_document_v3
 * - Subsequent calls with cache: Up to 5-10x faster for end-of-document edits
 *
 * # Example
 *
 * ```javascript
 * // First pagination - no cache
 * const result1 = paginate_document_incremental(elements, config, true, metadata, null, null);
 * const cache = result1.cache;
 *
 * // User edits element at index 500
 * const changes = [{ start_index: 500, end_index: 501, change_type: "modify" }];
 *
 * // Incremental pagination - reuses earlier pages
 * const result2 = paginate_document_incremental(elements, config, true, metadata, changes, cache);
 * ```
 */
export function paginate_document_incremental(elements_json: string, config_json: string, has_title_page: boolean, metadata_json: string, changes_json: string, cache_json: string): string;

/**
 * Pagination with title page awareness - RECOMMENDED ENTRY POINT
 *
 * This function makes WASM the single source of truth for all positioning.
 * When `has_title_page` is true:
 * - Title page is inserted as page 1 with pixel_y: 0
 * - All content pages start from page 2
 * - All pixel_y values include the title page offset
 *
 * JavaScript should use the pixel_y values directly without any offset calculations.
 * The result includes complete LayoutMetadata in stats.layout.
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array (content elements, NOT including title page)
 * * `config_json` - JSON string of PageConfig
 * * `has_title_page` - Whether the document has a title page
 *
 * # Returns
 *
 * JSON string of PaginationResult with absolute pixel positions
 */
export function paginate_document_v2(elements_json: string, config_json: string, has_title_page: boolean): string;

/**
 * Pagination with title page awareness and document metadata - FULL FEATURED ENTRY POINT
 *
 * This function extends paginate_document_v2 with document metadata support.
 * Metadata is passed through to the result for frontend rendering of title pages
 * and export headers.
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array (content elements, NOT including title page)
 * * `config_json` - JSON string of PageConfig
 * * `has_title_page` - Whether the document has a title page
 * * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string or "null" to skip)
 *
 * # Returns
 *
 * JSON string of PaginationResult with absolute pixel positions and metadata
 */
export function paginate_document_v3(elements_json: string, config_json: string, has_title_page: boolean, metadata_json: string): string;

/**
 * Render paginated screenplay to a structure ready for PDF/print export
 *
 * This function transforms PaginationResult into a RenderedDocument containing
 * all positions, text, and styling information needed by a PDF renderer.
 * The JavaScript side uses pdf-lib to create the actual PDF from this data.
 *
 * # Arguments
 *
 * * `elements_json` - JSON string of Element array
 * * `config_json` - JSON string of PageConfig used for pagination
 * * `pagination_result_json` - JSON string of PaginationResult from pagination
 * * `metadata_json` - Optional JSON string of DocumentMetadata (pass empty string to skip)
 *
 * # Returns
 *
 * JSON string of RenderedDocument with all positions and text ready for PDF rendering
 *
 * # Example
 *
 * ```javascript
 * // First paginate the document
 * const paginationResultJson = paginate_document_v3(elements, config, hasTitlePage, metadata);
 *
 * // Then render for export
 * const renderedJson = render_for_export(
 *     JSON.stringify(elements),
 *     JSON.stringify(config),
 *     paginationResultJson,
 *     JSON.stringify(metadata)
 * );
 *
 * // Use pdf-lib in JavaScript to create PDF from rendered data
 * const rendered = JSON.parse(renderedJson);
 * const pdf = await createPdfFromRendered(rendered);
 * ```
 */
export function render_for_export(elements_json: string, config_json: string, pagination_result_json: string, metadata_json: string): string;

/**
 * Version of the pagination engine
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly calculate_element_lines: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly export_fdx: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly export_fountain: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly get_feature_film_config: () => [number, number, number, number];
  readonly get_tv_half_hour_config: () => [number, number, number, number];
  readonly get_tv_multi_cam_config: () => [number, number, number, number];
  readonly paginate_document: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly paginate_document_incremental: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number, number];
  readonly paginate_document_v2: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
  readonly paginate_document_v3: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
  readonly render_for_export: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
  readonly version: () => [number, number];
  readonly init: () => void;
  readonly get_tv_one_hour_config: () => [number, number, number, number];
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
