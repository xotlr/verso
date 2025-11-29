/**
 * Pagination Web Worker
 *
 * Loads the WASM pagination engine and handles pagination requests.
 * This runs in a separate thread to avoid blocking the main UI.
 *
 * NOTE: This file inlines the wasm-bindgen glue code to avoid dynamic import
 * issues with absolute URLs in web workers.
 */

// ============================================================================
// Inlined wasm-bindgen glue code from verso_pagination_engine.js
// ============================================================================

let wasm;
let initPromise = null;
let baseOrigin = null;

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
  };
}

let WASM_VECTOR_LEN = 0;

// Wrapped WASM functions
function paginate_document(elements_json, config_json) {
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
      throw takeFromExternrefTable0(ret[1]);
    }
    deferred4_0 = ptr3;
    deferred4_1 = len3;
    return getStringFromWasm0(ptr3, len3);
  } finally {
    wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
  }
}

function get_feature_film_config() {
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

function version() {
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

// WASM imports
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

// WASM loading helpers
const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

        if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
          console.warn("[PaginationWorker] WebAssembly.instantiateStreaming failed, falling back:", e.message);
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

function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;

  wasm.__wbindgen_start();
  return wasm;
}

// ============================================================================
// Worker logic
// ============================================================================

/**
 * Initialize the WASM module by fetching the binary directly
 */
async function initWasm() {
  if (wasm) return;

  if (initPromise) {
    return initPromise;
  }

  // Use origin passed from main thread, fallback to self.location.origin
  const origin = baseOrigin || self.location.origin;

  initPromise = (async () => {
    try {
      // Fetch the WASM binary directly
      const wasmBinaryUrl = new URL('/wasm/verso_pagination_engine_bg.wasm', origin);
      console.log('[PaginationWorker] Fetching WASM from:', wasmBinaryUrl.href);

      const response = await fetch(wasmBinaryUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
      }

      const imports = __wbg_get_imports();
      const { instance, module } = await __wbg_load(response, imports);

      __wbg_finalize_init(instance, module);

      console.log(`[PaginationWorker] WASM loaded, version: ${version()}`);
    } catch (error) {
      console.error('[PaginationWorker] Failed to load WASM:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Handle incoming messages
 */
self.onmessage = async (event) => {
  const request = event.data;

  switch (request.type) {
    case 'init': {
      try {
        // Capture origin from main thread for WASM URL construction
        if (request.origin) {
          baseOrigin = request.origin;
        }
        await initWasm();
        self.postMessage({ type: 'init', success: true });
      } catch (error) {
        self.postMessage({
          type: 'init',
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      break;
    }

    case 'paginate': {
      try {
        if (!wasm) {
          await initWasm();
        }

        const startTime = performance.now();

        // Serialize inputs to JSON
        const elementsJson = JSON.stringify(request.elements);
        const configJson = JSON.stringify(request.config);

        // Call WASM pagination
        const resultJson = paginate_document(elementsJson, configJson);
        const result = JSON.parse(resultJson);

        // Add JS-side timing
        const endTime = performance.now();
        result.stats.js_timing_ms = endTime - startTime;

        self.postMessage({
          type: 'paginate',
          requestId: request.requestId,
          result,
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          requestId: request.requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      break;
    }

    default: {
      self.postMessage({
        type: 'error',
        error: `Unknown request type: ${request.type}`,
      });
    }
  }
};
