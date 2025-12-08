'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  ShortcutId,
  DEFAULT_SHORTCUTS,
  keysToKeymapString,
  formatKeysForDisplay,
  getAllShortcutIds,
} from './shortcuts-config';

const SHORTCUTS_STORAGE_KEY = 'verso-shortcuts-v1';

// Custom shortcuts are stored as a partial record - only overridden shortcuts are stored
export type CustomShortcuts = Partial<Record<ShortcutId, string[]>>;

interface ShortcutsContextType {
  // Current shortcut bindings (merged default + custom)
  shortcuts: Record<ShortcutId, string[]>;
  // Get the keys for a specific shortcut
  getShortcut: (id: ShortcutId) => string[];
  // Get the display string for a shortcut (e.g., "⌘S" or "Ctrl+S")
  getShortcutDisplay: (id: ShortcutId) => string;
  // Get the keymap string for ProseMirror (e.g., "Mod-s")
  getKeymapString: (id: ShortcutId) => string;
  // Update a shortcut's keys - returns conflict info if any
  updateShortcut: (id: ShortcutId, keys: string[]) => { success: boolean; conflict?: ShortcutId };
  // Reset a specific shortcut to default
  resetShortcut: (id: ShortcutId) => void;
  // Reset all shortcuts to defaults
  resetAllShortcuts: () => void;
  // Check if a key combination conflicts with existing shortcuts
  hasConflict: (keys: string[], excludeId?: ShortcutId) => ShortcutId | null;
  // Check if a shortcut has been customized
  isCustomized: (id: ShortcutId) => boolean;
  // Whether shortcuts have finished loading
  isLoaded: boolean;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [customShortcuts, setCustomShortcuts] = useState<CustomShortcuts>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Compute merged shortcuts (defaults + custom overrides)
  const shortcuts = useMemo(() => {
    const result: Record<ShortcutId, string[]> = {} as Record<ShortcutId, string[]>;

    for (const id of getAllShortcutIds()) {
      result[id] = customShortcuts[id] || DEFAULT_SHORTCUTS[id].keys;
    }

    return result;
  }, [customShortcuts]);

  // Load shortcuts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CustomShortcuts;
        setCustomShortcuts(parsed);
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save shortcuts to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(customShortcuts));
      } catch (error) {
        console.error('Failed to save shortcuts:', error);
      }
    }
  }, [customShortcuts, isLoaded]);

  // Save shortcuts to database
  const saveToDatabase = useCallback(async (shortcuts: CustomShortcuts) => {
    if (!session?.user?.id) return;

    try {
      await fetch('/api/users/shortcuts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcuts }),
      });
    } catch (error) {
      console.error('Failed to save shortcuts to database:', error);
    }
  }, [session?.user?.id]);

  // Sync with database when user is logged in
  useEffect(() => {
    const syncWithDatabase = async () => {
      if (!session?.user?.id) return;

      try {
        // Fetch user's shortcuts from database
        const response = await fetch('/api/users/shortcuts');
        if (response.ok) {
          const data = await response.json();
          if (data.shortcuts) {
            // Merge database shortcuts with local (database takes precedence for sync)
            const dbShortcuts = data.shortcuts as CustomShortcuts;
            setCustomShortcuts((prev) => {
              // If local has newer changes, upload them to database
              const localKeys = Object.keys(prev);
              const dbKeys = Object.keys(dbShortcuts);

              if (localKeys.length > 0 && dbKeys.length === 0) {
                // Local has shortcuts but DB doesn't - push to DB
                saveToDatabase(prev);
                return prev;
              }

              // Otherwise, use DB shortcuts
              return dbShortcuts;
            });
          }
        }
      } catch (error) {
        console.error('Failed to sync shortcuts with database:', error);
      }
    };

    if (isLoaded && session?.user?.id) {
      syncWithDatabase();
    }
  }, [isLoaded, session?.user?.id, saveToDatabase]);

  // Get keys for a specific shortcut
  const getShortcut = useCallback((id: ShortcutId): string[] => {
    return shortcuts[id];
  }, [shortcuts]);

  // Get display string for a shortcut
  const getShortcutDisplay = useCallback((id: ShortcutId): string => {
    return formatKeysForDisplay(shortcuts[id]);
  }, [shortcuts]);

  // Get keymap string for ProseMirror
  const getKeymapString = useCallback((id: ShortcutId): string => {
    return keysToKeymapString(shortcuts[id]);
  }, [shortcuts]);

  // Check if a key combination conflicts with existing shortcuts
  const hasConflict = useCallback((keys: string[], excludeId?: ShortcutId): ShortcutId | null => {
    const newKeyString = keysToKeymapString(keys);

    for (const id of getAllShortcutIds()) {
      if (id === excludeId) continue;

      const existingKeyString = keysToKeymapString(shortcuts[id]);
      if (existingKeyString === newKeyString) {
        return id;
      }
    }

    return null;
  }, [shortcuts]);

  // Update a shortcut
  const updateShortcut = useCallback((id: ShortcutId, keys: string[]): { success: boolean; conflict?: ShortcutId } => {
    // Check if this shortcut is editable
    if (!DEFAULT_SHORTCUTS[id].editable) {
      return { success: false };
    }

    // Check for conflicts
    const conflictId = hasConflict(keys, id);
    if (conflictId) {
      return { success: false, conflict: conflictId };
    }

    // Update shortcuts
    setCustomShortcuts((prev) => {
      const newShortcuts = { ...prev, [id]: keys };

      // If the new keys match the default, remove from custom
      if (keysToKeymapString(keys) === keysToKeymapString(DEFAULT_SHORTCUTS[id].keys)) {
        delete newShortcuts[id];
      }

      // Save to database in background
      if (session?.user?.id) {
        saveToDatabase(newShortcuts);
      }

      return newShortcuts;
    });

    return { success: true };
  }, [hasConflict, session?.user?.id, saveToDatabase]);

  // Reset a specific shortcut to default
  const resetShortcut = useCallback((id: ShortcutId) => {
    setCustomShortcuts((prev) => {
      const newShortcuts = { ...prev };
      delete newShortcuts[id];

      if (session?.user?.id) {
        saveToDatabase(newShortcuts);
      }

      return newShortcuts;
    });
  }, [session?.user?.id, saveToDatabase]);

  // Reset all shortcuts to defaults
  const resetAllShortcuts = useCallback(() => {
    setCustomShortcuts({});

    if (session?.user?.id) {
      saveToDatabase({});
    }
  }, [session?.user?.id, saveToDatabase]);

  // Check if a shortcut has been customized
  const isCustomized = useCallback((id: ShortcutId): boolean => {
    return id in customShortcuts;
  }, [customShortcuts]);

  const value: ShortcutsContextType = {
    shortcuts,
    getShortcut,
    getShortcutDisplay,
    getKeymapString,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    hasConflict,
    isCustomized,
    isLoaded,
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (context === undefined) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}

// Hook for getting a single shortcut's display value (convenience)
export function useShortcutDisplay(id: ShortcutId): string {
  const { getShortcutDisplay, isLoaded } = useShortcuts();

  if (!isLoaded) {
    return formatKeysForDisplay(DEFAULT_SHORTCUTS[id].keys);
  }

  return getShortcutDisplay(id);
}
