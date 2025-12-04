import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialState: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Use this for significant changes (Add Block, Delete Block)
  // Supports both direct value and functional update
  const setHistoryState = useCallback((newStateOrUpdater: T | ((prev: T) => T)) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState((currentState) => {
      const newState = typeof newStateOrUpdater === 'function'
        ? (newStateOrUpdater as (prev: T) => T)(currentState.present)
        : newStateOrUpdater;
      return {
        past: [...currentState.past, currentState.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  // Use this for text updates (debounced history push, immediate state update)
  // Supports both direct value and functional update
  const setEphemeralState = useCallback((newStateOrUpdater: T | ((prev: T) => T)) => {
    setState((currentState) => {
      const newState = typeof newStateOrUpdater === 'function'
        ? (newStateOrUpdater as (prev: T) => T)(currentState.present)
        : newStateOrUpdater;
      return {
        ...currentState,
        present: newState
      };
    });

    // Debounce the history push
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState((curr) => ({
        past: [...curr.past, curr.present],
        present: curr.present,
        future: []
      }));
    }, 1000);
  }, []);

  return {
    state: state.present,
    setHistoryState,
    setEphemeralState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
