import { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { screenplaySchema, ElementType } from '../schema';
import { TestElement } from './test-content';

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

export interface TypingTestConfig {
  /** Characters per second typing speed (default: 10) */
  charsPerSecond: number;
  /** Include element type switching via Tab/Enter (default: true) */
  includeElementSwitching: boolean;
  /** Abort controller for cancellation */
  abortSignal?: AbortSignal;
  /** Test mode */
  mode: 'standard' | 'burst' | 'concurrent';
}

export interface TypingMetrics {
  keystrokeLatencies: number[];
  transactionTimes: number[];
  frameTimes: number[];
  memorySnapshots: number[];
}

export interface TypingTestResult {
  totalKeystrokes: number;
  totalElements: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  p95LatencyMs: number;
  avgTransactionMs: number;
  droppedFrames: number;
  droppedFramePercent: number;
  totalDurationMs: number;
  passed: boolean;
  errors: string[];
  // Memory metrics
  memoryStartMB: number;
  memoryPeakMB: number;
  memoryEndMB: number;
  memoryDeltaMB: number;
  // Comparison estimates (vs Final Draft)
  estimatedFDLatencyMs: number;
  speedupFactor: number;
}

export interface TypingTestProgress {
  currentElement: number;
  totalElements: number;
  currentChar: number;
  totalChars: number;
  percentComplete: number;
  liveMetrics: Partial<TypingTestResult>;
}

// Final Draft estimated latencies based on user reports
const FINAL_DRAFT_ESTIMATES = {
  baseLatencyMs: 80,           // Typical FD latency on short scripts
  longScriptLatencyMs: 200,    // FD latency on 100+ page scripts
  memoryPerCharMB: 0.001,      // Memory bloat estimate
};

const DEFAULT_CONFIG: TypingTestConfig = {
  charsPerSecond: 10,
  includeElementSwitching: true,
  mode: 'standard',
};

/**
 * Get current memory usage in MB (Chrome only).
 */
function getMemoryMB(): number {
  if (performance.memory) {
    return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
  }
  return 0;
}

/**
 * Calculate percentile from sorted array.
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

/**
 * Calculate average from array.
 */
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Sleep for given milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure frame time using requestAnimationFrame.
 */
function measureFrameTime(): Promise<number> {
  return new Promise(resolve => {
    const start = performance.now();
    requestAnimationFrame(() => {
      resolve(performance.now() - start);
    });
  });
}

/**
 * Check if view is still valid (not destroyed).
 */
function isViewValid(view: EditorView): boolean {
  try {
    return view.state !== null && view.dom !== null && view.dom.isConnected;
  } catch {
    return false;
  }
}

/**
 * Insert a single character at current cursor position.
 */
function insertChar(view: EditorView, char: string): number {
  if (!isViewValid(view)) {
    throw new Error('EditorView is no longer valid');
  }

  const start = performance.now();
  const { state } = view;
  const { from } = state.selection;

  const tr = state.tr.insertText(char, from);
  view.dispatch(tr);

  return performance.now() - start;
}

/**
 * Set the element type of current block.
 */
function setElementType(view: EditorView, type: ElementType): boolean {
  if (!isViewValid(view)) return false;

  const nodeType = screenplaySchema.nodes[type];
  if (!nodeType) return false;

  const { state } = view;
  const { $from, $to } = state.selection;

  if (!$from.parent.isTextblock) return false;

  const tr = state.tr.setBlockType($from.pos, $to.pos, nodeType);
  view.dispatch(tr);
  return true;
}

/**
 * Press Enter to create a new block.
 */
function pressEnter(view: EditorView): void {
  if (!isViewValid(view)) return;

  const { state } = view;
  const { $head } = state.selection;
  const endPos = $head.end();

  const nodeType = screenplaySchema.nodes['action'];
  const tr = state.tr.insert(endPos, nodeType.create());

  const newPos = tr.doc.resolve(endPos + 2);
  tr.setSelection(TextSelection.near(newPos));

  view.dispatch(tr);
}

/**
 * Estimate Final Draft latency based on document size.
 */
function estimateFinalDraftLatency(charCount: number): number {
  // FD gets slower as doc grows
  const pageEstimate = charCount / 1500; // ~1500 chars per page
  if (pageEstimate > 100) {
    return FINAL_DRAFT_ESTIMATES.longScriptLatencyMs;
  }
  // Linear interpolation
  const factor = pageEstimate / 100;
  return FINAL_DRAFT_ESTIMATES.baseLatencyMs +
         factor * (FINAL_DRAFT_ESTIMATES.longScriptLatencyMs - FINAL_DRAFT_ESTIMATES.baseLatencyMs);
}

/**
 * Run the automated typing test.
 */
export async function runTypingTest(
  view: EditorView,
  elements: TestElement[],
  config: Partial<TypingTestConfig> = {},
  onProgress?: (progress: TypingTestProgress) => void
): Promise<TypingTestResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Burst mode uses minimal delay
  const delayMs = cfg.mode === 'burst' ? 1 : (1000 / cfg.charsPerSecond);

  // In burst mode, sample frames less frequently to reduce measurement overhead
  const frameSampleRate = cfg.mode === 'burst' ? 10 : 1;

  const metrics: TypingMetrics = {
    keystrokeLatencies: [],
    transactionTimes: [],
    frameTimes: [],
    memorySnapshots: [],
  };

  const errors: string[] = [];
  const startTime = performance.now();
  const memoryStart = getMemoryMB();
  let memoryPeak = memoryStart;

  // Calculate total chars
  const totalChars = elements.reduce((sum, el) => sum + el.text.length, 0);
  let charsSoFar = 0;

  // Go to end of document
  const { state } = view;
  const tr = state.tr.setSelection(TextSelection.atEnd(state.doc));
  view.dispatch(tr);

  // Press Enter to start on a new line
  pressEnter(view);

  for (let elemIdx = 0; elemIdx < elements.length; elemIdx++) {
    if (cfg.abortSignal?.aborted) {
      errors.push('Test aborted by user');
      break;
    }

    const element = elements[elemIdx];

    // Set element type if enabled
    if (cfg.includeElementSwitching) {
      try {
        setElementType(view, element.type);
      } catch (e) {
        errors.push(`Failed to set element type ${element.type}: ${e}`);
      }
    }

    // Type each character
    for (let charIdx = 0; charIdx < element.text.length; charIdx++) {
      if (cfg.abortSignal?.aborted) {
        errors.push('Test aborted by user');
        break;
      }

      if (!isViewValid(view)) {
        errors.push('EditorView was destroyed during test');
        break;
      }

      const char = element.text[charIdx];

      // Measure transaction time
      let txTime: number;
      try {
        txTime = insertChar(view, char);
      } catch (e) {
        errors.push(`insertChar failed: ${e}`);
        break;
      }
      metrics.transactionTimes.push(txTime);

      // Measure frame time (render latency) - sample less frequently in burst mode
      let frameTime = 0;
      if (charsSoFar % frameSampleRate === 0) {
        frameTime = await measureFrameTime();
        metrics.frameTimes.push(frameTime);
      }

      // Total keystroke latency (use transaction time if frame wasn't measured)
      metrics.keystrokeLatencies.push(txTime + frameTime);

      // Track memory every 100 chars
      if (charsSoFar % 100 === 0) {
        const currentMem = getMemoryMB();
        metrics.memorySnapshots.push(currentMem);
        if (currentMem > memoryPeak) {
          memoryPeak = currentMem;
        }
      }

      charsSoFar++;

      // Report progress
      if (onProgress) {
        const sortedLatencies = [...metrics.keystrokeLatencies].sort((a, b) => a - b);
        const currentMem = getMemoryMB();
        onProgress({
          currentElement: elemIdx + 1,
          totalElements: elements.length,
          currentChar: charsSoFar,
          totalChars,
          percentComplete: Math.round((charsSoFar / totalChars) * 100),
          liveMetrics: {
            totalKeystrokes: metrics.keystrokeLatencies.length,
            avgLatencyMs: Math.round(average(metrics.keystrokeLatencies) * 100) / 100,
            maxLatencyMs: Math.round(Math.max(...metrics.keystrokeLatencies) * 100) / 100,
            p95LatencyMs: Math.round(percentile(sortedLatencies, 95) * 100) / 100,
            memoryDeltaMB: Math.round((currentMem - memoryStart) * 100) / 100,
          },
        });
      }

      // Delay between keystrokes (minimal for burst mode)
      await sleep(delayMs);
    }

    if (errors.length > 0) break;

    // Press Enter after each element (except last)
    if (elemIdx < elements.length - 1) {
      pressEnter(view);
      await sleep(delayMs);
    }
  }

  // Final measurements
  const memoryEnd = getMemoryMB();
  const sortedLatencies = [...metrics.keystrokeLatencies].sort((a, b) => a - b);
  const droppedFrames = metrics.frameTimes.filter(t => t > 16.67).length;
  const totalDuration = performance.now() - startTime;
  const avgLatency = average(metrics.keystrokeLatencies);

  // Calculate FD comparison
  const estimatedFDLatency = estimateFinalDraftLatency(charsSoFar);
  const speedupFactor = Math.round((estimatedFDLatency / Math.max(avgLatency, 1)) * 10) / 10;

  const droppedPercent = droppedFrames / Math.max(metrics.frameTimes.length, 1);

  // Burst mode is extreme stress test - use more lenient threshold (20% dropped ok)
  // Standard tests require <5% dropped frames
  const droppedThreshold = cfg.mode === 'burst' ? 0.20 : 0.05;
  const latencyThreshold = cfg.mode === 'burst' ? 30 : 50; // Burst mode: 30ms avg ok

  const result: TypingTestResult = {
    totalKeystrokes: metrics.keystrokeLatencies.length,
    totalElements: elements.length,
    avgLatencyMs: Math.round(avgLatency * 100) / 100,
    maxLatencyMs: Math.round(Math.max(...metrics.keystrokeLatencies, 0) * 100) / 100,
    minLatencyMs: Math.round(Math.min(...metrics.keystrokeLatencies, 0) * 100) / 100,
    p95LatencyMs: Math.round(percentile(sortedLatencies, 95) * 100) / 100,
    avgTransactionMs: Math.round(average(metrics.transactionTimes) * 100) / 100,
    droppedFrames,
    droppedFramePercent: Math.round(droppedPercent * 100),
    totalDurationMs: Math.round(totalDuration),
    passed: avgLatency < latencyThreshold && droppedPercent < droppedThreshold,
    errors,
    // Memory
    memoryStartMB: memoryStart,
    memoryPeakMB: memoryPeak,
    memoryEndMB: memoryEnd,
    memoryDeltaMB: Math.round((memoryEnd - memoryStart) * 100) / 100,
    // Comparison
    estimatedFDLatencyMs: Math.round(estimatedFDLatency),
    speedupFactor,
  };

  return result;
}

