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
  WorkerRequest,
  WorkerResponse,
} from './types';

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
      return;
    }

    if (this.initializing && this.initPromise) {
      return this.initPromise;
    }

    this.initializing = true;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Create the worker
        this.worker = new Worker(
          new URL('../../workers/pagination.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('[PaginationWorker] Error:', error);
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Send init message
        const initHandler = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === 'init') {
            this.worker?.removeEventListener('message', initHandler);

            if (event.data.success) {
              this.initialized = true;
              this.initializing = false;
              resolve();
            } else {
              reject(new Error(event.data.error || 'Failed to initialize WASM'));
            }
          }
        };

        this.worker.addEventListener('message', initHandler);
        this.worker.postMessage({ type: 'init' } as WorkerRequest);
      } catch (error) {
        this.initializing = false;
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Run pagination on a set of elements
   */
  async paginate(elements: Element[], config: PageConfig): Promise<PaginationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const requestId = `req_${++this.requestCounter}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.worker!.postMessage({
        type: 'paginate',
        requestId,
        elements,
        config,
      } as WorkerRequest);
    });
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
 */
export async function runPagination(
  elements: Element[],
  config: PageConfig
): Promise<PaginationResult> {
  const worker = getPaginationWorker();
  return worker.paginate(elements, config);
}
