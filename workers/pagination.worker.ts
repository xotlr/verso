/**
 * Pagination Web Worker
 *
 * Loads the WASM pagination engine and handles pagination requests.
 * This runs in a separate thread to avoid blocking the main UI.
 */

import type { WorkerRequest, WorkerResponse } from '../lib/verso/types';

// WASM module interface
interface WasmModule {
  paginate_document: (elements_json: string, config_json: string) => string;
  get_feature_film_config: () => string;
  version: () => string;
}

let wasm: WasmModule | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module
 */
async function initWasm(): Promise<void> {
  if (wasm) return;

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Import the WASM module
      // The path will be adjusted based on wasm-pack output location
      const module = await import('../public/wasm/verso_pagination_engine.js');
      await module.default();

      wasm = {
        paginate_document: module.paginate_document,
        get_feature_film_config: module.get_feature_film_config,
        version: module.version,
      };

      console.log(`[PaginationWorker] WASM loaded, version: ${wasm.version()}`);
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
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case 'init': {
      try {
        await initWasm();
        const response: WorkerResponse = { type: 'init', success: true };
        self.postMessage(response);
      } catch (error) {
        const response: WorkerResponse = {
          type: 'init',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        self.postMessage(response);
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
        const resultJson = wasm!.paginate_document(elementsJson, configJson);
        const result = JSON.parse(resultJson);

        // Add JS-side timing
        const endTime = performance.now();
        result.stats.js_timing_ms = endTime - startTime;

        const response: WorkerResponse = {
          type: 'paginate',
          requestId: request.requestId,
          result,
        };
        self.postMessage(response);
      } catch (error) {
        const response: WorkerResponse = {
          type: 'error',
          requestId: request.requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        self.postMessage(response);
      }
      break;
    }

    default: {
      const response: WorkerResponse = {
        type: 'error',
        error: `Unknown request type: ${(request as { type: string }).type}`,
      };
      self.postMessage(response);
    }
  }
};

// Export empty to make this a module
export {};
