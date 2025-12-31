'use client';

import { useState, useCallback, useRef } from 'react';
import type { TapestryState } from '@/types/tapestry';

interface HistoryStack {
  past: TapestryState[];
  present: TapestryState;
  future: TapestryState[];
}

const MAX_HISTORY_SIZE = 50;

/**
 * Hook for managing tapestry undo/redo history.
 * Provides a drop-in replacement for useState with undo/redo capabilities.
 */
export function useTapestryHistory(initialState: TapestryState) {
  const [history, setHistory] = useState<HistoryStack>({
    past: [],
    present: initialState,
    future: [],
  });

  // Track if we should skip the next state update (for initial load)
  const skipNextRef = useRef(false);

  /**
   * Update state and push to history.
   * Supports both direct state and updater function patterns.
   */
  const setState = useCallback((
    newState: TapestryState | ((prev: TapestryState) => TapestryState),
    options?: { skipHistory?: boolean }
  ) => {
    setHistory(h => {
      const nextState = typeof newState === 'function' ? newState(h.present) : newState;

      // Skip history for initial loads or explicit skipHistory
      if (options?.skipHistory || skipNextRef.current) {
        skipNextRef.current = false;
        return { ...h, present: nextState };
      }

      // Don't push to history if state hasn't actually changed
      if (JSON.stringify(h.present) === JSON.stringify(nextState)) {
        return h;
      }

      return {
        past: [...h.past, h.present].slice(-MAX_HISTORY_SIZE),
        present: nextState,
        future: [], // Clear redo stack on new action
      };
    });
  }, []);

  /**
   * Undo the last action.
   */
  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;

      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future].slice(0, MAX_HISTORY_SIZE),
      };
    });
  }, []);

  /**
   * Redo the last undone action.
   */
  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;

      const next = h.future[0];
      return {
        past: [...h.past, h.present].slice(-MAX_HISTORY_SIZE),
        present: next,
        future: h.future.slice(1),
      };
    });
  }, []);

  /**
   * Reset state without pushing to history.
   * Use this for initial loads from storage.
   */
  const resetState = useCallback((newState: TapestryState) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  /**
   * Mark the next setState call to skip history.
   * Use this before loading state from storage.
   */
  const skipNextHistory = useCallback(() => {
    skipNextRef.current = true;
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    resetState,
    skipNextHistory,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historyLength: history.past.length,
  };
}
