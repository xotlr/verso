'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EditorView } from 'prosemirror-view';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  runTypingTest,
  runBurstTest,
  TypingTestResult,
  TypingTestProgress,
} from '@/lib/prosemirror/dev/typing-test';
import {
  TEST_SCREENPLAY,
  QUICK_TEST,
  STRESS_TEST,
  loadLyraScreenplay,
  loadAzraelScreenplay,
  getTestCharacterCount,
  getEstimatedDuration,
  TestElement,
} from '@/lib/prosemirror/dev/test-content';
import { Play, Square, X, Bug, Zap, FileText, Gauge } from 'lucide-react';

interface TypingTestPanelProps {
  view: EditorView | null;
}

type TestType = 'quick' | 'standard' | 'stress' | 'burst' | 'lyra' | 'azrael';

const TEST_CONFIGS = {
  quick: { label: 'Quick', icon: Zap, charsPerSecond: 45, description: '~50 chars', latencyThreshold: 50, droppedThreshold: 5 },
  standard: { label: 'Standard', icon: FileText, charsPerSecond: 30, description: '~1000 chars', latencyThreshold: 50, droppedThreshold: 5 },
  stress: { label: 'Stress', icon: Gauge, charsPerSecond: 60, description: '~1000 chars, long blocks', latencyThreshold: 50, droppedThreshold: 5 },
  burst: { label: 'Burst', icon: Zap, charsPerSecond: 200, description: '200 chars @ max speed (extreme)', latencyThreshold: 30, droppedThreshold: 20 },
  lyra: { label: 'LYRA', icon: FileText, charsPerSecond: 500, description: '~200 pages (chunk mode)', latencyThreshold: 50, droppedThreshold: 60 },
  azrael: { label: 'AZRAEL', icon: FileText, charsPerSecond: 500, description: '~280 pages (chunk mode)', latencyThreshold: 50, droppedThreshold: 60 },
};

