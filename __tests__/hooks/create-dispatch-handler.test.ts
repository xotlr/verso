import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { history } from 'prosemirror-history';

// Hoist the mock to avoid initialization order issues
const { mockAutocompletePluginKey } = vi.hoisted(() => ({
  mockAutocompletePluginKey: {
    getState: vi.fn().mockReturnValue(null),
  },
}));

// Mock dependencies
vi.mock('@/lib/prosemirror', () => ({
  ELEMENT_DISPLAY_NAMES: {
    action: 'Action',
    scene_heading: 'Scene Heading',
    character: 'Character',
    dialogue: 'Dialogue',
    parenthetical: 'Parenthetical',
    transition: 'Transition',
  },
  serializeForStorage: vi.fn((doc) => JSON.stringify({ content: doc.textContent })),
}));

vi.mock('@/lib/prosemirror/plugins', () => ({
  autocompletePluginKey: mockAutocompletePluginKey,
}));

vi.mock('@/lib/prosemirror/plugins/yjs-collaboration', () => ({
  yjsUndoCheck: vi.fn().mockReturnValue(false),
  yjsRedoCheck: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/constants/editor', () => ({
  EDITOR_DEBOUNCE: {
    STATS: 100,
    CONTENT_UPDATE: 50,
    EXTRACTION: 100,
    PAGINATION: 50,
  },
}));

vi.mock('@/hooks/editor/document-extractors', () => ({
  calculateWordCount: vi.fn().mockReturnValue(42),
  calculatePageCount: vi.fn().mockReturnValue(2),
  extractScenes: vi.fn().mockReturnValue([
    { id: 'scene-1', number: 1, heading: 'INT. OFFICE - DAY', position: 0, location: 'OFFICE' },
  ]),
  extractCharacters: vi.fn().mockReturnValue([
    { name: 'JOHN', lineCount: 10, sceneAppearances: ['scene-1'] },
  ]),
  extractDetectedShotsFromDocument: vi.fn().mockReturnValue([]),
}));

// Now import after mocks
import {
  handleDocChange,
  updateCurrentElement,
  updateCurrentScene,
  updateUndoRedoState,
  updateAutocompleteState,
  createDispatchHandler,
  type DispatchHandlerDeps,
  type DispatchHandlerSetters,
} from '@/hooks/editor/create-dispatch-handler';
import * as extractors from '@/hooks/editor/document-extractors';
import * as prosemirror from '@/lib/prosemirror';
import * as yjsCollab from '@/lib/prosemirror/plugins/yjs-collaboration';

// Simple test schema with toDOM specs for EditorView
const testSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    action: {
      group: 'block',
      content: 'text*',
      toDOM: () => ['p', { class: 'action' }, 0],
    },
    scene_heading: {
      group: 'block',
      content: 'text*',
      toDOM: () => ['p', { class: 'scene-heading' }, 0],
    },
    text: { inline: true },
  },
});

function createDoc(text: string) {
  return testSchema.node('doc', null, [
    testSchema.node('action', null, text ? [testSchema.text(text)] : []),
  ]);
}

function createMockDeps(): DispatchHandlerDeps {
  return {
    viewRef: { current: null },
    charactersRef: { current: [] },
    locationsRef: { current: [] },
    scenesRef: { current: [] },
    isYjsEnabled: false,
    timeoutRefs: {
      stats: { current: null },
      update: { current: null },
      extraction: { current: null },
    },
    callbackRefs: {
      onUpdate: { current: undefined },
      onScenesChange: { current: undefined },
    },
  };
}

function createMockSetters(): DispatchHandlerSetters {
  return {
    setCurrentDoc: vi.fn(),
    setCurrentEditorState: vi.fn(),
    setWordCount: vi.fn(),
    setPageCount: vi.fn(),
    setAutocompleteState: vi.fn(),
    setCurrentElementType: vi.fn(),
    setCurrentSceneId: vi.fn(),
    setCanUndo: vi.fn(),
    setCanRedo: vi.fn(),
  };
}

