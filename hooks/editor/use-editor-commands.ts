'use client';

/**
 * Hook providing editor command callbacks for formatting and element manipulation.
 */

import { useCallback, type MutableRefObject } from 'react';
import { EditorView } from 'prosemirror-view';
import { undo, redo } from 'prosemirror-history';
import { screenplaySchema, ElementType, serializeForStorage } from '@/lib/prosemirror';
import { applySuggestion } from '@/lib/prosemirror/plugins';
import { yjsUndo, yjsRedo } from '@/lib/prosemirror/plugins/yjs-collaboration';
import type { AutocompleteSuggestion } from '@/lib/prosemirror/plugins';

export interface EditorCommands {
  // History
  undo: () => void;
  redo: () => void;

  // Focus
  focus: () => void;

  // Element type
  setElementType: (type: ElementType) => void;
  insertSceneHeading: () => void;
  insertAction: () => void;
  insertCharacter: () => void;
  insertDialogue: () => void;
  insertParenthetical: () => void;
  insertTransition: () => void;

  // Formatting
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;

  // Content
  getContent: () => string;
  getPlainText: () => string;

  // Autocomplete
  applyAutocompleteSuggestion: (suggestion: AutocompleteSuggestion) => void;
}

export interface UseEditorCommandsOptions {
  /** Whether Yjs collaboration is enabled (uses different undo/redo commands) */
  isYjsEnabled?: boolean;
}

/**
 * Creates editor command callbacks bound to a view reference.
 */
export function useEditorCommands(
  viewRef: MutableRefObject<EditorView | null>,
  options: UseEditorCommandsOptions = {}
): EditorCommands {
  const { isYjsEnabled = false } = options;

  // Undo command - uses Yjs undo when collaboration is enabled
  const handleUndo = useCallback(() => {
    const view = viewRef.current;
    if (view) {
      if (isYjsEnabled) {
        yjsUndo(view.state, view.dispatch);
      } else {
        undo(view.state, view.dispatch);
      }
      view.focus();
    }
  }, [viewRef, isYjsEnabled]);

  // Redo command - uses Yjs redo when collaboration is enabled
  const handleRedo = useCallback(() => {
    const view = viewRef.current;
    if (view) {
      if (isYjsEnabled) {
        yjsRedo(view.state, view.dispatch);
      } else {
        redo(view.state, view.dispatch);
      }
      view.focus();
    }
  }, [viewRef, isYjsEnabled]);

  // Focus the editor
  const focus = useCallback(() => {
    viewRef.current?.focus();
  }, [viewRef]);

  // Set element type at current selection
  const setElementType = useCallback((type: ElementType) => {
    const view = viewRef.current;
    if (!view) return;

    const { state, dispatch } = view;
    const { $from, $to } = state.selection;
    const nodeType = screenplaySchema.nodes[type];

    if (!nodeType) return;

    // Create transaction to change node type
    const tr = state.tr.setBlockType($from.pos, $to.pos, nodeType);
    dispatch(tr);
    view.focus();
  }, [viewRef]);

  // Insert element commands
  const insertSceneHeading = useCallback(() => setElementType('scene_heading'), [setElementType]);
  const insertAction = useCallback(() => setElementType('action'), [setElementType]);
  const insertCharacter = useCallback(() => setElementType('character'), [setElementType]);
  const insertDialogue = useCallback(() => setElementType('dialogue'), [setElementType]);
  const insertParenthetical = useCallback(() => setElementType('parenthetical'), [setElementType]);
  const insertTransition = useCallback(() => setElementType('transition'), [setElementType]);

  // Toggle mark (bold/italic/underline)
  const toggleMark = useCallback((markType: 'bold' | 'italic' | 'underline') => {
    const view = viewRef.current;
    if (!view) return;

    // Focus first to preserve selection when clicking toolbar buttons
    view.focus();

    const { state, dispatch } = view;
    const mark = screenplaySchema.marks[markType];
    const { from, to } = state.selection;

    // Only apply mark if there's actual text selected
    if (from === to) return;

    if (state.doc.rangeHasMark(from, to, mark)) {
      dispatch(state.tr.removeMark(from, to, mark));
    } else {
      dispatch(state.tr.addMark(from, to, mark.create()));
    }
  }, [viewRef]);

  const toggleBold = useCallback(() => toggleMark('bold'), [toggleMark]);
  const toggleItalic = useCallback(() => toggleMark('italic'), [toggleMark]);
  const toggleUnderline = useCallback(() => toggleMark('underline'), [toggleMark]);

  // Get content as JSON string
  const getContent = useCallback(() => {
    const view = viewRef.current;
    if (!view) return '';
    return serializeForStorage(view.state.doc);
  }, [viewRef]);

  // Get content as plain text
  const getPlainText = useCallback(() => {
    const view = viewRef.current;
    if (!view) return '';
    return view.state.doc.textContent;
  }, [viewRef]);

  // Apply autocomplete suggestion
  const applyAutocompleteSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    const view = viewRef.current;
    if (!view) return;
    applySuggestion(view, suggestion);
    view.focus();
  }, [viewRef]);

  return {
    undo: handleUndo,
    redo: handleRedo,
    focus,
    setElementType,
    insertSceneHeading,
    insertAction,
    insertCharacter,
    insertDialogue,
    insertParenthetical,
    insertTransition,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    getContent,
    getPlainText,
    applyAutocompleteSuggestion,
  };
}
