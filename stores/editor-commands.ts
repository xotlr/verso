'use client';

import { create } from 'zustand';

interface EditorCommandsState {
  // Command handlers (registered by editor, called by header)
  openShare: (() => void) | null;
  openExport: (() => void) | null;
  openVersionHistory: (() => void) | null;
  openTimelapse: (() => void) | null;
  saveTitle: ((title: string) => void) | null;

  // Register commands (called by editor on mount)
  register: (commands: {
    openShare: () => void;
    openExport: () => void;
    openVersionHistory: () => void;
    openTimelapse: () => void;
    saveTitle: (title: string) => void;
  }) => void;

  // Unregister commands (called by editor on unmount)
  unregister: () => void;
}

export const useEditorCommandsStore = create<EditorCommandsState>((set) => ({
  openShare: null,
  openExport: null,
  openVersionHistory: null,
  openTimelapse: null,
  saveTitle: null,

  register: (commands) => set({
    openShare: commands.openShare,
    openExport: commands.openExport,
    openVersionHistory: commands.openVersionHistory,
    openTimelapse: commands.openTimelapse,
    saveTitle: commands.saveTitle,
  }),

  unregister: () => set({
    openShare: null,
    openExport: null,
    openVersionHistory: null,
    openTimelapse: null,
    saveTitle: null,
  }),
}));
