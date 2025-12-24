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
export const EDITOR_PANEL_WIDTH = 360; // 22.5rem = 360px (increased from 288px for better readability)
export const ACTIVITY_BAR_WIDTH = 48;  // w-12 = 3rem = 48px

export type EditorPanelType = 'scenes' | 'characters' | 'shotlist' | 'notes' | 'settings';

interface EditorPanelContextValue {
  // Desktop panel state
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;

  // Mobile drawer state
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;

  // Active panel
  activePanel: EditorPanelType | null;
  setActivePanel: (panel: EditorPanelType | null) => void;

  // Panel position
  position: 'left' | 'right';
  setPosition: (pos: 'left' | 'right') => void;

  // Responsive state
  isMobile: boolean;
  isTablet: boolean;

  // Computed values
  totalWidth: number;
  isCollapsed: boolean;
}

const EditorPanelContext = createContext<EditorPanelContextValue | null>(null);

export function useEditorPanel() {
  const context = useContext(EditorPanelContext);
  if (!context) {
    throw new Error('useEditorPanel must be used within EditorPanelProvider');
  }
  return context;
}

interface EditorPanelProviderProps extends PropsWithChildren {
  defaultOpen?: boolean;
  defaultPanel?: EditorPanelType | null;
  defaultPosition?: 'left' | 'right';
}

export function EditorPanelProvider({
  children,
  defaultOpen = true,
  defaultPanel = 'scenes',
  defaultPosition = 'right',
}: EditorPanelProviderProps) {
  // Desktop state
  const [open, setOpen] = useState(defaultOpen);
  const [activePanel, setActivePanel] = useState<EditorPanelType | null>(defaultPanel);
  const [position, setPosition] = useState<'left' | 'right'>(defaultPosition);

  // Mobile state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Responsive detection
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
      setOpen(false);
    }
  }, [isMobile]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // Handle panel selection with toggle behavior
  const handleSetActivePanel = useCallback(
    (panel: EditorPanelType | null) => {
      if (panel === activePanel) {
        // Toggle off if clicking same panel
        setActivePanel(null);
        setOpen(false);
      } else {
        setActivePanel(panel);
        if (panel !== null) {
          setOpen(true);
        }
      }
    },
    [activePanel]
  );

  // Calculate total width for layout adjustments
  const totalWidth = useMemo(() => {
    if (isMobile) return 0;
    if (!open || !activePanel) return ACTIVITY_BAR_WIDTH;
    return EDITOR_PANEL_WIDTH + ACTIVITY_BAR_WIDTH;
  }, [isMobile, open, activePanel]);

  const isCollapsed = !open || !activePanel;

  const value = useMemo<EditorPanelContextValue>(
    () => ({
      open,
      setOpen,
      toggleOpen,
      mobileOpen,
      setMobileOpen,
      activePanel,
      setActivePanel: handleSetActivePanel,
      position,
      setPosition,
      isMobile,
      isTablet,
      totalWidth,
      isCollapsed,
    }),
    [
      open,
      toggleOpen,
      mobileOpen,
      activePanel,
      handleSetActivePanel,
      position,
      isMobile,
      isTablet,
      totalWidth,
      isCollapsed,
    ]
  );

  return (
    <EditorPanelContext.Provider value={value}>
      {children}
    </EditorPanelContext.Provider>
  );
}
