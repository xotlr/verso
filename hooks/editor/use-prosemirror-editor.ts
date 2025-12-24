'use client';

/**
 * Main hook for ProseMirror screenplay editor.
 * Coordinates initialization, state management, and WASM pagination.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { undo, redo } from 'prosemirror-history';

import {
  screenplaySchema,
  ElementType,
  ELEMENT_DISPLAY_NAMES,
  deserializeFromStorage,
  serializeForStorage,
} from '@/lib/prosemirror';

import {
  createAllPlugins,
  autocompletePluginKey,
  updatePaginationState,
  updateSceneNumberingSettings,
} from '@/lib/prosemirror/plugins';
import type { AutocompleteState } from '@/lib/prosemirror/plugins';

import { usePagination } from './use-pagination';
import { useEditorCommands } from './use-editor-commands';
import {
  calculateWordCount,
  calculatePageCount,
  extractScenes,
  extractCharacters,
  extractShots,
  extractDetectedShotsFromDocument,
} from './document-extractors';
import type {
  UseProseMirrorEditorOptions,
  UseProseMirrorEditorReturn,
  SceneInfo,
} from './types';

// Re-export types for external use
export type { UseProseMirrorEditorOptions, UseProseMirrorEditorReturn, SceneInfo };
export type { CharacterInfo, ShotInfo } from './types';

// Re-export extractShots for use by other components
export { extractShots };

/**
 * Main hook for ProseMirror screenplay editor.
 */
