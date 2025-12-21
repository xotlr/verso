let wasm;

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

/**
 * Calculate lines for a single element (useful for preview)
 * @param {string} element_json
 * @param {string} config_json
 * @returns {number}
 */
export function calculate_element_lines(element_json, config_json) {
    const ptr0 = passStringToWasm0(element_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_element_lines(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
}

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
 * @param {string} elements_json
 * @param {string} metadata_json
 * @returns {string}
 */
export function export_fdx(elements_json, metadata_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(metadata_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.export_fdx(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

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
 * @param {string} elements_json
 * @param {string} metadata_json
 * @returns {string}
 */
export function export_fountain(elements_json, metadata_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(metadata_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.export_fountain(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * Get the BBC Standard configuration as JSON
 * @returns {string}
 */
export function get_bbc_standard_config() {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.get_bbc_standard_config();
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get the Feature Film A4 (international) configuration as JSON
 * @returns {string}
 */
export function get_feature_film_a4_config() {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.get_feature_film_a4_config();
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get the default Feature Film configuration as JSON
 * @returns {string}
 */
export function get_feature_film_config() {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.get_feature_film_config();
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get the TV Half-Hour Comedy configuration as JSON
 * @returns {string}
 */
export function get_tv_half_hour_config() {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.get_tv_half_hour_config();
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get the TV Multi-Camera Sitcom configuration as JSON
 * @returns {string}
 */
export function get_tv_multi_cam_config() {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.get_tv_multi_cam_config();
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get the TV One-Hour Drama configuration as JSON
 * @returns {string}
 */
export function get_tv_one_hour_config() {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.get_tv_one_hour_config();
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Initialize panic hook for better error messages in WASM
 */
export function init() {
    wasm.init();
}

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
 * @param {string} elements_json
 * @param {string} config_json
 * @returns {string}
 */
export function paginate_document(elements_json, config_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.paginate_document(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

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
 * @param {string} elements_json
 * @param {string} config_json
 * @param {boolean} has_title_page
 * @param {string} metadata_json
 * @param {string} changes_json
 * @param {string} cache_json
 * @returns {string}
 */
export function paginate_document_incremental(elements_json, config_json, has_title_page, metadata_json, changes_json, cache_json) {
    let deferred7_0;
    let deferred7_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(metadata_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(changes_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(cache_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.paginate_document_incremental(ptr0, len0, ptr1, len1, has_title_page, ptr2, len2, ptr3, len3, ptr4, len4);
        var ptr6 = ret[0];
        var len6 = ret[1];
        if (ret[3]) {
            ptr6 = 0; len6 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred7_0 = ptr6;
        deferred7_1 = len6;
        return getStringFromWasm0(ptr6, len6);
    } finally {
        wasm.__wbindgen_free(deferred7_0, deferred7_1, 1);
    }
}

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
 * @param {string} elements_json
 * @param {string} config_json
 * @param {boolean} has_title_page
 * @returns {string}
 */
export function paginate_document_v2(elements_json, config_json, has_title_page) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.paginate_document_v2(ptr0, len0, ptr1, len1, has_title_page);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

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
 * @param {string} elements_json
 * @param {string} config_json
 * @param {boolean} has_title_page
 * @param {string} metadata_json
 * @returns {string}
 */
export function paginate_document_v3(elements_json, config_json, has_title_page, metadata_json) {
    let deferred5_0;
    let deferred5_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(metadata_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.paginate_document_v3(ptr0, len0, ptr1, len1, has_title_page, ptr2, len2);
        var ptr4 = ret[0];
        var len4 = ret[1];
        if (ret[3]) {
            ptr4 = 0; len4 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred5_0 = ptr4;
        deferred5_1 = len4;
        return getStringFromWasm0(ptr4, len4);
    } finally {
        wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
    }
}

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
 * @param {string} elements_json
 * @param {string} config_json
 * @param {string} pagination_result_json
 * @param {string} metadata_json
 * @returns {string}
 */
export function render_for_export(elements_json, config_json, pagination_result_json, metadata_json) {
    let deferred6_0;
    let deferred6_1;
    try {
        const ptr0 = passStringToWasm0(elements_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(pagination_result_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(metadata_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.render_for_export(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        var ptr5 = ret[0];
        var len5 = ret[1];
        if (ret[3]) {
            ptr5 = 0; len5 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred6_0 = ptr5;
        deferred6_1 = len5;
        return getStringFromWasm0(ptr5, len5);
    } finally {
        wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
    }
}

/**
 * Version of the pagination engine
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_52673b7de5a0ca89 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('verso_pagination_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
