'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
  applySuggestion,
  updatePaginationState,
} from '@/lib/prosemirror/plugins';
import type { AutocompleteState, AutocompleteSuggestion } from '@/lib/prosemirror/plugins';
import { usePagination } from './usePagination';
import { detectTimeOfDay, type TimeOfDay } from '@/lib/prosemirror/utils/time-detection';

export interface UseProseMirrorEditorOptions {
  initialContent: string | null;
  onUpdate?: (content: string) => void;
  onScenesChange?: (scenes: SceneInfo[], characters: CharacterInfo[]) => void;
  editable?: boolean;
}

export interface SceneInfo {
  id: string;
  type: string;
  location: string;
  timeOfDay: string;
  sceneNumber: string | null;
  position: number;
  /** True if timeOfDay was inferred from keywords in the location, not explicitly stated */
  autoDetectedTimeOfDay?: boolean;
}

export interface CharacterInfo {
  id: string;
  name: string;
  dialogueCount: number;
}

export interface ShotInfo {
  id: string;
  shotType: string | null;
  subject: string | null;
  content: string;
  position: number;
  sceneId: string | null;
  linkedShotId: string | null;
}

export interface UseProseMirrorEditorReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  view: EditorView | null;

  // State
  currentElementType: ElementType;
  wordCount: number;
  pageCount: number;
  isReady: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isWasmReady: boolean;
  paginationTiming: number | null;
  paginationError: Error | null;

  // Pagination result for discrete page rendering
  paginationResult: import('@/lib/verso').PaginationResult | null;

  // Autocomplete
  autocompleteState: AutocompleteState | null;
  applyAutocompleteSuggestion: (suggestion: AutocompleteSuggestion) => void;

  // Commands
  undo: () => void;
  redo: () => void;
  focus: () => void;

  // Element commands
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
}

/**
 * Calculate word count from a ProseMirror document.
 */
function calculateWordCount(doc: ProseMirrorNode): number {
  let text = '';
  doc.descendants((node) => {
    if (node.isText) {
      text += node.text + ' ';
    }
    return true;
  });
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate page count (55 lines per page standard).
 */
function calculatePageCount(doc: ProseMirrorNode): number {
  let lineCount = 0;
  doc.forEach((node) => {
    const text = node.textContent;
    // Rough estimate: average 55 chars per line
    const nodeLines = Math.max(1, Math.ceil(text.length / 55));
    lineCount += nodeLines + 1; // +1 for spacing between elements
  });
  return Math.max(1, Math.ceil(lineCount / 55));
}

/**
 * Extract scene information from document.
 * Also runs time-of-day detection to mark auto-detected times.
 */
function extractScenes(doc: ProseMirrorNode): SceneInfo[] {
  const scenes: SceneInfo[] = [];
  let sceneIndex = 0;
  let previousTimeOfDay: TimeOfDay | undefined;

  doc.forEach((node, offset) => {
    if (node.type.name === 'scene_heading') {
      sceneIndex++;
      // Generate deterministic ID from scene index + position + content hash to ensure uniqueness
      const contentHash = node.textContent
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
      const id = node.attrs.id || `scene-${sceneIndex}-${offset}-${contentHash || 'empty'}`;

      // Run time detection to check if time was auto-detected from keywords
      const location = node.attrs.location || '';
      const explicitTime = node.attrs.timeOfDay;
      const detection = detectTimeOfDay(location, explicitTime, previousTimeOfDay);

      // Update previous time for next scene (for CONTINUOUS inheritance)
      previousTimeOfDay = detection.timeOfDay;

      scenes.push({
        id,
        type: node.attrs.type,
        location: node.attrs.location,
        timeOfDay: node.attrs.timeOfDay || detection.timeOfDay,
        sceneNumber: node.attrs.sceneNumber,
        position: offset,
        autoDetectedTimeOfDay: detection.autoDetected,
      });
    }
  });

  return scenes;
}

/**
 * Extract character information from document.
 */
function extractCharacters(doc: ProseMirrorNode): CharacterInfo[] {
  const characterMap = new Map<string, CharacterInfo>();

  doc.forEach((node) => {
    if (node.type.name === 'character') {
      const id = node.attrs.characterId || node.textContent.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const name = node.textContent.replace(/\s*\([^)]+\)\s*$/, '').trim();

      if (characterMap.has(id)) {
        const existing = characterMap.get(id)!;
        existing.dialogueCount++;
      } else {
        characterMap.set(id, { id, name, dialogueCount: 1 });
      }
    }
  });

  return Array.from(characterMap.values()).sort((a, b) => b.dialogueCount - a.dialogueCount);
}

