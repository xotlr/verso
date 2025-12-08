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
 * Version of the pagination engine
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly calculate_element_lines: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly get_feature_film_config: () => [number, number, number, number];
  readonly get_tv_half_hour_config: () => [number, number, number, number];
  readonly get_tv_multi_cam_config: () => [number, number, number, number];
  readonly paginate_document: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly version: () => [number, number];
  readonly init: () => void;
  readonly get_tv_one_hour_config: () => [number, number, number, number];
  readonly BrotliDecoderCreateInstance: (a: number, b: number, c: number) => number;
  readonly BrotliDecoderDecompress: (a: number, b: number, c: number, d: number) => number;
  readonly BrotliDecoderDecompressPrealloc: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
  readonly BrotliDecoderDecompressStream: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly BrotliDecoderDecompressStreaming: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly BrotliDecoderDecompressWithReturnInfo: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly BrotliDecoderDestroyInstance: (a: number) => void;
  readonly BrotliDecoderErrorString: (a: number) => number;
  readonly BrotliDecoderFreeU8: (a: number, b: number, c: number) => void;
  readonly BrotliDecoderFreeUsize: (a: number, b: number, c: number) => void;
  readonly BrotliDecoderGetErrorCode: (a: number) => number;
  readonly BrotliDecoderGetErrorString: (a: number) => number;
  readonly BrotliDecoderHasMoreOutput: (a: number) => number;
  readonly BrotliDecoderIsFinished: (a: number) => number;
  readonly BrotliDecoderIsUsed: (a: number) => number;
  readonly BrotliDecoderMallocU8: (a: number, b: number) => number;
  readonly BrotliDecoderMallocUsize: (a: number, b: number) => number;
  readonly BrotliDecoderSetParameter: (a: number, b: number, c: number) => void;
  readonly BrotliDecoderTakeOutput: (a: number, b: number) => number;
  readonly BrotliDecoderVersion: () => number;
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
