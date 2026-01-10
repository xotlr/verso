'use client';

import { useCallback, useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';
import type { ViewMode } from '@/components/prosemirror/ProseMirrorEditor';
import type { HighlightColor } from '@/types/settings';

interface UseEditorSettingsOptions {
  defaultViewMode?: ViewMode;
  timelapseMode?: boolean;
  editable?: boolean;
}

/**
 * Consolidated hook for all editor-related settings.
 * Reduces multiple `useSettings()` calls and setting reads into a single hook.
 */
export function useEditorSettings(options: UseEditorSettingsOptions = {}) {
  const { defaultViewMode = 'discrete', timelapseMode = false, editable = true } = options;
  const { settings, updateSettings } = useSettings();

  // Derived settings with defaults
  const editorSettings = useMemo(() => {
    const editor = settings.editor;
    const layout = settings.layout;
    const ui = settings.interface;

    // In timelapse mode, always use discrete to show page frames
    const viewMode = timelapseMode ? 'discrete' : (editor.scrollMode ?? defaultViewMode);

    // Effective editable state: prop AND not reading mode
    const isReadingMode = editor.readingMode ?? false;
    const effectiveEditable = editable && !isReadingMode;

    return {
      // View/scroll mode
      viewMode,
      isDiscreteMode: viewMode === 'discrete',

      // Toolbar layout: 'verso' (separate floating) or 'maelle' (unified header)
      toolbarLayout: layout.toolbarLayout ?? 'verso',

      // Page styling
      pageStyle: editor.pageStyle ?? 'themed',
      paperColor: editor.paperColor ?? 'white',

      // Scene numbers
      showSceneNumbers: editor.showSceneNumbers ?? true,
      sceneNumberPosition: editor.sceneNumberPosition ?? 'both',

      // Editor behavior
      showPlaceholders: editor.showPlaceholders ?? true,
      typewriterMode: editor.typewriterMode ?? false,

      // Reading mode
      isReadingMode,
      effectiveEditable,

      // Beginner tips
      showBeginnerTips: editor.showBeginnerTips ?? false,

      // Highlighting
      highlightColor: (editor.highlightColor ?? 'yellow') as HighlightColor,

      // Text input
      spellcheck: editor.spellcheck ?? true,
      autoCapitalize: editor.autoCapitalize ?? true,

      // UI settings
      showStatsBar: ui.showStatsBar ?? true,
      showPageNumbers: ui.showPageNumbers ?? true,
    };
  }, [settings, defaultViewMode, timelapseMode, editable]);

  // Toggle reading mode
  const toggleReadingMode = useCallback(() => {
    updateSettings({
      editor: {
        ...settings.editor,
        readingMode: !settings.editor.readingMode,
      },
    });
  }, [updateSettings, settings.editor]);

  // Update highlight color
  const setHighlightColor = useCallback((color: HighlightColor) => {
    updateSettings({
      editor: {
        ...settings.editor,
        highlightColor: color,
      },
    });
  }, [updateSettings, settings.editor]);

  return {
    ...editorSettings,
    toggleReadingMode,
    setHighlightColor,
    // Expose raw settings for edge cases
    rawSettings: settings,
    updateSettings,
  };
}
