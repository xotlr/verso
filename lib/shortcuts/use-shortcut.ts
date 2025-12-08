'use client';

import { useEffect, useCallback, useRef } from 'react';
import { ShortcutId, eventMatchesKeys, DEFAULT_SHORTCUTS } from './shortcuts-config';
import { useShortcuts } from './shortcuts-context';

interface UseShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  // Scope limits when the shortcut is active
  scope?: 'global' | 'editor' | 'dialog';
}

/**
 * Hook to bind a keyboard shortcut to a callback
 *
 * @param shortcutId - The ID of the shortcut from shortcuts-config
 * @param callback - Function to call when shortcut is triggered
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * useShortcut('save', () => {
 *   handleSave();
 * });
 * ```
 */
export function useShortcut(
  shortcutId: ShortcutId,
  callback: () => void,
  options: UseShortcutOptions = {}
) {
  const { getShortcut, isLoaded } = useShortcuts();
  const callbackRef = useRef(callback);

  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !isLoaded) return;

    const keys = getShortcut(shortcutId);

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if we're in an input that shouldn't capture shortcuts
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;

      // For most shortcuts, skip if we're in an input (unless it's a contenteditable editor)
      // This allows typing in regular inputs without triggering shortcuts
      if (isInput && !isContentEditable) {
        // Allow certain shortcuts like save even in inputs
        const allowInInputs: ShortcutId[] = ['save', 'undo', 'redo', 'selectAll', 'bold', 'italic', 'underline'];
        if (!allowInInputs.includes(shortcutId)) {
          return;
        }
      }

      if (eventMatchesKeys(event, keys)) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        callbackRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcutId, getShortcut, enabled, preventDefault, stopPropagation, isLoaded]);
}

/**
 * Hook to bind multiple shortcuts at once
 *
 * @example
 * ```tsx
 * useShortcuts({
 *   save: handleSave,
 *   undo: handleUndo,
 *   redo: handleRedo,
 * });
 * ```
 */
export function useShortcutsMap(
  shortcuts: Partial<Record<ShortcutId, () => void>>,
  options: UseShortcutOptions = {}
) {
  const { getShortcut, isLoaded } = useShortcuts();
  const shortcutsRef = useRef(shortcuts);

  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  // Keep shortcuts ref up to date
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled || !isLoaded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;

      for (const [id, callback] of Object.entries(shortcutsRef.current)) {
        if (!callback) continue;

        const shortcutId = id as ShortcutId;
        const keys = getShortcut(shortcutId);

        // Skip certain shortcuts in regular inputs
        if (isInput && !isContentEditable) {
          const allowInInputs: ShortcutId[] = ['save', 'undo', 'redo', 'selectAll', 'bold', 'italic', 'underline'];
          if (!allowInInputs.includes(shortcutId)) {
            continue;
          }
        }

        if (eventMatchesKeys(event, keys)) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          callback();
          return; // Only trigger one shortcut per keypress
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [getShortcut, enabled, preventDefault, stopPropagation, isLoaded]);
}

/**
 * Returns a function that checks if an event matches a shortcut.
 * Useful for event handlers where you need to check shortcuts manually.
 *
 * @example
 * ```tsx
 * const matchesShortcut = useShortcutMatcher();
 *
 * const handleKeyDown = (e: React.KeyboardEvent) => {
 *   if (matchesShortcut(e.nativeEvent, 'save')) {
 *     handleSave();
 *   }
 * };
 * ```
 */
export function useShortcutMatcher() {
  const { getShortcut, isLoaded } = useShortcuts();

  return useCallback(
    (event: KeyboardEvent, shortcutId: ShortcutId): boolean => {
      if (!isLoaded) {
        // Fall back to default shortcuts if not loaded yet
        return eventMatchesKeys(event, DEFAULT_SHORTCUTS[shortcutId].keys);
      }
      return eventMatchesKeys(event, getShortcut(shortcutId));
    },
    [getShortcut, isLoaded]
  );
}

/**
 * Get the current keys for a shortcut (for building ProseMirror keymaps)
 * This is a utility function, not a hook.
 */
export function getDefaultShortcutKeys(shortcutId: ShortcutId): string[] {
  return DEFAULT_SHORTCUTS[shortcutId].keys;
}
