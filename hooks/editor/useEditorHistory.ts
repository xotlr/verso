'use client';

import { useState, useCallback, useEffect, useRef, RefObject } from 'react';

interface HistoryEntry {
  text: string;
  timestamp: number;
  cursorPosition: number;
  selectionEnd: number;
}

interface UseEditorHistoryOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onChange: (text: string) => void;
  debounceMs?: number;
  maxEntries?: number;
}

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  historyIndex: number;
  historyLength: number;
}

export function useEditorHistory({
  textareaRef,
  text,
  onChange,
  debounceMs = 500,
  maxEntries = 100,
}: UseEditorHistoryOptions): UseEditorHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { text: '', timestamp: Date.now(), cursorPosition: 0, selectionEnd: 0 }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Track history with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      const newEntry: HistoryEntry = {
        text,
        timestamp: Date.now(),
        cursorPosition: textareaRef.current?.selectionStart || 0,
        selectionEnd: textareaRef.current?.selectionEnd || 0
      };

      // Don't add if text hasn't changed
      if (history[historyIndex]?.text === text) return;

      // Add new entry
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newEntry);

        // Keep only last maxEntries entries
        if (newHistory.length > maxEntries) {
          newHistory.shift();
        }

        return newHistory;
      });

      setHistoryIndex(prev => Math.min(prev + 1, maxEntries - 1));
    }, debounceMs);

    return () => clearTimeout(timer);
    // Note: Intentionally not including history and historyIndex in deps
    // to avoid infinite loops - we only want to track text changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, debounceMs, maxEntries, textareaRef]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex].text);

      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = history[newIndex].cursorPosition;
          textareaRef.current.selectionEnd = history[newIndex].selectionEnd;
          textareaRef.current.focus();
        }
      }, 0);
    }
  }, [historyIndex, history, onChange, textareaRef]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex].text);

      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = history[newIndex].cursorPosition;
          textareaRef.current.selectionEnd = history[newIndex].selectionEnd;
          textareaRef.current.focus();
        }
      }, 0);
    }
  }, [historyIndex, history, onChange, textareaRef]);

  return {
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    handleUndo,
    handleRedo,
    historyIndex,
    historyLength: history.length,
  };
}
