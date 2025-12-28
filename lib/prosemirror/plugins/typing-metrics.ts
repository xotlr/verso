import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * Typing Metrics Plugin
 *
 * Measures keystroke latency and transaction processing time for the debug panel.
 * Only active when debug metrics collection is enabled (panel is open).
 *
 * Metrics collected:
 * - Input latency: Time from keydown to keyup
 * - Transaction time: Time to process the ProseMirror transaction
 *
 * Uses sampling to minimize performance overhead (every Nth keystroke).
 */

export interface TypingMetricsState {
  /** Whether metrics collection is enabled */
  enabled: boolean;
  /** Counter for sampling */
  sampleCounter: number;
}

export const typingMetricsPluginKey = new PluginKey<TypingMetricsState>('typingMetrics');

/** Meta key to enable/disable metrics collection */
export const TYPING_METRICS_ENABLE_META = 'typingMetricsEnable';

export interface TypingMetricsOptions {
  /** Measure every Nth keystroke (default: 5) */
  sampleRate?: number;
  /** Callback when keystroke latency is measured */
  onLatencyMeasured?: (latencyMs: number) => void;
  /** Callback when transaction is processed */
  onTransactionProcessed?: (timeMs: number) => void;
}

/**
 * Create the typing metrics plugin.
 *
 * Usage:
 * ```ts
 * const plugin = createTypingMetricsPlugin({
 *   onLatencyMeasured: (ms) => pushKeystrokeLatency(ms),
 *   onTransactionProcessed: (ms) => setTransactionTime(ms),
 * });
 * ```
 *
 * Enable/disable via transaction meta:
 * ```ts
 * view.dispatch(tr.setMeta(TYPING_METRICS_ENABLE_META, true));
 * ```
 */
export function createTypingMetricsPlugin(options: TypingMetricsOptions = {}): Plugin {
  const { sampleRate = 5, onLatencyMeasured, onTransactionProcessed } = options;

  // Track timing across event handlers
  let keystrokeStartTime = 0;
  let transactionStartTime = 0;

  return new Plugin({
    key: typingMetricsPluginKey,

    state: {
      init(): TypingMetricsState {
        return {
          enabled: false,
          sampleCounter: 0,
        };
      },

      apply(tr, state): TypingMetricsState {
        // Check for enable/disable meta
        const enableMeta = tr.getMeta(TYPING_METRICS_ENABLE_META);
        if (enableMeta !== undefined) {
          return { ...state, enabled: enableMeta };
        }

        // Measure transaction processing time when enabled and doc changed
        if (state.enabled && tr.docChanged && transactionStartTime > 0 && onTransactionProcessed) {
          const now = performance.now();
          const duration = now - transactionStartTime;
          transactionStartTime = 0;

          // Report transaction time (defer to avoid blocking)
          queueMicrotask(() => {
            onTransactionProcessed(duration);
          });
        }

        return state;
      },
    },

    props: {
      handleDOMEvents: {
        keydown(view, event) {
          const state = typingMetricsPluginKey.getState(view.state);
          if (!state?.enabled) return false;

          // Only measure character input keys (not modifiers, arrows, etc.)
          if (event.key.length !== 1 && event.key !== 'Backspace' && event.key !== 'Delete') {
            return false;
          }

          // Sample keystroke timing
          const newCounter = (state.sampleCounter + 1) % sampleRate;
          if (newCounter === 0) {
            keystrokeStartTime = performance.now();
            transactionStartTime = performance.now();
          }

          // Update counter in state (via a dummy transaction)
          // Actually, we can't dispatch here. Just use closure variable.
          state.sampleCounter = newCounter;

          return false; // Don't prevent default
        },

        keyup(view) {
          const state = typingMetricsPluginKey.getState(view.state);
          if (!state?.enabled || keystrokeStartTime === 0) return false;

          // Measure input latency (key down to key up)
          if (onLatencyMeasured) {
            const latency = performance.now() - keystrokeStartTime;
            keystrokeStartTime = 0;

            // Report latency (defer to avoid blocking)
            queueMicrotask(() => {
              onLatencyMeasured(latency);
            });
          }

          return false;
        },
      },
    },
  });
}
