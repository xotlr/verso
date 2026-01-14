'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use useEditorSession from '@/contexts/editor-session-context' instead.
 */

import React from 'react';
import {
  useEditorSession,
  useEditorSessionStrict,
  EditorSessionProvider,
  type EditorCommandHandlers,
} from './editor-session-context';

// Re-export types
export type { EditorCommandHandlers };

interface EditorCommandsProviderProps {
  children: React.ReactNode;
  screenplayId: string;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenVersionHistory: () => void;
  onSaveTitle: (title: string) => void;
}

/**
 * @deprecated Use EditorSessionProvider instead.
 */
export function EditorCommandsProvider({
  children,
  screenplayId,
  onOpenShare,
  onOpenExport,
  onOpenVersionHistory,
  onSaveTitle,
}: EditorCommandsProviderProps) {
  return (
    <EditorSessionProvider
      screenplayId={screenplayId}
      commands={{
        onOpenShare,
        onOpenExport,
        onOpenVersionHistory,
        onSaveTitle,
      }}
    >
      {children}
    </EditorSessionProvider>
  );
}

/**
 * @deprecated Use useEditorSession() instead.
 */
export function useEditorCommands() {
  const session = useEditorSession();
  return {
    openShare: session.openShare,
    openExport: session.openExport,
    openVersionHistory: session.openVersionHistory,
    openTimelapse: session.openTimelapse,
    saveTitle: session.saveTitle,
    isAvailable: session.isCommandsAvailable,
  };
}

/**
 * @deprecated Use useEditorSessionStrict() instead.
 */
export function useEditorCommandsStrict() {
  const session = useEditorSessionStrict();
  return {
    openShare: session.openShare,
    openExport: session.openExport,
    openVersionHistory: session.openVersionHistory,
    openTimelapse: session.openTimelapse,
    saveTitle: session.saveTitle,
    isAvailable: session.isCommandsAvailable,
  };
}
