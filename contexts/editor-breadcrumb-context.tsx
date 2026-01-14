'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

/**
 * Breadcrumb data for series episode navigation.
 * Replaces window.dispatchEvent('screenplay-breadcrumb-update') pattern.
 */
export interface BreadcrumbData {
  series: { id: string; title: string };
  season?: { id: string; number: number; title?: string | null } | null;
  episode?: { episode: number | null; episodeTitle: string | null } | null;
}

interface EditorBreadcrumbContextValue {
  /** Current breadcrumb data (null if not in a series episode) */
  breadcrumb: BreadcrumbData | null;

  /** Set breadcrumb data (called by editor when loading a series episode) */
  setBreadcrumb: (data: BreadcrumbData | null) => void;

  /** Clear breadcrumb (called when navigating away) */
  clearBreadcrumb: () => void;
}

const EditorBreadcrumbContext = createContext<EditorBreadcrumbContextValue | null>(null);

interface EditorBreadcrumbProviderProps {
  children: ReactNode;
}

/**
 * Provider for editor breadcrumb data.
 * Place this at the app layout level so it persists across editor/non-editor pages.
 */
export function EditorBreadcrumbProvider({ children }: EditorBreadcrumbProviderProps) {
  const [breadcrumb, setBreadcrumbState] = useState<BreadcrumbData | null>(null);

  const setBreadcrumb = useCallback((data: BreadcrumbData | null) => {
    setBreadcrumbState(data);
  }, []);

  const clearBreadcrumb = useCallback(() => {
    setBreadcrumbState(null);
  }, []);

  const value = useMemo<EditorBreadcrumbContextValue>(
    () => ({
      breadcrumb,
      setBreadcrumb,
      clearBreadcrumb,
    }),
    [breadcrumb, setBreadcrumb, clearBreadcrumb]
  );

  return (
    <EditorBreadcrumbContext.Provider value={value}>
      {children}
    </EditorBreadcrumbContext.Provider>
  );
}

/**
 * Hook to access breadcrumb data.
 * Returns null breadcrumb if not inside provider.
 */
export function useEditorBreadcrumb(): EditorBreadcrumbContextValue {
  const context = useContext(EditorBreadcrumbContext);

  if (!context) {
    return {
      breadcrumb: null,
      setBreadcrumb: () => {},
      clearBreadcrumb: () => {},
    };
  }

  return context;
}

/**
 * Hook that requires breadcrumb context - throws if not available.
 */
export function useEditorBreadcrumbStrict(): EditorBreadcrumbContextValue {
  const context = useContext(EditorBreadcrumbContext);
  if (!context) {
    throw new Error('useEditorBreadcrumbStrict must be used within EditorBreadcrumbProvider');
  }
  return context;
}
