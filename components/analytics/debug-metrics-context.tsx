'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { PaginationStats, LayoutMetadata } from '@/lib/verso/types';

// Extend Performance interface for memory API (Chrome only)
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

/**
 * Editor typing performance metrics
 */
export interface EditorMetrics {
  /** Rolling window of keystroke latencies (ms) */
  keystrokeLatencies: number[];
  /** Average keystroke latency (ms) */
  avgKeystrokeLatency: number;
  /** Maximum keystroke latency (ms) */
  maxKeystrokeLatency: number;
  /** P95 keystroke latency (ms) */
  p95KeystrokeLatency: number;
  /** Last transaction processing time (ms) */
  transactionTime: number;
  /** Frame drops in last second */
  frameDrops: number;
  /** Frame drop percentage (0-100) */
  frameDropPercent: number;
  /** Memory usage in bytes (Chrome only) */
  memoryUsage: number | null;
  /** Heap size limit in bytes (Chrome only) */
  heapSizeLimit: number | null;
}

/**
 * WASM pagination engine metrics
 */
export interface WasmMetrics {
  /** Pagination stats from WASM engine */
  stats: PaginationStats | null;
  /** Layout metadata from WASM engine */
  layout: LayoutMetadata | null;
  /** Whether WASM engine is loaded */
  isReady: boolean;
  /** Last update timestamp */
  lastUpdateTime: number;
}

interface DebugMetricsContextValue {
  editorMetrics: EditorMetrics;
  wasmMetrics: WasmMetrics;
  /** Whether metrics collection is active (panel is open) */
  isEnabled: boolean;

  // Setters for editor to push metrics
  pushKeystrokeLatency: (latencyMs: number) => void;
  setTransactionTime: (timeMs: number) => void;
  setFrameStats: (dropped: number, total: number) => void;
  updateMemory: () => void;
  setWasmStats: (stats: PaginationStats, layout: LayoutMetadata | null) => void;
  setWasmReady: (ready: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  clearMetrics: () => void;
}

const DebugMetricsContext = createContext<DebugMetricsContextValue | null>(null);

const LATENCY_WINDOW_SIZE = 100;

const initialEditorMetrics: EditorMetrics = {
  keystrokeLatencies: [],
  avgKeystrokeLatency: 0,
  maxKeystrokeLatency: 0,
  p95KeystrokeLatency: 0,
  transactionTime: 0,
  frameDrops: 0,
  frameDropPercent: 0,
  memoryUsage: null,
  heapSizeLimit: null,
};

const initialWasmMetrics: WasmMetrics = {
  stats: null,
  layout: null,
  isReady: false,
  lastUpdateTime: 0,
};

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function DebugMetricsProvider({ children }: { children: ReactNode }) {
  const [editorMetrics, setEditorMetrics] = useState<EditorMetrics>(initialEditorMetrics);
  const [wasmMetrics, setWasmMetrics] = useState<WasmMetrics>(initialWasmMetrics);
  const [isEnabled, setEnabled] = useState(false);

  // Push keystroke latency with rolling window
  const pushKeystrokeLatency = useCallback((latencyMs: number) => {
    setEditorMetrics((prev) => {
      const newLatencies = [...prev.keystrokeLatencies, latencyMs].slice(-LATENCY_WINDOW_SIZE);
      const avg = newLatencies.reduce((a, b) => a + b, 0) / newLatencies.length;
      const max = Math.max(...newLatencies);
      const p95 = percentile(newLatencies, 95);
      return {
        ...prev,
        keystrokeLatencies: newLatencies,
        avgKeystrokeLatency: avg,
        maxKeystrokeLatency: max,
        p95KeystrokeLatency: p95,
      };
    });
  }, []);

  // Set transaction processing time
  const setTransactionTime = useCallback((timeMs: number) => {
    setEditorMetrics((prev) => ({
      ...prev,
      transactionTime: timeMs,
    }));
  }, []);

  // Set frame drop statistics
  const setFrameStats = useCallback((dropped: number, total: number) => {
    setEditorMetrics((prev) => ({
      ...prev,
      frameDrops: dropped,
      frameDropPercent: total > 0 ? (dropped / total) * 100 : 0,
    }));
  }, []);

  // Update memory usage (Chrome only)
  const updateMemory = useCallback(() => {
    if (typeof performance !== 'undefined' && performance.memory) {
      setEditorMetrics((prev) => ({
        ...prev,
        memoryUsage: performance.memory!.usedJSHeapSize,
        heapSizeLimit: performance.memory!.jsHeapSizeLimit,
      }));
    }
  }, []);

  // Set WASM pagination stats
  const setWasmStats = useCallback((stats: PaginationStats, layout: LayoutMetadata | null) => {
    setWasmMetrics((prev) => ({
      ...prev,
      stats,
      layout,
      lastUpdateTime: Date.now(),
    }));
  }, []);

  // Set WASM ready state
  const setWasmReady = useCallback((ready: boolean) => {
    setWasmMetrics((prev) => ({
      ...prev,
      isReady: ready,
    }));
  }, []);

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    setEditorMetrics(initialEditorMetrics);
  }, []);

  const value = useMemo(
    () => ({
      editorMetrics,
      wasmMetrics,
      isEnabled,
      pushKeystrokeLatency,
      setTransactionTime,
      setFrameStats,
      updateMemory,
      setWasmStats,
      setWasmReady,
      setEnabled,
      clearMetrics,
    }),
    [
      editorMetrics,
      wasmMetrics,
      isEnabled,
      pushKeystrokeLatency,
      setTransactionTime,
      setFrameStats,
      updateMemory,
      setWasmStats,
      setWasmReady,
      clearMetrics,
    ]
  );

  return <DebugMetricsContext.Provider value={value}>{children}</DebugMetricsContext.Provider>;
}

/**
 * Hook to access debug metrics context.
 * Returns null if not in development mode or not inside provider.
 */
export function useDebugMetrics(): DebugMetricsContextValue | null {
  const context = useContext(DebugMetricsContext);

  // Return null in production to avoid errors
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return context;
}

/**
 * Hook that requires debug metrics context (throws if not available).
 * Use this in components that should only render in dev mode.
 */
export function useDebugMetricsRequired(): DebugMetricsContextValue {
  const context = useContext(DebugMetricsContext);

  if (!context) {
    throw new Error('useDebugMetricsRequired must be used within DebugMetricsProvider');
  }

  return context;
}
