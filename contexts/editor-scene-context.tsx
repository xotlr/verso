'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type PropsWithChildren,
} from 'react';
import type { SceneInfo } from '@/hooks/editor/types';
import type { EditorView } from 'prosemirror-view';

interface EditorSceneContextValue {
  /** List of scenes extracted from the editor */
  scenes: SceneInfo[];
  /** Update scenes (called by editor when content changes) */
  setScenes: (scenes: SceneInfo[]) => void;
  /** Currently active scene ID (where cursor is) */
  currentSceneId: string | null;
  /** Update current scene (called by editor on cursor move) */
  setCurrentSceneId: (id: string | null) => void;
  /** Reference to the ProseMirror EditorView for navigation */
  editorView: EditorView | null;
  /** Set the editor view reference */
  setEditorView: (view: EditorView | null) => void;
  /** Current screenplay ID (for navigation) */
  screenplayId: string | null;
  /** Set screenplay ID */
  setScreenplayId: (id: string | null) => void;
}

const EditorSceneContext = createContext<EditorSceneContextValue | null>(null);

/**
 * Hook to access editor scene data.
 * Must be used within EditorSceneProvider.
 */
export function useEditorScenes() {
  const context = useContext(EditorSceneContext);
  if (!context) {
    throw new Error('useEditorScenes must be used within EditorSceneProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if outside provider.
 * Use this in components that may or may not be in editor context.
 */
export function useEditorScenesOptional() {
  return useContext(EditorSceneContext);
}

/**
 * Provider for editor scene data.
 * Place at layout level so both sidebar and editor can access.
 */
export function EditorSceneProvider({ children }: PropsWithChildren) {
  const [scenes, setScenesState] = useState<SceneInfo[]>([]);
  const [currentSceneId, setCurrentSceneIdState] = useState<string | null>(null);
  const [editorView, setEditorViewState] = useState<EditorView | null>(null);
  const [screenplayId, setScreenplayIdState] = useState<string | null>(null);

  const setScenes = useCallback((newScenes: SceneInfo[]) => {
    setScenesState(newScenes);
  }, []);

  const setCurrentSceneId = useCallback((id: string | null) => {
    setCurrentSceneIdState(id);
  }, []);

  const setEditorView = useCallback((view: EditorView | null) => {
    setEditorViewState(view);
  }, []);

  const setScreenplayId = useCallback((id: string | null) => {
    setScreenplayIdState(id);
  }, []);

  const value = useMemo<EditorSceneContextValue>(
    () => ({
      scenes,
      setScenes,
      currentSceneId,
      setCurrentSceneId,
      editorView,
      setEditorView,
      screenplayId,
      setScreenplayId,
    }),
    [
      scenes,
      setScenes,
      currentSceneId,
      setCurrentSceneId,
      editorView,
      setEditorView,
      screenplayId,
      setScreenplayId,
    ]
  );

  return (
    <EditorSceneContext.Provider value={value}>
      {children}
    </EditorSceneContext.Provider>
  );
}