describe('create-dispatch-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleDocChange', () => {
    it('debounces stats calculations', async () => {
      const doc = createDoc('Test content');
      const deps = createMockDeps();
      const setters = createMockSetters();

      handleDocChange(doc, deps, setters);

      // Stats not called immediately
      expect(setters.setWordCount).not.toHaveBeenCalled();

      // Fast forward past debounce
      vi.advanceTimersByTime(150);

      expect(setters.setWordCount).toHaveBeenCalledWith(42);
      expect(setters.setPageCount).toHaveBeenCalledWith(2);
    });

    it('debounces content serialization and calls onUpdate', async () => {
      const doc = createDoc('Test content');
      const deps = createMockDeps();
      const setters = createMockSetters();
      const onUpdate = vi.fn();
      deps.callbackRefs.onUpdate.current = onUpdate;

      handleDocChange(doc, deps, setters);

      // Not called immediately
      expect(onUpdate).not.toHaveBeenCalled();

      // Fast forward past debounce
      vi.advanceTimersByTime(100);

      expect(onUpdate).toHaveBeenCalled();
      expect(prosemirror.serializeForStorage).toHaveBeenCalledWith(doc);
    });

    it('debounces scene/character extraction', async () => {
      const doc = createDoc('Test content');
      const deps = createMockDeps();
      const setters = createMockSetters();
      const onScenesChange = vi.fn();
      deps.callbackRefs.onScenesChange.current = onScenesChange;

      handleDocChange(doc, deps, setters);

      // Not called immediately
      expect(onScenesChange).not.toHaveBeenCalled();

      // Fast forward past debounce
      vi.advanceTimersByTime(150);

      expect(extractors.extractScenes).toHaveBeenCalledWith(doc);
      expect(extractors.extractCharacters).toHaveBeenCalledWith(doc);
      expect(onScenesChange).toHaveBeenCalled();
    });

    it('clears previous timeouts on rapid calls', () => {
      const doc = createDoc('Test');
      const deps = createMockDeps();
      const setters = createMockSetters();

      handleDocChange(doc, deps, setters);
      handleDocChange(doc, deps, setters);
      handleDocChange(doc, deps, setters);

      vi.advanceTimersByTime(150);

      // Should only be called once despite multiple handleDocChange calls
      expect(setters.setWordCount).toHaveBeenCalledTimes(1);
    });

    it('updates refs with extracted data', async () => {
      const doc = createDoc('Test');
      const deps = createMockDeps();
      const setters = createMockSetters();

      handleDocChange(doc, deps, setters);
      vi.advanceTimersByTime(150);

      expect(deps.charactersRef.current).toContain('JOHN');
      expect(deps.locationsRef.current).toContain('OFFICE');
      expect(deps.scenesRef.current).toHaveLength(1);
    });
  });

  describe('updateCurrentElement', () => {
    it('updates element type for known element', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const setCurrentElementType = vi.fn();

      updateCurrentElement(state, setCurrentElementType);

      expect(setCurrentElementType).toHaveBeenCalledWith('action');
    });

    it('does not update for unknown element types', () => {
      const doc = testSchema.node('doc', null, [
        testSchema.node('action', null, [testSchema.text('test')]),
      ]);
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const setCurrentElementType = vi.fn();

      // Mock ELEMENT_DISPLAY_NAMES to exclude 'action'
      const originalNames = (prosemirror as { ELEMENT_DISPLAY_NAMES: Record<string, string> }).ELEMENT_DISPLAY_NAMES;
      (prosemirror as { ELEMENT_DISPLAY_NAMES: Record<string, string> }).ELEMENT_DISPLAY_NAMES = {};

      updateCurrentElement(state, setCurrentElementType);

      expect(setCurrentElementType).not.toHaveBeenCalled();

      // Restore
      (prosemirror as { ELEMENT_DISPLAY_NAMES: Record<string, string> }).ELEMENT_DISPLAY_NAMES = originalNames;
    });
  });

  describe('updateCurrentScene', () => {
    it('finds active scene based on cursor position', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const scenesRef = {
        current: [
          { id: 'scene-1', type: 'INT', location: 'OFFICE', timeOfDay: 'DAY', sceneNumber: '1', position: 0 },
          { id: 'scene-2', type: 'EXT', location: 'STREET', timeOfDay: 'NIGHT', sceneNumber: '2', position: 50 },
        ],
      } as React.MutableRefObject<Array<{ id: string; type: string; location: string; timeOfDay: string; sceneNumber: string | null; position: number }>>;
      const setCurrentSceneId = vi.fn();

      updateCurrentScene(state, scenesRef, setCurrentSceneId);

      expect(setCurrentSceneId).toHaveBeenCalledWith('scene-1');
    });

    it('returns null when cursor is before any scene', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const scenesRef = {
        current: [
          { id: 'scene-1', type: 'INT', location: 'OFFICE', timeOfDay: 'DAY', sceneNumber: '1', position: 100 },
        ],
      } as React.MutableRefObject<Array<{ id: string; type: string; location: string; timeOfDay: string; sceneNumber: string | null; position: number }>>;
      const setCurrentSceneId = vi.fn();

      updateCurrentScene(state, scenesRef, setCurrentSceneId);

      expect(setCurrentSceneId).toHaveBeenCalledWith(null);
    });
  });

  describe('updateUndoRedoState', () => {
    it('uses standard undo/redo when Yjs is disabled', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const setCanUndo = vi.fn();
      const setCanRedo = vi.fn();

      updateUndoRedoState(state, false, setCanUndo, setCanRedo);

      expect(setCanUndo).toHaveBeenCalled();
      expect(setCanRedo).toHaveBeenCalled();
      expect(yjsCollab.yjsUndoCheck).not.toHaveBeenCalled();
    });

    it('uses Yjs undo/redo when Yjs is enabled', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const setCanUndo = vi.fn();
      const setCanRedo = vi.fn();

      updateUndoRedoState(state, true, setCanUndo, setCanRedo);

      expect(yjsCollab.yjsUndoCheck).toHaveBeenCalledWith(state);
      expect(yjsCollab.yjsRedoCheck).toHaveBeenCalledWith(state);
    });
  });

  describe('updateAutocompleteState', () => {
    it('calls setter when autocomplete state exists', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const setAutocompleteState = vi.fn();
      const mockAutocomplete = { active: true, query: 'test' };

      // Use the mock directly
      mockAutocompletePluginKey.getState.mockReturnValueOnce(mockAutocomplete);

      updateAutocompleteState(state, setAutocompleteState);

      expect(setAutocompleteState).toHaveBeenCalledWith(mockAutocomplete);
    });

    it('does not call setter when autocomplete state is undefined', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });
      const setAutocompleteState = vi.fn();

      // Use the mock directly
      mockAutocompletePluginKey.getState.mockReturnValueOnce(undefined);

      updateAutocompleteState(state, setAutocompleteState);

      expect(setAutocompleteState).not.toHaveBeenCalled();
    });
  });

  describe('createDispatchHandler', () => {
    it('creates a dispatch handler function', () => {
      const deps = createMockDeps();
      const setters = createMockSetters();

      const handler = createDispatchHandler(deps, setters);

      expect(typeof handler).toBe('function');
    });

    it('applies transaction and updates state', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });

      // Create a container for the view
      const container = document.createElement('div');
      const deps = createMockDeps();
      const setters = createMockSetters();

      const dispatchTransaction = createDispatchHandler(deps, setters);

      const view = new EditorView(container, {
        state,
        dispatchTransaction,
      });

      deps.viewRef.current = view;

      // Create a transaction that changes the doc
      const tr = view.state.tr.insertText('Hello');
      view.dispatch(tr);

      // Verify setters were called
      expect(setters.setCurrentDoc).toHaveBeenCalled();
      expect(setters.setCurrentEditorState).toHaveBeenCalled();

      view.destroy();
    });

    it('does not call doc change handlers for non-doc changes', () => {
      const doc = createDoc('Test');
      const state = EditorState.create({ doc, schema: testSchema, plugins: [history()] });

      const container = document.createElement('div');
      const deps = createMockDeps();
      const setters = createMockSetters();

      const dispatchTransaction = createDispatchHandler(deps, setters);

      const view = new EditorView(container, {
        state,
        dispatchTransaction,
      });

      // Create a transaction that doesn't change the doc (just sets meta)
      const tr = view.state.tr.setMeta('test', true);
      view.dispatch(tr);

      // Doc-change handlers should not be called
      expect(setters.setCurrentDoc).not.toHaveBeenCalled();

      // But element/scene/undo handlers should still be called
      expect(setters.setCurrentElementType).toHaveBeenCalled();

      view.destroy();
    });
  });
});
