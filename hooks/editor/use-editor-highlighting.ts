'use client';

import { useState, useCallback, useEffect } from 'react';
import type { EditorView } from 'prosemirror-view';
import type { HighlightColor } from '@/types/settings';

interface UseEditorHighlightingOptions {
  view: EditorView | null;
  highlightColor: HighlightColor;
  onHighlightColorChange: (color: HighlightColor) => void;
}

/**
 * Hook for managing highlight and eraser mode in the editor.
 * Handles state, mouse events, and mark application/removal.
 */
export function useEditorHighlighting({
  view,
  highlightColor,
  onHighlightColorChange,
}: UseEditorHighlightingOptions) {
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);

  // Toggle highlight mode (mutually exclusive with eraser)
  const toggleHighlight = useCallback(() => {
    setIsHighlightActive(prev => {
      if (!prev) setIsEraserActive(false);
      return !prev;
    });
  }, []);

  // Toggle eraser mode (mutually exclusive with highlight)
  const toggleEraser = useCallback(() => {
    setIsEraserActive(prev => {
      if (!prev) setIsHighlightActive(false);
      return !prev;
    });
  }, []);

  // Apply highlight to current selection
  const applyHighlight = useCallback(() => {
    if (!view || !isHighlightActive) return;

    const { state, dispatch } = view;
    const { selection } = state;

    if (selection.empty) return;

    const highlightMark = state.schema.marks.highlight;
    if (!highlightMark) return;

    const mark = highlightMark.create({ color: highlightColor });
    const { from, to } = selection;
    const tr = state.tr.addMark(from, to, mark);
    dispatch(tr);
  }, [view, isHighlightActive, highlightColor]);

  // Remove highlight from current selection
  const removeHighlight = useCallback(() => {
    if (!view || !isEraserActive) return;

    const { state, dispatch } = view;
    const { selection } = state;

    if (selection.empty) return;

    const highlightMark = state.schema.marks.highlight;
    if (!highlightMark) return;

    const { from, to } = selection;
    const tr = state.tr.removeMark(from, to, highlightMark);
    dispatch(tr);
  }, [view, isEraserActive]);

  // Listen for mouseup to apply highlights
  useEffect(() => {
    if (!view || !isHighlightActive) return;

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        applyHighlight();
      });
    };

    const editorDOM = view.dom;
    editorDOM.addEventListener('mouseup', handleMouseUp);

    return () => {
      editorDOM.removeEventListener('mouseup', handleMouseUp);
    };
  }, [view, isHighlightActive, applyHighlight]);

  // Listen for mouseup to remove highlights when eraser is active
  useEffect(() => {
    if (!view || !isEraserActive) return;

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        removeHighlight();
      });
    };

    const editorDOM = view.dom;
    editorDOM.addEventListener('mouseup', handleMouseUp);

    return () => {
      editorDOM.removeEventListener('mouseup', handleMouseUp);
    };
  }, [view, isEraserActive, removeHighlight]);

  return {
    isHighlightActive,
    isEraserActive,
    toggleHighlight,
    toggleEraser,
    highlightColor,
    setHighlightColor: onHighlightColorChange,
  };
}
