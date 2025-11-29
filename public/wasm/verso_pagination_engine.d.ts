/* tslint:disable */
/* eslint-disable */

/**
 * Calculate lines for a single element (useful for preview)
 */
export function calculate_element_lines(element_json: string, config_json: string): number;

/**
 * Get the default Feature Film configuration as JSON
 */
export function get_feature_film_config(): string;

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
 * Version of the pagination engine
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly calculate_element_lines: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly get_feature_film_config: () => [number, number, number, number];
  readonly paginate_document: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly version: () => [number, number];
  readonly init: () => void;
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
