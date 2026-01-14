'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

/**
 * Command palette state.
 * Replaces window.dispatchEvent('command-palette-open') pattern.
 */
interface CommandPaletteContextValue {
  /** Whether the command palette is open */
  isOpen: boolean;

  /** Open the command palette */
  open: () => void;

  /** Close the command palette */
  close: () => void;

  /** Toggle the command palette */
  toggle: () => void;

  /** Set open state directly */
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

interface CommandPaletteProviderProps {
  children: ReactNode;
}

/**
 * Provider for command palette state.
 * Place this at the app layout level.
 */
export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      setOpen,
    }),
    [isOpen, open, close, toggle, setOpen]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

/**
 * Hook to access command palette state.
 * Returns no-op functions if not inside provider.
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);

  if (!context) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      setOpen: () => {},
    };
  }

  return context;
}

/**
 * Hook that requires command palette context - throws if not available.
 */
export function useCommandPaletteStrict(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPaletteStrict must be used within CommandPaletteProvider');
  }
  return context;
}
