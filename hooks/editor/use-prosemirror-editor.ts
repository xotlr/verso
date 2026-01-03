'use client';

/**
 * Main hook for ProseMirror screenplay editor.
 * Coordinates initialization, state management, and WASM pagination.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import {
  screenplaySchema,
  ElementType,
  deserializeFromStorage,
  serializeForStorage,
} from '@/lib/prosemirror';

import {
  createAllPlugins,
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
import { createDispatchHandler } from './create-dispatch-handler';
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
  const {
    initialContent,
    onUpdate,
    onScenesChange,
    editable = true,
    showSceneNumbers = false,
    sceneNumberPosition = 'both',
    timelapseMode = false,
    // Yjs CRDT collaboration options
    yXmlFragment,
    awareness,
    yjsUserInfo,
    // Debug metrics callbacks (dev only)
    onKeystrokeLatency,
    onTransactionTime,
  } = options;

  // Track if Yjs collaboration is enabled
  const isYjsEnabled = !!(yXmlFragment && awareness);

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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Editor commands (uses Yjs undo/redo when collaboration is enabled)
  const commands = useEditorCommands(viewRef, { isYjsEnabled });

  // Update pagination plugin state when WASM results arrive
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !pagination.result) return;

    const positionMap = pagination.getPositionMap();
    updatePaginationState(view, pagination.result, positionMap);
    setPageCount(pagination.pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.result, pagination.pageCount, pagination.getPositionMap]);

  // Create the editor state and view
  useEffect(() => {
    // Prevent circular recreation when content changes come from our own edits:
    // 1. Typing modifies document → 2. onUpdate fires → 3. Parent updates state →
    // 4. New content prop flows down → 5. This effect runs → would destroy view
    // Fix: If view exists with same content, skip recreation
    if (viewRef.current && isInitializedRef.current && initialContent !== null) {
      try {
        const currentSerialized = serializeForStorage(viewRef.current.state.doc);
        if (currentSerialized === initialContent) {
          // Content is already in sync - skip recreation
          lastContentRef.current = initialContent;
          return;
        }
      } catch {
        // View might be in bad state, allow recreation
      }
    }

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
        enabled: showSceneNumbers,
        position: sceneNumberPosition,
      },
      onCoverPageDetected: (_coverPage) => {
        // Cover page detection callback - no-op but could be used for future features
      },
      // Yjs CRDT collaboration - when enabled, replaces prosemirror-history
      yjs: isYjsEnabled,
      yjsOptions: isYjsEnabled && yXmlFragment && awareness ? {
        yXmlFragment,
        awareness,
        cursorColor: yjsUserInfo?.color,
        cursorName: yjsUserInfo?.name,
      } : undefined,
      // Disable standard history when Yjs is enabled (Yjs has its own undo manager)
      history: !isYjsEnabled,
      // Debug typing metrics (dev only)
      typingMetrics: process.env.NODE_ENV === 'development',
      typingMetricsOptions: {
        onLatencyMeasured: onKeystrokeLatency,
        onTransactionProcessed: onTransactionTime,
      },
    });

    // Create state
    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins,
    });

    // Create dispatch handler with extracted logic for testability
    const dispatchTransaction = createDispatchHandler(
      {
        viewRef,
        charactersRef,
        locationsRef,
        scenesRef,
        isYjsEnabled,
        timeoutRefs: {
          stats: statsTimeoutRef,
          update: updateTimeoutRef,
          extraction: extractionTimeoutRef,
        },
        callbackRefs: {
          onUpdate: onUpdateRef,
          onScenesChange: onScenesChangeRef,
        },
      },
      {
        setCurrentDoc,
        setCurrentEditorState,
        setWordCount,
        setPageCount,
        setAutocompleteState,
        setCurrentElementType: setCurrentElementTypeState,
        setCurrentSceneId,
        setCanUndo,
        setCanRedo,
      }
    );

    // Create view with dispatch handler
    const view = new EditorView(containerRef.current, {
      state,
      editable: () => editable,
      dispatchTransaction,
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
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      view.destroy();
      viewRef.current = null;
      isInitializedRef.current = false;
    };
  // In timelapse mode, don't recreate editor on content changes - we sync via transaction
  // When Yjs is enabled, also recreate editor if collaboration settings change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, timelapseMode ? [editable, isYjsEnabled] : [initialContent, editable, isYjsEnabled, yXmlFragment, awareness]);

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

  // Update scene numbering settings when showSceneNumbers or position changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !isInitializedRef.current) return;

    updateSceneNumberingSettings(view, {
      enabled: showSceneNumbers,
      position: sceneNumberPosition,
    });
  }, [showSceneNumbers, sceneNumberPosition]);

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
