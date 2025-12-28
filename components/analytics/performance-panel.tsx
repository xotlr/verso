'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Activity, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoredMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  page: string;
  timestamp: number;
}

/**
 * Development-only performance debugging panel.
 * Displays collected Web Vitals metrics in a slide-out sheet.
 */
export function PerformancePanel() {
  const [metrics, setMetrics] = useState<StoredMetric[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load metrics from localStorage when panel opens
  useEffect(() => {
    if (!isOpen) return;

    const loadMetrics = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('verso_web_vitals') || '[]');
        // Show last 20, newest first
        setMetrics(stored.slice(-20).reverse());
      } catch {
        setMetrics([]);
      }
    };

    loadMetrics();
    // Refresh every 2 seconds while open
    const interval = setInterval(loadMetrics, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const clearMetrics = () => {
    localStorage.removeItem('verso_web_vitals');
    setMetrics([]);
  };

  const formatValue = (name: string, value: number) => {
    // CLS is unitless, others are in milliseconds
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${value.toFixed(0)}ms`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-9 w-9 rounded-full shadow-lg"
          title="Performance Metrics"
        >
          <Activity className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Web Vitals
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {['good', 'needs-improvement', 'poor'].map((rating) => {
              const count = metrics.filter((m) => m.rating === rating).length;
              return (
                <div
                  key={rating}
                  className={cn(
                    'rounded-lg p-2',
                    rating === 'good' && 'bg-green-100 dark:bg-green-900/20',
                    rating === 'needs-improvement' && 'bg-yellow-100 dark:bg-yellow-900/20',
                    rating === 'poor' && 'bg-red-100 dark:bg-red-900/20'
                  )}
                >
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {rating.replace('-', ' ')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metrics list */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No metrics yet. Navigate around to collect data.
              </p>
            ) : (
              metrics.map((m, i) => (
                <div
                  key={`${m.name}-${m.timestamp}-${i}`}
                  className={cn(
                    'p-2 rounded-lg text-xs',
                    m.rating === 'good' && 'bg-green-100 dark:bg-green-900/20',
                    m.rating === 'needs-improvement' && 'bg-yellow-100 dark:bg-yellow-900/20',
                    m.rating === 'poor' && 'bg-red-100 dark:bg-red-900/20'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{m.name}</span>
                    <span className="font-mono">{formatValue(m.name, m.value)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground mt-0.5">
                    <span className="truncate max-w-[60%]">{m.page}</span>
                    <span>{formatTimestamp(m.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clear button */}
          {metrics.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearMetrics}
              className="w-full"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Clear Metrics
            </Button>
          )}

          {/* Legend */}
          <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong>LCP</strong>: Largest Contentful Paint (good &lt; 2.5s)</p>
            <p><strong>FID</strong>: First Input Delay (good &lt; 100ms)</p>
            <p><strong>CLS</strong>: Cumulative Layout Shift (good &lt; 0.1)</p>
            <p><strong>INP</strong>: Interaction to Next Paint (good &lt; 200ms)</p>
            <p><strong>TTFB</strong>: Time to First Byte (good &lt; 800ms)</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
