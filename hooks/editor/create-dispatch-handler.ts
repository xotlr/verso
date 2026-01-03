/**
 * Extracted dispatch transaction handler for ProseMirror editor.
 * Separated for testability and maintainability.
 */

import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { undo, redo } from 'prosemirror-history';

import {
  ElementType,
  ELEMENT_DISPLAY_NAMES,
  serializeForStorage,
} from '@/lib/prosemirror';
import { autocompletePluginKey } from '@/lib/prosemirror/plugins';
import { yjsUndoCheck, yjsRedoCheck } from '@/lib/prosemirror/plugins/yjs-collaboration';
import type { AutocompleteState } from '@/lib/prosemirror/plugins';
import { EDITOR_DEBOUNCE } from '@/lib/constants/editor';

import {
  calculateWordCount,
  calculatePageCount,
  extractScenes,
  extractCharacters,
  extractDetectedShotsFromDocument,
} from './document-extractors';
import type { SceneInfo, CharacterInfo } from './types';
import type { DetectedShot } from '@/types/shotlist';

/** Dependencies that are passed to the dispatch handler */
export interface DispatchHandlerDeps {
  /** Reference to the editor view */
  viewRef: React.MutableRefObject<EditorView | null>;
  /** Reference to character names for autocomplete */
  charactersRef: React.MutableRefObject<string[]>;
  /** Reference to locations for autocomplete */
  locationsRef: React.MutableRefObject<string[]>;
  /** Reference to extracted scenes */
  scenesRef: React.MutableRefObject<SceneInfo[]>;
  /** Whether Yjs collaboration is enabled */
  isYjsEnabled: boolean;
  /** Refs for debounce timeouts */
  timeoutRefs: {
    stats: React.MutableRefObject<NodeJS.Timeout | null>;
    update: React.MutableRefObject<NodeJS.Timeout | null>;
    extraction: React.MutableRefObject<NodeJS.Timeout | null>;
  };
  /** Callback refs */
  callbackRefs: {
    onUpdate: React.MutableRefObject<((content: string) => void) | undefined>;
    onScenesChange: React.MutableRefObject<((
      scenes: SceneInfo[],
      characters: CharacterInfo[],
      detectedShots: DetectedShot[]
    ) => void) | undefined>;
  };
}

/** State setters for the dispatch handler */
export interface DispatchHandlerSetters {
  setCurrentDoc: (doc: ProseMirrorNode) => void;
  setCurrentEditorState: (state: EditorState) => void;
  setWordCount: (count: number) => void;
  setPageCount: (count: number) => void;
  setAutocompleteState: (state: AutocompleteState | null) => void;
  setCurrentElementType: (type: ElementType) => void;
  setCurrentSceneId: (id: string | null) => void;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;
}

/** Handle document changes - debounced stats, serialization, extraction */
export function handleDocChange(
  doc: ProseMirrorNode,
  deps: DispatchHandlerDeps,
  setters: DispatchHandlerSetters
): void {
  const { timeoutRefs, callbackRefs, charactersRef, locationsRef, scenesRef } = deps;
  const { setWordCount, setPageCount } = setters;

  // Debounce stats calculations
  if (timeoutRefs.stats.current) clearTimeout(timeoutRefs.stats.current);
  timeoutRefs.stats.current = setTimeout(() => {
    setWordCount(calculateWordCount(doc));
    setPageCount(calculatePageCount(doc));
  }, EDITOR_DEBOUNCE.STATS);

  // Debounce content serialization and parent notification (expensive!)
  if (timeoutRefs.update.current) clearTimeout(timeoutRefs.update.current);
  timeoutRefs.update.current = setTimeout(() => {
    if (callbackRefs.onUpdate.current) {
      callbackRefs.onUpdate.current(serializeForStorage(doc));
    }
  }, EDITOR_DEBOUNCE.CONTENT_UPDATE);

  // Debounce scene/character extraction
  if (timeoutRefs.extraction.current) clearTimeout(timeoutRefs.extraction.current);
  timeoutRefs.extraction.current = setTimeout(() => {
    const scenes = extractScenes(doc);
    const characters = extractCharacters(doc);
    const detectedShots = extractDetectedShotsFromDocument(doc, scenes);

    charactersRef.current = characters.map(c => c.name);
    locationsRef.current = scenes.map(s => s.location).filter((v, i, a) => v && a.indexOf(v) === i);
    scenesRef.current = scenes;

    if (callbackRefs.onScenesChange.current) {
      callbackRefs.onScenesChange.current(scenes, characters, detectedShots);
    }
  }, EDITOR_DEBOUNCE.EXTRACTION);
}

/** Update current element type based on selection */
export function updateCurrentElement(
  state: EditorState,
  setCurrentElementType: (type: ElementType) => void
): void {
  const { $head } = state.selection;
  const parentType = $head.parent.type.name as ElementType;
  if (ELEMENT_DISPLAY_NAMES[parentType]) {
    setCurrentElementType(parentType);
  }
}

/** Update current scene based on cursor position */
export function updateCurrentScene(
  state: EditorState,
  scenesRef: React.MutableRefObject<SceneInfo[]>,
  setCurrentSceneId: (id: string | null) => void
): void {
  const cursorPos = state.selection.from;
  let activeSceneId: string | null = null;
  for (const scene of scenesRef.current) {
    if (scene.position <= cursorPos) activeSceneId = scene.id;
    else break;
  }
  setCurrentSceneId(activeSceneId);
}

/** Update undo/redo availability state */
export function updateUndoRedoState(
  state: EditorState,
  isYjsEnabled: boolean,
  setCanUndo: (can: boolean) => void,
  setCanRedo: (can: boolean) => void
): void {
  if (isYjsEnabled) {
    setCanUndo(yjsUndoCheck(state));
    setCanRedo(yjsRedoCheck(state));
  } else {
    setCanUndo(undo(state));
    setCanRedo(redo(state));
  }
}

/** Update autocomplete state from plugin */
export function updateAutocompleteState(
  state: EditorState,
  setAutocompleteState: (state: AutocompleteState | null) => void
): void {
  const autocomplete = autocompletePluginKey.getState(state) as AutocompleteState | undefined;
  if (autocomplete) setAutocompleteState(autocomplete);
}

/**
 * Creates a dispatchTransaction handler for ProseMirror.
 * Extracted from useProseMirrorEditor for testability.
 */
export function createDispatchHandler(
  deps: DispatchHandlerDeps,
  setters: DispatchHandlerSetters
): (this: EditorView, tr: Transaction) => void {
  return function dispatchTransaction(this: EditorView, tr: Transaction) {
    const view = this;
    const newState = view.state.apply(tr);
    view.updateState(newState);

    if (tr.docChanged) {
      const doc = newState.doc;
      if (process.env.NODE_ENV === 'development') {
        console.log('[DispatchHandler] docChanged - calling setCurrentDoc:', {
          childCount: doc.content.childCount,
          contentSize: doc.content.size,
        });
      }
      setters.setCurrentDoc(doc);
      setters.setCurrentEditorState(newState);
      handleDocChange(doc, deps, setters);
    }

    // Update autocomplete state
    updateAutocompleteState(newState, setters.setAutocompleteState);

    // Update current element type based on selection
    updateCurrentElement(newState, setters.setCurrentElementType);

    // Update current scene based on cursor position
    updateCurrentScene(newState, deps.scenesRef, setters.setCurrentSceneId);

    // Update undo/redo state
    updateUndoRedoState(
      newState,
      deps.isYjsEnabled,
      setters.setCanUndo,
      setters.setCanRedo
    );
  };
}
