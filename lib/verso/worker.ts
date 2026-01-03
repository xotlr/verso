/**
 * Pagination Worker Manager
 *
 * Manages the Web Worker that runs the WASM pagination engine.
 * Uses a singleton pattern to share the worker across editor instances.
 */

import type {
  Element,
  PageConfig,
  PaginationResult,
  PaginationCache,
  DocumentChange,
  WorkerRequest,
  WorkerResponse,
} from './types';

export interface PaginateOptions {
  /** Whether document has a title page */
  hasTitlePage?: boolean;
  /** Changes since last pagination (for incremental mode) */
  changes?: DocumentChange[];
  /** Cache from previous pagination result (enables incremental mode) */
  cache?: PaginationCache;
  /** Timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
}

type RequestCallback = {
  resolve: (result: PaginationResult) => void;
  reject: (error: Error) => void;
};

class PaginationWorkerManager {
  private worker: Worker | null = null;
  private initialized = false;
  private initializing = false;
  private initPromise: Promise<void> | null = null;
  private pendingRequests = new Map<string, RequestCallback>();
  private requestCounter = 0;

  /**
   * Initialize the worker and WASM module
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PaginationWorker] Already initialized');
      }
      return;
    }

    if (this.initializing && this.initPromise) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PaginationWorker] Initialization in progress, waiting...');
      }
      return this.initPromise;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[PaginationWorker] Starting initialization...');
    }
    this.initializing = true;

    this.initPromise = new Promise((resolve, reject) => {
      // Guard against SSR - window must exist
      if (typeof window === 'undefined') {
        this.initializing = false;
        reject(new Error('Worker cannot be initialized in SSR context'));
        return;
      }

      // Guard against missing Worker support
      if (typeof Worker === 'undefined') {
        this.initializing = false;
        reject(new Error('Web Workers are not supported in this environment'));
        return;
      }

      try {
        // Create the worker - use full URL for proper module loading
        const origin = window.location.origin;
        if (!origin) {
          throw new Error('Unable to determine origin');
        }

        const workerUrl = new URL('/workers/pagination.worker.js', origin);
        this.worker = new Worker(workerUrl, { type: 'module' });
      } catch (workerError) {
        console.error('[PaginationWorker] Failed to create Worker:', workerError);
        this.initializing = false;
        const errorMsg = workerError instanceof Error ? workerError.message : String(workerError || 'Unknown error');
        reject(new Error(`Failed to create Worker: ${errorMsg}`));
        return;
      }

      try {

        // Set up message handler
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('[PaginationWorker] Worker error:', error);
          reject(new Error(`Worker error: ${error.message || 'Unknown error'}`));
        };

        // Send init message
        const initHandler = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === 'init') {
            this.worker?.removeEventListener('message', initHandler);

            if (event.data.success) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[PaginationWorker] Initialization successful');
              }
              this.initialized = true;
              this.initializing = false;
              resolve();
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.error('[PaginationWorker] Initialization failed:', event.data.error);
              }
              reject(new Error(event.data.error || 'Failed to initialize WASM'));
            }
          }
        };

        this.worker.addEventListener('message', initHandler);
        this.worker.postMessage({
          type: 'init',
          origin: window.location.origin,
        } as WorkerRequest);
      } catch (error) {
        this.initializing = false;
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Run pagination on a set of elements with timeout protection
   *
   * Supports incremental pagination when cache is provided from a previous result.
   * Incremental mode can be 80-90% faster for typical edits.
   *
   * @param elements - Content elements (NOT including title page)
   * @param config - Page configuration
   * @param options - Optional settings including cache for incremental pagination
   */
  async paginate(
    elements: Element[],
    config: PageConfig,
    options: PaginateOptions = {}
  ): Promise<PaginationResult> {
    const { hasTitlePage = false, changes, cache, timeoutMs = 5000 } = options;

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const requestId = `req_${++this.requestCounter}`;

    // Create the pagination promise
    const paginationPromise = new Promise<PaginationResult>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.worker!.postMessage({
        type: 'paginate',
        requestId,
        elements,
        config,
        hasTitlePage,
        changes,
        cache,
      } as WorkerRequest);
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        // Clean up the pending request on timeout
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Pagination timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });

    // Race between pagination and timeout
    return Promise.race([paginationPromise, timeoutPromise]);
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(message: WorkerResponse): void {
    switch (message.type) {
      case 'paginate': {
        const callback = this.pendingRequests.get(message.requestId);
        if (callback) {
          this.pendingRequests.delete(message.requestId);
          callback.resolve(message.result);
        }
        break;
      }

      case 'error': {
        if (message.requestId) {
          const callback = this.pendingRequests.get(message.requestId);
          if (callback) {
            this.pendingRequests.delete(message.requestId);
            callback.reject(new Error(message.error));
          }
        } else {
          console.error('[PaginationWorker] Unhandled error:', message.error);
        }
        break;
      }
    }
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      this.initializing = false;
      this.initPromise = null;

      // Reject all pending requests
      for (const [, callback] of this.pendingRequests) {
        callback.reject(new Error('Worker terminated'));
      }
      this.pendingRequests.clear();
    }
  }

  /**
   * Check if the worker is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let instance: PaginationWorkerManager | null = null;

/**
 * Get the pagination worker manager singleton
 */
export function getPaginationWorker(): PaginationWorkerManager {
  if (!instance) {
    instance = new PaginationWorkerManager();
  }
  return instance;
}

/**
 * Convenience function to run pagination
 *
 * Supports incremental pagination when options.cache is provided.
 *
 * @param elements - Content elements (NOT including title page)
 * @param config - Page configuration
 * @param optionsOrHasTitlePage - Options object or boolean for backward compatibility
 */
export async function runPagination(
  elements: Element[],
  config: PageConfig,
  optionsOrHasTitlePage: PaginateOptions | boolean = false
): Promise<PaginationResult> {
  const worker = getPaginationWorker();

  // Support backward compatibility: boolean for hasTitlePage
  const options: PaginateOptions = typeof optionsOrHasTitlePage === 'boolean'
    ? { hasTitlePage: optionsOrHasTitlePage }
    : optionsOrHasTitlePage;

  return worker.paginate(elements, config, options);
}
