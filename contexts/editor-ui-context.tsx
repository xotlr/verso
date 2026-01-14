'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';

// Panel width constants
export const EDITOR_PANEL_WIDTH = 360;
export const ACTIVITY_BAR_WIDTH = 48;

export type EditorPanelType = 'scenes' | 'characters' | 'shotlist' | 'notes' | 'settings';
export type ViewMode = 'single' | 'spread';

export interface PanelCounts {
  scenes: number;
  characters: number;
  shots: number;
  notes: number;
}

/**
 * Unified editor UI context combining EditorContext and EditorPanelContext.
 * Manages all editor UI state in one place.
 */
interface EditorUIContextValue {
  // Feature toggles (from EditorContext)
  showFindReplace: boolean;
  showPageBreaks: boolean;
  showLineNumbers: boolean;
  zenMode: boolean;
  viewMode: ViewMode;

  // Panel state (from EditorPanelContext)
  panelOpen: boolean;
  activePanel: EditorPanelType | null;
  panelPosition: 'left' | 'right';
  mobileDrawerOpen: boolean;

  // Responsive state (from EditorPanelContext)
  isMobile: boolean;
  isTablet: boolean;

  // Computed (from EditorPanelContext)
  panelWidth: number;
  isPanelCollapsed: boolean;

  // Badge counts (from EditorPanelContext)
  counts: PanelCounts;

  // Selection/typing state (from EditorContext)
  selectedText: string;
  isTyping: boolean;

  // Feature toggle actions
  toggleFindReplace: () => void;
  togglePageBreaks: () => void;
  toggleLineNumbers: () => void;
  toggleZenMode: () => void;
  setZenMode: (value: boolean) => void;
  setViewMode: (mode: ViewMode) => void;

  // Panel actions
  setPanel: (panel: EditorPanelType | null) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setPanelPosition: (pos: 'left' | 'right') => void;
  setMobileDrawer: (open: boolean) => void;

  // Counts
  setCounts: (counts: Partial<PanelCounts>) => void;

  // Selection/typing actions
  setSelectedText: (text: string) => void;
  setIsTyping: (value: boolean) => void;
}

const EditorUIContext = createContext<EditorUIContextValue | null>(null);

interface EditorUIProviderProps extends PropsWithChildren {
  defaultPanelOpen?: boolean;
  defaultPanel?: EditorPanelType | null;
  defaultPosition?: 'left' | 'right';
}

export function EditorUIProvider({
  children,
  defaultPanelOpen = false,
  defaultPanel = null,
  defaultPosition = 'left',
}: EditorUIProviderProps) {
  // Feature toggles (from EditorContext)
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [zenMode, setZenModeState] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>('single');

  // Selection and typing state (from EditorContext)
  const [selectedText, setSelectedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Panel state (from EditorPanelContext)
  const [panelOpen, setPanelOpenState] = useState(defaultPanelOpen);
  const [activePanel, setActivePanelState] = useState<EditorPanelType | null>(defaultPanel);
  const [panelPosition, setPanelPosition] = useState<'left' | 'right'>(defaultPosition);
  const [mobileDrawerOpen, setMobileDrawer] = useState(false);

  // Panel counts (from EditorPanelContext)
  const [counts, setCountsState] = useState<PanelCounts>({
    scenes: 0,
    characters: 0,
    shots: 0,
    notes: 0,
  });

  // Responsive detection (from EditorPanelContext)
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Handle responsive breakpoints
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  // Close desktop panel on mobile
  useEffect(() => {
    if (isMobile) {
      setPanelOpenState(false);
    }
  }, [isMobile]);

  // Feature toggle actions
  const toggleFindReplace = useCallback(() => setShowFindReplace(prev => !prev), []);
  const togglePageBreaks = useCallback(() => setShowPageBreaks(prev => !prev), []);
  const toggleLineNumbers = useCallback(() => setShowLineNumbers(prev => !prev), []);
  const toggleZenMode = useCallback(() => setZenModeState(prev => !prev), []);
  const setZenMode = useCallback((value: boolean) => setZenModeState(value), []);
  const setViewMode = useCallback((mode: ViewMode) => setViewModeState(mode), []);

  // Panel actions
  const togglePanel = useCallback(() => {
    setPanelOpenState(prev => !prev);
  }, []);

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelOpenState(open);
  }, []);

  // Handle panel selection with toggle behavior
  const setPanel = useCallback((panel: EditorPanelType | null) => {
    if (panel === activePanel) {
      // Toggle off if clicking same panel
      setActivePanelState(null);
      setPanelOpenState(false);
    } else {
      setActivePanelState(panel);
      if (panel !== null) {
        setPanelOpenState(true);
      }
    }
  }, [activePanel]);

  const setCounts = useCallback((newCounts: Partial<PanelCounts>) => {
    setCountsState(prev => ({ ...prev, ...newCounts }));
  }, []);

  // Window events removed - sidebar now uses useEditorUIOptional() directly
  // This eliminates the bidirectional event anti-pattern

  // Computed values
  const panelWidth = useMemo(() => {
    if (isMobile) return 0;
    if (!panelOpen || !activePanel) return 0;
    return EDITOR_PANEL_WIDTH;
  }, [isMobile, panelOpen, activePanel]);

  const isPanelCollapsed = !panelOpen || !activePanel;

  const value = useMemo<EditorUIContextValue>(() => ({
    // Feature toggles
    showFindReplace,
    showPageBreaks,
    showLineNumbers,
    zenMode,
    viewMode,

    // Panel state
    panelOpen,
    activePanel,
    panelPosition,
    mobileDrawerOpen,

    // Responsive
    isMobile,
    isTablet,

    // Computed
    panelWidth,
    isPanelCollapsed,

    // Counts
    counts,

    // Selection/typing
    selectedText,
    isTyping,

    // Actions
    toggleFindReplace,
    togglePageBreaks,
    toggleLineNumbers,
    toggleZenMode,
    setZenMode,
    setViewMode,
    setPanel,
    setPanelOpen,
    togglePanel,
    setPanelPosition,
    setMobileDrawer,
    setCounts,
    setSelectedText,
    setIsTyping,
  }), [
    showFindReplace,
    showPageBreaks,
    showLineNumbers,
    zenMode,
    viewMode,
    panelOpen,
    activePanel,
    panelPosition,
    mobileDrawerOpen,
    isMobile,
    isTablet,
    panelWidth,
    isPanelCollapsed,
    counts,
    selectedText,
    isTyping,
    toggleFindReplace,
    togglePageBreaks,
    toggleLineNumbers,
    toggleZenMode,
    setZenMode,
    setViewMode,
    setPanel,
    setPanelOpen,
    togglePanel,
    setPanelPosition,
    setCounts,
  ]);

  return (
    <EditorUIContext.Provider value={value}>
      {children}
    </EditorUIContext.Provider>
  );
}

/**
 * Hook to access the unified editor UI context.
 * Throws if used outside EditorUIProvider.
 */
export function useEditorUI() {
  const context = useContext(EditorUIContext);
  if (!context) {
    throw new Error('useEditorUI must be used within an EditorUIProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if outside provider (for layout-level components).
 */
export function useEditorUIOptional() {
  return useContext(EditorUIContext);
}

// Re-export types
export type { EditorUIContextValue };