/**
 * Extract shot information from document.
 * Returns shots with their scene context.
 */
function extractShots(doc: ProseMirrorNode, scenes: SceneInfo[]): ShotInfo[] {
  const shots: ShotInfo[] = [];
  let shotIndex = 0;

  doc.forEach((node, offset) => {
    if (node.type.name === 'shot') {
      shotIndex++;
      // Find which scene this shot belongs to
      let currentSceneId: string | null = null;
      for (const scene of scenes) {
        if (scene.position < offset) {
          currentSceneId = scene.id;
        } else {
          break;
        }
      }

      // Generate deterministic ID
      const contentHash = node.textContent
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
      const id = `shot-${shotIndex}-${offset}-${contentHash || 'empty'}`;

      shots.push({
        id,
        shotType: node.attrs.shotType || null,
        subject: node.attrs.subject || null,
        content: node.textContent,
        position: offset,
        sceneId: currentSceneId,
        linkedShotId: node.attrs.linkedShotId || null,
      });
    }
  });

  return shots;
}

// Export extractShots for use by other components
export { extractShots };

/**
 * Main hook for ProseMirror screenplay editor.
 */
export function useProseMirrorEditor(options: UseProseMirrorEditorOptions): UseProseMirrorEditorReturn {
  const { initialContent, onUpdate, onScenesChange, editable = true } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);

  const [currentElementType, setCurrentElementTypeState] = useState<ElementType>('action');
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState | null>(null);
  const [currentDoc, setCurrentDoc] = useState<ProseMirrorNode | null>(null);

  // Track characters and locations for autocomplete
  const charactersRef = useRef<string[]>([]);
  const locationsRef = useRef<string[]>([]);

  // Debounce extraction to avoid running on every keystroke
  const extractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce word/page count calculations
  const statsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const onUpdateRef = useRef(onUpdate);
  const onScenesChangeRef = useRef(onScenesChange);

  // Keep refs updated
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onScenesChangeRef.current = onScenesChange;
  }, [onScenesChange]);

  // Use WASM pagination engine
  const pagination = usePagination(currentDoc, {
    debounceMs: 150,
    enabled: true,
  });

  // Update pagination plugin state when WASM results arrive
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !pagination.result) {
      return;
    }

    // Get the position map that was created during serialization.
    // This ensures element IDs in the WASM result match the correct document positions.
    const positionMap = pagination.getPositionMap();

    // Update the pagination plugin with WASM results and the matching position map
    updatePaginationState(view, pagination.result, positionMap);

    // Also update the page count from WASM
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
      // Cover page detection on paste
      onCoverPageDetected: (coverPage) => {
        // Log cover page detection for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('[ProseMirror] Cover page detected:', coverPage);
        }
        // TODO: Connect to document metadata storage
        // This could emit an event or call a callback prop to update
        // the screenplay's title, author, logline, etc.
      },
    });

    // Create state
    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins,
    });

    // Create view
    const view = new EditorView(containerRef.current, {
      state,
      editable: () => editable,
      dispatchTransaction(tr: Transaction) {
        const newState = view.state.apply(tr);
        view.updateState(newState);

        // Update local state
        if (tr.docChanged) {
          const doc = newState.doc;
          setCurrentDoc(doc); // Trigger WASM pagination (already debounced in usePagination)

          // Debounce expensive word/page count calculations
          if (statsTimeoutRef.current) {
            clearTimeout(statsTimeoutRef.current);
          }
          statsTimeoutRef.current = setTimeout(() => {
            setWordCount(calculateWordCount(doc));
            setPageCount(calculatePageCount(doc)); // Fallback, will be updated by WASM
          }, 300); // 300ms debounce for stats

          // Notify parent of content change
          if (onUpdateRef.current) {
            onUpdateRef.current(serializeForStorage(doc));
          }

          // Debounce scene/character extraction (300ms) to avoid running on every keystroke
          if (extractionTimeoutRef.current) {
            clearTimeout(extractionTimeoutRef.current);
          }

          extractionTimeoutRef.current = setTimeout(() => {
            const scenes = extractScenes(doc);
            const characters = extractCharacters(doc);

            // Update autocomplete data
            charactersRef.current = characters.map(c => c.name);
            locationsRef.current = scenes.map(s => s.location).filter((v, i, a) => v && a.indexOf(v) === i);

            if (onScenesChangeRef.current) {
              onScenesChangeRef.current(scenes, characters);
            }
          }, 300);
        }

        // Update autocomplete state
        const autocomplete = autocompletePluginKey.getState(newState) as AutocompleteState | undefined;
        if (autocomplete) {
          setAutocompleteState(autocomplete);
        }

        // Update current element type based on selection
        const { $head } = newState.selection;
        const parentType = $head.parent.type.name as ElementType;
        if (ELEMENT_DISPLAY_NAMES[parentType]) {
          setCurrentElementTypeState(parentType);
        }

        // Update undo/redo state
        setCanUndo(undo(newState));
        setCanRedo(redo(newState));
      },
    });

    viewRef.current = view;
    isInitializedRef.current = true;

    // Initial stats
    setWordCount(calculateWordCount(doc));
    setPageCount(calculatePageCount(doc));
    setCurrentDoc(doc); // Initial document for WASM pagination
    setIsReady(true);

    // Initial scene/character extraction
    if (onScenesChangeRef.current) {
      const scenes = extractScenes(doc);
      const characters = extractCharacters(doc);
      onScenesChangeRef.current(scenes, characters);
    }

    return () => {
      // Clean up timeouts
      if (extractionTimeoutRef.current) {
        clearTimeout(extractionTimeoutRef.current);
      }
      if (statsTimeoutRef.current) {
        clearTimeout(statsTimeoutRef.current);
      }
      view.destroy();
      viewRef.current = null;
      isInitializedRef.current = false;
    };
  }, [initialContent, editable]);

  // Undo command
  const handleUndo = useCallback(() => {
    const view = viewRef.current;
    if (view) {
      undo(view.state, view.dispatch);
      view.focus();
    }
  }, []);

  // Redo command
  const handleRedo = useCallback(() => {
    const view = viewRef.current;
    if (view) {
      redo(view.state, view.dispatch);
      view.focus();
    }
  }, []);

  // Focus the editor
  const focus = useCallback(() => {
    viewRef.current?.focus();
  }, []);

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
  }, []);

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

    const { state, dispatch } = view;
    const mark = screenplaySchema.marks[markType];
    const { from, to } = state.selection;

    if (state.doc.rangeHasMark(from, to, mark)) {
      dispatch(state.tr.removeMark(from, to, mark));
    } else {
      dispatch(state.tr.addMark(from, to, mark.create()));
    }
    view.focus();
  }, []);

  const toggleBold = useCallback(() => toggleMark('bold'), [toggleMark]);
  const toggleItalic = useCallback(() => toggleMark('italic'), [toggleMark]);
  const toggleUnderline = useCallback(() => toggleMark('underline'), [toggleMark]);

  // Get content as JSON string
  const getContent = useCallback(() => {
    const view = viewRef.current;
    if (!view) return '';
    return serializeForStorage(view.state.doc);
  }, []);

  // Get content as plain text
  const getPlainText = useCallback(() => {
    const view = viewRef.current;
    if (!view) return '';
    return view.state.doc.textContent;
  }, []);

  // Apply autocomplete suggestion
  const applyAutocompleteSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    const view = viewRef.current;
    if (!view) return;
    applySuggestion(view, suggestion);
    view.focus();
  }, []);

  return {
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    view: viewRef.current,

    // State
    currentElementType,
    wordCount,
    pageCount,
    isReady,
    canUndo,
    canRedo,
    isWasmReady: pagination.isWasmReady,
    paginationTiming: pagination.timing?.lastDurationMs ?? null,
    paginationError: pagination.error,

    // Pagination result for discrete page rendering
    paginationResult: pagination.result,

    // Autocomplete
    autocompleteState,
    applyAutocompleteSuggestion,

    // Commands
    undo: handleUndo,
    redo: handleRedo,
    focus,

    // Element commands
    setElementType,
    insertSceneHeading,
    insertAction,
    insertCharacter,
    insertDialogue,
    insertParenthetical,
    insertTransition,

    // Formatting
    toggleBold,
    toggleItalic,
    toggleUnderline,

    // Content
    getContent,
    getPlainText,
  };
}
