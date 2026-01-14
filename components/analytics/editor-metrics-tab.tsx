'use client';

import { useDebugMetricsRequired } from './debug-metrics-context';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Editor Metrics Tab
 *
 * Displays real-time editor performance metrics:
 * - Keystroke latency (avg, max, p95)
 * - Transaction processing time
 * - Frame drops percentage
 * - Memory usage (Chrome only)
 */
export function EditorMetricsTab() {
  const { editorMetrics, isEnabled, setFrameStats, updateMemory } = useDebugMetricsRequired();
  const frameCountRef = useRef({ total: 0, dropped: 0, lastReset: 0 });
  const lastFrameTimeRef = useRef(0);

  // Frame drop detection via requestAnimationFrame
  useEffect(() => {
    if (!isEnabled) return;

    let rafId: number;
    const targetFrameTime = 1000 / 60; // 60 FPS target

    // Initialize on first effect run to avoid impure calls during render
    if (frameCountRef.current.lastReset === 0) {
      frameCountRef.current.lastReset = Date.now();
    }
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = performance.now();
    }

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameCountRef.current.total++;

      // 1.5x target frame time = dropped frame
      if (delta > targetFrameTime * 1.5) {
        frameCountRef.current.dropped++;
      }

      // Report stats every second
      if (now - frameCountRef.current.lastReset >= 1000) {
        setFrameStats(frameCountRef.current.dropped, frameCountRef.current.total);
        frameCountRef.current = { total: 0, dropped: 0, lastReset: now };
      }

      rafId = requestAnimationFrame(measureFrame);
    };

    rafId = requestAnimationFrame(measureFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isEnabled, setFrameStats]);

  // Update memory usage periodically
  useEffect(() => {
    if (!isEnabled) return;

    updateMemory();
    const interval = setInterval(updateMemory, 2000);
    return () => clearInterval(interval);
  }, [isEnabled, updateMemory]);

  const formatBytes = (bytes: number | null): string => {
    if (bytes === null) return 'N/A';
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const getLatencyColor = (ms: number): string => {
    if (ms < 16) return 'text-green-600 dark:text-green-400';
    if (ms < 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getFrameDropColor = (percent: number): string => {
    if (percent < 1) return 'text-green-600 dark:text-green-400';
    if (percent < 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-4 py-4">
      {/* Keystroke Latency Section */}
      <div className="space-y-2">
        <h4 className="section-label">
          Keystroke Latency
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Average</div>
            <div className={cn('text-lg font-mono', getLatencyColor(editorMetrics.avgKeystrokeLatency))}>
              {editorMetrics.avgKeystrokeLatency.toFixed(1)}
              <span className="text-xs text-muted-foreground ml-0.5">ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">P95</div>
            <div className={cn('text-lg font-mono', getLatencyColor(editorMetrics.p95KeystrokeLatency))}>
              {editorMetrics.p95KeystrokeLatency.toFixed(1)}
              <span className="text-xs text-muted-foreground ml-0.5">ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Max</div>
            <div className={cn('text-lg font-mono', getLatencyColor(editorMetrics.maxKeystrokeLatency))}>
              {editorMetrics.maxKeystrokeLatency.toFixed(1)}
              <span className="text-xs text-muted-foreground ml-0.5">ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction & Frame Stats */}
      <div className="space-y-2">
        <h4 className="section-label">
          Performance
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Transaction Time</div>
            <div className={cn('text-lg font-mono', getLatencyColor(editorMetrics.transactionTime))}>
              {editorMetrics.transactionTime.toFixed(2)}
              <span className="text-xs text-muted-foreground ml-0.5">ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Frame Drops</div>
            <div className={cn('text-lg font-mono', getFrameDropColor(editorMetrics.frameDropPercent))}>
              {editorMetrics.frameDropPercent.toFixed(1)}
              <span className="text-xs text-muted-foreground ml-0.5">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Usage (Chrome only) */}
      <div className="space-y-2">
        <h4 className="section-label">
          Memory (Chrome only)
        </h4>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground">Heap Usage</div>
          <div className="text-lg font-mono">
            {formatBytes(editorMetrics.memoryUsage)}
            {editorMetrics.heapSizeLimit && (
              <span className="text-xs text-muted-foreground ml-1">
                / {formatBytes(editorMetrics.heapSizeLimit)}
              </span>
            )}
          </div>
          {editorMetrics.memoryUsage && editorMetrics.heapSizeLimit && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${(editorMetrics.memoryUsage / editorMetrics.heapSizeLimit) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
        <p>
          <strong>Latency</strong>: Time from keydown to transaction (good &lt; 16ms)
        </p>
        <p>
          <strong>Frame Drops</strong>: Frames exceeding 16.67ms budget (good &lt; 1%)
        </p>
        <p className="text-muted-foreground/60">
          Samples every 5th keystroke to minimize overhead
        </p>
      </div>

      {!isEnabled && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Start typing in the editor to collect metrics
        </p>
      )}
    </div>
  );
}