export function TypingTestPanel({ view }: TypingTestPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingScreenplay, setIsLoadingScreenplay] = useState(false);
  const [testType, setTestType] = useState<TestType>('quick');
  const [progress, setProgress] = useState<TypingTestProgress | null>(null);
  const [result, setResult] = useState<TypingTestResult | null>(null);
  const [lyraElements, setLyraElements] = useState<TestElement[] | null>(null);
  const [azraelElements, setAzraelElements] = useState<TestElement[] | null>(null);
  const [logline, setLogline] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load screenplay when that test type is selected
  useEffect(() => {
    if (testType === 'lyra' && !lyraElements && !isLoadingScreenplay) {
      setIsLoadingScreenplay(true);
      loadLyraScreenplay()
        .then(setLyraElements)
        .finally(() => setIsLoadingScreenplay(false));
    }
    if (testType === 'azrael' && !azraelElements && !isLoadingScreenplay) {
      setIsLoadingScreenplay(true);
      loadAzraelScreenplay()
        .then(setAzraelElements)
        .finally(() => setIsLoadingScreenplay(false));
    }
  }, [testType, lyraElements, azraelElements, isLoadingScreenplay]);

  // Memoize test elements to avoid regenerating on every render
  const testElements = useMemo(() => {
    let elements: TestElement[];
    switch (testType) {
      case 'quick': elements = QUICK_TEST; break;
      case 'standard': elements = TEST_SCREENPLAY; break;
      case 'stress': elements = STRESS_TEST; break;
      case 'burst': elements = []; break; // Handled separately
      case 'lyra': elements = lyraElements || []; break;
      case 'azrael': elements = azraelElements || []; break;
      default: elements = QUICK_TEST;
    }
    // Prepend logline if provided for screenplay tests
    if (logline.trim() && (testType === 'lyra' || testType === 'azrael')) {
      return [{ type: 'action' as const, text: `LOGLINE: ${logline.trim()}` }, ...elements];
    }
    return elements;
  }, [testType, lyraElements, azraelElements, logline]);

  const charCount = testType === 'burst' ? 200 : getTestCharacterCount(testElements);
  const config = TEST_CONFIGS[testType];
  const estimatedSeconds = testType === 'burst' ? 5 : getEstimatedDuration(testElements, config.charsPerSecond);

  // Keyboard shortcut: Ctrl+Shift+T
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isLoadingContent = isLoadingScreenplay && (testType === 'lyra' || testType === 'azrael');

  const startTest = useCallback(async () => {
    if (!view || isRunning || isLoadingContent) return;

    setIsRunning(true);
    setResult(null);
    setProgress(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let testResult: TypingTestResult;

      if (testType === 'burst') {
        testResult = await runBurstTest(view, 200, controller.signal, setProgress);
      } else {
        // Use chunk mode for large screenplays (LYRA/AZRAEL) - inserts entire elements at once
        // This is ~100x faster than character-by-character typing
        const isLargeScreenplay = testType === 'lyra' || testType === 'azrael';
        testResult = await runTypingTest(
          view,
          testElements,
          {
            charsPerSecond: config.charsPerSecond,
            includeElementSwitching: true,
            abortSignal: controller.signal,
            mode: isLargeScreenplay ? 'chunk' : 'standard',
            chunkSize: 5000, // Insert 5000 chars at a time for max speed
          },
          setProgress
        );
      }

      setResult(testResult);
    } catch (error) {
      console.error('[TypingTest] Error:', error);
      setResult({
        totalKeystrokes: 0,
        totalElements: 0,
        avgLatencyMs: 0,
        maxLatencyMs: 0,
        minLatencyMs: 0,
        p95LatencyMs: 0,
        avgTransactionMs: 0,
        droppedFrames: 0,
        droppedFramePercent: 0,
        totalDurationMs: 0,
        passed: false,
        errors: [String(error)],
        memoryStartMB: 0,
        memoryPeakMB: 0,
        memoryEndMB: 0,
        memoryDeltaMB: 0,
        estimatedFDLatencyMs: 0,
        speedupFactor: 0,
      });
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [view, isRunning, testType, testElements, config, isLoadingContent]);

  const stopTest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-2 bg-yellow-500 text-black rounded-full shadow-lg hover:bg-yellow-400 transition-colors"
        title="Open Typing Test (Ctrl+Shift+T)"
      >
        <Bug className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-50 w-96 bg-background border border-border rounded-lg shadow-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-yellow-500/10 border-b border-border">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-sm">Performance Test</span>
          <span className="text-xs text-muted-foreground">(Dev Only)</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Test Type Selection */}
        <div className="grid grid-cols-6 gap-1">
          {(Object.keys(TEST_CONFIGS) as TestType[]).map((type) => {
            const Icon = TEST_CONFIGS[type].icon;
            return (
              <button
                key={type}
                onClick={() => setTestType(type)}
                disabled={isRunning}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-1.5 text-xs rounded transition-colors",
                  testType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
                title={TEST_CONFIGS[type].description}
              >
                <Icon className="h-3 w-3" />
                <span className="text-[10px]">{TEST_CONFIGS[type].label}</span>
              </button>
            );
          })}
        </div>

        {/* Logline input for screenplay tests */}
        {(testType === 'lyra' || testType === 'azrael') && !isRunning && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              Logline (optional)
            </label>
            <input
              type="text"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              placeholder="Enter logline to prepend..."
              className="w-full px-2 py-1.5 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoadingContent}
            />
          </div>
        )}

        {/* Test Info */}
        <div className="text-xs text-muted-foreground">
          {isLoadingContent ? (
            <span>Loading {testType.toUpperCase()} screenplay...</span>
          ) : (
            <>
              {charCount.toLocaleString()} chars, ~{estimatedSeconds}s @ {config.charsPerSecond} cps
              <br />
              <span className="opacity-70">Pass: &lt;{config.latencyThreshold}ms latency, &lt;{config.droppedThreshold}% dropped</span>
            </>
          )}
        </div>

        {/* Progress */}
        {isRunning && progress && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {progress.currentChar.toLocaleString()}/{progress.totalChars.toLocaleString()} chars ({progress.percentComplete}%)
            </div>
            {progress.liveMetrics && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Avg:</span>{' '}
                  <span className={cn(
                    (progress.liveMetrics.avgLatencyMs ?? 0) >= config.latencyThreshold ? 'text-red-500' : 'text-green-500'
                  )}>
                    {progress.liveMetrics.avgLatencyMs}ms
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">P95:</span>{' '}
                  <span>{progress.liveMetrics.p95LatencyMs}ms</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mem:</span>{' '}
                  <span>{progress.liveMetrics.memoryDeltaMB ?? 0}MB</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && !isRunning && (
          <div className="space-y-3">
            {/* Pass/Fail Badge with Reason */}
            <div className={cn(
              "text-center py-1.5 rounded font-semibold text-sm",
              result.passed ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
            )}>
              {result.passed ? 'PASSED' : 'FAILED'}
              {!result.passed && (
                <div className="text-[10px] font-normal mt-0.5 opacity-80">
                  {result.avgLatencyMs >= config.latencyThreshold && result.droppedFramePercent >= config.droppedThreshold
                    ? `Latency ${result.avgLatencyMs}ms ≥ ${config.latencyThreshold}ms & Dropped ${result.droppedFramePercent}% ≥ ${config.droppedThreshold}%`
                    : result.avgLatencyMs >= config.latencyThreshold
                    ? `Latency ${result.avgLatencyMs}ms exceeds ${config.latencyThreshold}ms threshold`
                    : result.droppedFramePercent >= config.droppedThreshold
                    ? `Dropped frames ${result.droppedFramePercent}% exceeds ${config.droppedThreshold}% threshold`
                    : 'Unknown failure reason'}
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Latency Card */}
              <div className="p-2 bg-muted/50 rounded space-y-1">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Latency</div>
                <div className="grid grid-cols-2 gap-x-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Avg:</span>{' '}
                    <span className={result.avgLatencyMs >= config.latencyThreshold ? 'text-red-500' : 'text-green-500'}>
                      {result.avgLatencyMs}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max:</span>{' '}
                    {result.maxLatencyMs}ms
                  </div>
                  <div>
                    <span className="text-muted-foreground">P95:</span>{' '}
                    {result.p95LatencyMs}ms
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tx:</span>{' '}
                    {result.avgTransactionMs}ms
                  </div>
                </div>
              </div>

              {/* Memory Card */}
              <div className="p-2 bg-muted/50 rounded space-y-1">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Memory</div>
                <div className="grid grid-cols-2 gap-x-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Start:</span>{' '}
                    {result.memoryStartMB}MB
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peak:</span>{' '}
                    {result.memoryPeakMB}MB
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>{' '}
                    {result.memoryEndMB}MB
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delta:</span>{' '}
                    <span className={result.memoryDeltaMB > 50 ? 'text-yellow-500' : 'text-green-500'}>
                      +{result.memoryDeltaMB}MB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Keystrokes</div>
                <div className="font-medium">{result.totalKeystrokes.toLocaleString()}</div>
              </div>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Duration</div>
                <div className="font-medium">{(result.totalDurationMs / 1000).toFixed(1)}s</div>
              </div>
              <div className="text-center p-1.5 bg-muted/30 rounded">
                <div className="text-muted-foreground text-[10px]">Dropped</div>
                <div className={cn("font-medium", result.droppedFramePercent >= config.droppedThreshold ? 'text-red-500' : 'text-green-500')}>
                  {result.droppedFramePercent}%
                </div>
              </div>
            </div>

            {/* vs Final Draft Comparison */}
            {result.speedupFactor > 0 && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded space-y-1">
                <div className="text-[10px] text-green-500 font-medium uppercase tracking-wide">vs Final Draft (est.)</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (result.speedupFactor / 10) * 100)}%` }}
                    />
                  </div>
                  <span className="text-green-500 font-bold text-sm">{result.speedupFactor}x faster</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Verso: {result.avgLatencyMs}ms vs FD: ~{result.estimatedFDLatencyMs}ms
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                {result.errors.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button size="sm" onClick={startTest} disabled={!view || isLoadingContent} className="flex-1">
              <Play className="h-4 w-4 mr-1" />
              {isLoadingContent ? 'Loading...' : 'Run Test'}
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stopTest} className="flex-1">
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}
        </div>

        {!view && (
          <div className="text-xs text-yellow-500 text-center">
            Editor view not available
          </div>
        )}
      </div>
    </div>
  );
}
