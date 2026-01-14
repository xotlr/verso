import { useCallback } from 'react';
import type { EditorView } from 'prosemirror-view';
import { setElementType } from '@/lib/prosemirror/plugins/element-switching';
import { toggleBold, toggleItalic, toggleUnderline } from '@/lib/prosemirror/plugins/keymap';

/**
 * Hook for editor formatting actions.
 * Provides callbacks for text formatting and element insertion.
 */
export function useEditorFormatting(view: EditorView | null) {
  const handleInsertElement = useCallback((elementType: string) => {
    if (!view) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setElementType(elementType as any)(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const handleBold = useCallback(() => {
    if (!view) return;
    toggleBold(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const handleItalic = useCallback(() => {
    if (!view) return;
    toggleItalic(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const handleUnderline = useCallback(() => {
    if (!view) return;
    toggleUnderline(view.state, view.dispatch);
    view.focus();
  }, [view]);

  const focusEditor = useCallback(() => {
    view?.focus();
  }, [view]);

  return {
    handleInsertElement,
    handleBold,
    handleItalic,
    handleUnderline,
    focusEditor,
  };
}

export type EditorFormatting = ReturnType<typeof useEditorFormatting>;
