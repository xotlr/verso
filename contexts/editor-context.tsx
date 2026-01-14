'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use useEditorUI from '@/contexts/editor-ui-context' instead.
 */

import { useEditorUI, EditorUIProvider, type ViewMode } from './editor-ui-context';

// Re-export the new provider with the old name
export const EditorProvider = EditorUIProvider;

// Re-export hook with compatibility wrapper
export function useEditor() {
  const ctx = useEditorUI();

  // Construct the old shape for backward compatibility
  return {
    ui: {
      showFindReplace: ctx.showFindReplace,
      showSceneNavigator: false, // Deprecated - use panel system
      showCharacterList: false,  // Deprecated - use panel system
      showPageBreaks: ctx.showPageBreaks,
      showLineNumbers: ctx.showLineNumbers,
      zenMode: ctx.zenMode,
      viewMode: ctx.viewMode,
    },
    toggleFindReplace: ctx.toggleFindReplace,
    toggleSceneNavigator: () => ctx.setPanel('scenes'),
    toggleCharacterList: () => ctx.setPanel('characters'),
    togglePageBreaks: ctx.togglePageBreaks,
    toggleLineNumbers: ctx.toggleLineNumbers,
    toggleZenMode: ctx.toggleZenMode,
    setZenMode: ctx.setZenMode,
    setViewMode: ctx.setViewMode,
    selectedText: ctx.selectedText,
    setSelectedText: ctx.setSelectedText,
    isTyping: ctx.isTyping,
    setIsTyping: ctx.setIsTyping,
  };
}

// Re-export useEditorUI to maintain the existing export
export { useEditorUI };

// Re-export types
export type { ViewMode };