export function useProseMirrorEditor(options: UseProseMirrorEditorOptions): UseProseMirrorEditorReturn {
  const { initialContent, onUpdate, onScenesChange, editable = true, showSceneNumbers = false, timelapseMode = false } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);
  const lastContentRef = useRef<string | null>(null);

  // Editor state
  const [currentElementType, setCurrentElementTypeState] = useState<ElementType>('action');
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState | null>(null);
  const [currentDoc, setCurrentDoc] = useState<ProseMirrorNode | null>(null);
  const [currentEditorState, setCurrentEditorState] = useState<EditorState | null>(null);

  // Track characters and locations for autocomplete
  const charactersRef = useRef<string[]>([]);
  const locationsRef = useRef<string[]>([]);
  const scenesRef = useRef<SceneInfo[]>([]);

  // Debounce refs
  const extractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Callback refs to avoid dependency issues
  const onUpdateRef = useRef(onUpdate);
  const onScenesChangeRef = useRef(onScenesChange);

  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onScenesChangeRef.current = onScenesChange; }, [onScenesChange]);

  // Callback to clear pagination change tracker after successful pagination
  const handlePaginationComplete = useCallback((createClearTr: (tr: Transaction) => Transaction) => {
    const view = viewRef.current;
    if (!view) return;

    // Dispatch transaction to clear accumulated changes
    const tr = createClearTr(view.state.tr);
    view.dispatch(tr);
  }, []);

  // WASM pagination engine with incremental pagination support
  const pagination = usePagination(currentDoc, {
    debounceMs: 150,
    enabled: true,
    editorState: currentEditorState,
    onPaginationComplete: handlePaginationComplete,
  });

  // Editor commands
  const commands = useEditorCommands(viewRef);

  // Update pagination plugin state when WASM results arrive
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !pagination.result) return;

    const positionMap = pagination.getPositionMap();
    updatePaginationState(view, pagination.result, positionMap);
    setPageCount(pagination.pageCount);
  }, [pagination.result, pagination.pageCount, pagination.getPositionMap]);

  // Create the editor state and view
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    const doc = deserializeFromStorage(initialContent);

    // Create all plugins with autocomplete callback
    const plugins = createAllPlugins({
      autocomplete: true,
      autocompleteOptions: {
        characters: charactersRef.current,
        locations: locationsRef.current,
        onStateChange: setAutocompleteState,
      },
      sceneNumberingOptions: {
        forceShow: showSceneNumbers,
      },
      onCoverPageDetected: (coverPage) => {
        // Cover page detection callback - no-op but could be used for future features
      },
    });

    // Create state
    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins,
    });

    // Create view with dispatch handler
    const view = new EditorView(containerRef.current, {
      state,
      editable: () => editable,
      dispatchTransaction(tr: Transaction) {
        const newState = view.state.apply(tr);
        view.updateState(newState);

        if (tr.docChanged) {
          const doc = newState.doc;
          setCurrentDoc(doc);
          setCurrentEditorState(newState); // For incremental pagination

          // Debounce stats calculations
          if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
          statsTimeoutRef.current = setTimeout(() => {
            setWordCount(calculateWordCount(doc));
            setPageCount(calculatePageCount(doc));
          }, 300);

          // Notify parent of content change
          if (onUpdateRef.current) {
            onUpdateRef.current(serializeForStorage(doc));
          }

          // Debounce scene/character extraction
          if (extractionTimeoutRef.current) clearTimeout(extractionTimeoutRef.current);
          extractionTimeoutRef.current = setTimeout(() => {
            const scenes = extractScenes(doc);
            const characters = extractCharacters(doc);
            const detectedShots = extractDetectedShotsFromDocument(doc, scenes);

            charactersRef.current = characters.map(c => c.name);
            locationsRef.current = scenes.map(s => s.location).filter((v, i, a) => v && a.indexOf(v) === i);
            scenesRef.current = scenes;

            if (onScenesChangeRef.current) {
              onScenesChangeRef.current(scenes, characters, detectedShots);
            }
          }, 300);
        }

        // Update autocomplete state
        const autocomplete = autocompletePluginKey.getState(newState) as AutocompleteState | undefined;
        if (autocomplete) setAutocompleteState(autocomplete);

        // Update current element type based on selection
        const { $head } = newState.selection;
        const parentType = $head.parent.type.name as ElementType;
        if (ELEMENT_DISPLAY_NAMES[parentType]) {
          setCurrentElementTypeState(parentType);
        }

        // Update current scene based on cursor position
        const cursorPos = newState.selection.from;
        let activeSceneId: string | null = null;
        for (const scene of scenesRef.current) {
          if (scene.position <= cursorPos) activeSceneId = scene.id;
          else break;
        }
        setCurrentSceneId(activeSceneId);

        // Update undo/redo state
        setCanUndo(undo(newState));
        setCanRedo(redo(newState));
      },
    });

    viewRef.current = view;
    isInitializedRef.current = true;

    // Initial stats and extraction
    setWordCount(calculateWordCount(doc));
    setPageCount(calculatePageCount(doc));
    setCurrentDoc(doc);
    setCurrentEditorState(state); // For incremental pagination
    setIsReady(true);

    const scenes = extractScenes(doc);
    const characters = extractCharacters(doc);
    const detectedShots = extractDetectedShotsFromDocument(doc, scenes);
    scenesRef.current = scenes;
    if (onScenesChangeRef.current) {
      onScenesChangeRef.current(scenes, characters, detectedShots);
    }

    // Track the initial content we used
    lastContentRef.current = initialContent;

    return () => {
      if (extractionTimeoutRef.current) clearTimeout(extractionTimeoutRef.current);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
      view.destroy();
      viewRef.current = null;
      isInitializedRef.current = false;
    };
  // In timelapse mode, don't recreate editor on content changes - we sync via transaction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, timelapseMode ? [editable] : [initialContent, editable]);

  // Timelapse mode: sync content changes via transaction (don't recreate editor)
  useEffect(() => {
    if (!timelapseMode) return;

    const view = viewRef.current;
    if (!view || !isInitializedRef.current) return;

    // Skip if content hasn't changed
    if (initialContent === lastContentRef.current) return;
    lastContentRef.current = initialContent;

    // Deserialize the new content
    const newDoc = deserializeFromStorage(initialContent);

    // Replace the entire document via transaction
    const tr = view.state.tr.replaceWith(
      0,
      view.state.doc.content.size,
      newDoc.content
    );
    tr.setMeta('addToHistory', false); // Don't add to undo history
    tr.setMeta('timelapse', true); // Mark as timelapse update

    // Dispatch the transaction to update the view
    view.dispatch(tr);

    // Explicitly update currentDoc to trigger pagination
    // Don't rely on dispatchTransaction chain which may not work reliably
    setCurrentDoc(view.state.doc);
  }, [timelapseMode, initialContent]);

  // Update scene numbering settings when showSceneNumbers changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !isInitializedRef.current) return;

    updateSceneNumberingSettings(view, { forceShow: showSceneNumbers });
  }, [showSceneNumbers]);

  return {
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    view: viewRef.current,

    // State
    currentElementType,
    currentSceneId,
    wordCount,
    pageCount,
    isReady,
    canUndo,
    canRedo,
    isWasmReady: pagination.isWasmReady,
    paginationTiming: pagination.timing?.lastDurationMs ?? null,
    paginationError: pagination.error,
    paginationResult: pagination.result,

    // Autocomplete
    autocompleteState,
    applyAutocompleteSuggestion: commands.applyAutocompleteSuggestion,

    // Commands
    undo: commands.undo,
    redo: commands.redo,
    focus: commands.focus,

    // Element commands
    setElementType: commands.setElementType,
    insertSceneHeading: commands.insertSceneHeading,
    insertAction: commands.insertAction,
    insertCharacter: commands.insertCharacter,
    insertDialogue: commands.insertDialogue,
    insertParenthetical: commands.insertParenthetical,
    insertTransition: commands.insertTransition,

    // Formatting
    toggleBold: commands.toggleBold,
    toggleItalic: commands.toggleItalic,
    toggleUnderline: commands.toggleUnderline,

    // Content
    getContent: commands.getContent,
    getPlainText: commands.getPlainText,
  };
}
