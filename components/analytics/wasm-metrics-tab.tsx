'use client';

import { useDebugMetricsRequired } from './debug-metrics-context';
import { cn } from '@/lib/utils';

/**
 * WASM Metrics Tab
 *
 * Displays Verso pagination engine statistics:
 * - Pagination timing (µs)
 * - Page count, element count, breaks
 * - Layout metadata (line height, page dimensions)
 */
export function WasmMetricsTab() {
  const { wasmMetrics } = useDebugMetricsRequired();
  const { stats, layout, isReady, lastUpdateTime } = wasmMetrics;

  if (!isReady || !stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>WASM pagination engine not yet loaded</p>
        <p className="text-xs mt-2">Open a screenplay to initialize</p>
      </div>
    );
  }

  const getTimingColor = (us: number): string => {
    if (us < 5000) return 'text-green-600 dark:text-green-400'; // < 5ms
    if (us < 20000) return 'text-yellow-600 dark:text-yellow-400'; // < 20ms
    return 'text-red-600 dark:text-red-400';
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-4 py-4">
      {/* Timing */}
      <div className="space-y-2">
        <h4 className="section-label">
          Pagination Timing
        </h4>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground">Last Pagination</div>
          <div className={cn('text-2xl font-mono', getTimingColor(stats.timing_us))}>
            {stats.timing_us.toLocaleString()}
            <span className="text-sm text-muted-foreground ml-1">µs</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ({(stats.timing_us / 1000).toFixed(2)}ms)
          </div>
        </div>
      </div>

      {/* Document Stats */}
      <div className="space-y-2">
        <h4 className="section-label">
          Document Stats
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Pages</div>
            <div className="text-lg font-mono">{stats.page_count}</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Elements</div>
            <div className="text-lg font-mono">{stats.element_count}</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Page Breaks</div>
            <div className="text-lg font-mono">{stats.break_count}</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Continuations</div>
            <div className="text-lg font-mono">{stats.continuation_count}</div>
          </div>
        </div>

        {stats.total_lines !== undefined && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground">Total Lines</div>
              <div className="text-lg font-mono">{stats.total_lines}</div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground">Avg Lines/Element</div>
              <div className="text-lg font-mono">{stats.avg_lines_per_element?.toFixed(1) ?? 'N/A'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Layout Metadata */}
      {layout && (
        <div className="space-y-2">
          <h4 className="section-label">
            Layout Metadata
          </h4>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="p-2 rounded bg-muted/30 flex justify-between">
              <span className="text-muted-foreground">Line Height</span>
              <span className="font-mono">{layout.line_height_px}px</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex justify-between">
              <span className="text-muted-foreground">Page Height</span>
              <span className="font-mono">{layout.page_height_px}px</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex justify-between">
              <span className="text-muted-foreground">Page Gap</span>
              <span className="font-mono">{layout.page_gap_px}px</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex justify-between">
              <span className="text-muted-foreground">Content Area</span>
              <span className="font-mono">{layout.content_area_px}px</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex justify-between">
              <span className="text-muted-foreground">Top Margin</span>
              <span className="font-mono">{layout.top_margin_px}px</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex justify-between">
              <span className="text-muted-foreground">Bottom Margin</span>
              <span className="font-mono">{layout.bottom_margin_px}px</span>
            </div>
            <div className="p-2 rounded bg-muted/30 col-span-2 flex justify-between">
              <span className="text-muted-foreground">Has Title Page</span>
              <span className="font-mono">{layout.has_title_page ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="text-[10px] text-muted-foreground pt-2 border-t">
        <p>Last updated: {formatTime(lastUpdateTime)}</p>
        <p className="mt-1">
          <strong>Timing</strong>: Full pagination pass (good &lt; 5ms)
        </p>
      </div>
    </div>
  );
}