/**
 * Run burst typing test - very fast typing to stress test input handling.
 */
export async function runBurstTest(
  view: EditorView,
  charCount: number = 200,
  abortSignal?: AbortSignal,
  onProgress?: (progress: TypingTestProgress) => void
): Promise<TypingTestResult> {
  // Generate burst content - just action text
  const burstText = 'The quick brown fox jumps over the lazy dog. '.repeat(Math.ceil(charCount / 45)).slice(0, charCount);
  const elements: TestElement[] = [{ type: 'action', text: burstText }];

  return runTypingTest(view, elements, {
    charsPerSecond: 100, // Will be overridden by burst mode
    includeElementSwitching: false,
    abortSignal,
    mode: 'burst',
  }, onProgress);
}

/**
 * Quick validation test.
 */
export async function quickValidation(view: EditorView): Promise<{ passed: boolean; latencyMs: number }> {
  const testString = 'Test';
  const latencies: number[] = [];

  for (const char of testString) {
    const txTime = insertChar(view, char);
    const frameTime = await measureFrameTime();
    latencies.push(txTime + frameTime);
    await sleep(50);
  }

  const avgLatency = average(latencies);
  return {
    passed: avgLatency < 100,
    latencyMs: Math.round(avgLatency * 100) / 100,
  };
}
