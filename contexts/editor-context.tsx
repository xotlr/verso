'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

// Editor UI State
interface EditorUIState {
  showFindReplace: boolean;
  showSceneNavigator: boolean;
  showCharacterList: boolean;
  showPageBreaks: boolean;
  showLineNumbers: boolean;
  zenMode: boolean;
  viewMode: 'single' | 'spread';
}

// Editor Context Value
interface EditorContextValue {
  // UI State
  ui: EditorUIState;

  // UI Actions
  toggleFindReplace: () => void;
  toggleSceneNavigator: () => void;
  toggleCharacterList: () => void;
  togglePageBreaks: () => void;
  toggleLineNumbers: () => void;
  toggleZenMode: () => void;
  setZenMode: (value: boolean) => void;
  setViewMode: (mode: 'single' | 'spread') => void;

  // Selection state
  selectedText: string;
  setSelectedText: (text: string) => void;

  // Typing state (for animations)
  isTyping: boolean;
  setIsTyping: (value: boolean) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  // UI State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showSceneNavigator, setShowSceneNavigator] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [zenMode, setZenModeState] = useState(false);
  const [viewMode, setViewModeState] = useState<'single' | 'spread'>('single');

  // Selection and typing state
  const [selectedText, setSelectedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // UI Actions
  const toggleFindReplace = useCallback(() => setShowFindReplace(prev => !prev), []);
  const toggleSceneNavigator = useCallback(() => setShowSceneNavigator(prev => !prev), []);
  const toggleCharacterList = useCallback(() => setShowCharacterList(prev => !prev), []);
  const togglePageBreaks = useCallback(() => setShowPageBreaks(prev => !prev), []);
  const toggleLineNumbers = useCallback(() => setShowLineNumbers(prev => !prev), []);
  const toggleZenMode = useCallback(() => setZenModeState(prev => !prev), []);
  const setZenMode = useCallback((value: boolean) => setZenModeState(value), []);
  const setViewMode = useCallback((mode: 'single' | 'spread') => setViewModeState(mode), []);

  // Memoize UI state object
  const ui = useMemo<EditorUIState>(() => ({
    showFindReplace,
    showSceneNavigator,
    showCharacterList,
    showPageBreaks,
    showLineNumbers,
    zenMode,
    viewMode,
  }), [showFindReplace, showSceneNavigator, showCharacterList, showPageBreaks, showLineNumbers, zenMode, viewMode]);

  // Memoize context value
  const value = useMemo<EditorContextValue>(() => ({
    ui,
    toggleFindReplace,
    toggleSceneNavigator,
    toggleCharacterList,
    togglePageBreaks,
    toggleLineNumbers,
    toggleZenMode,
    setZenMode,
    setViewMode,
    selectedText,
    setSelectedText,
    isTyping,
    setIsTyping,
  }), [
    ui,
    toggleFindReplace,
    toggleSceneNavigator,
    toggleCharacterList,
    togglePageBreaks,
    toggleLineNumbers,
    toggleZenMode,
    setZenMode,
    setViewMode,
    selectedText,
    isTyping,
  ]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

export function useEditorUI() {
  const { ui, ...actions } = useEditor();
  return { ...ui, ...actions };
}
