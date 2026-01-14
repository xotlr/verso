'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use useEditorUI from '@/contexts/editor-ui-context' instead.
 */

import {
  useEditorUI,
  useEditorUIOptional,
  EditorUIProvider,
  EDITOR_PANEL_WIDTH,
  ACTIVITY_BAR_WIDTH,
  type EditorPanelType,
  type PanelCounts,
} from '@/contexts/editor-ui-context';

// Re-export constants
export { EDITOR_PANEL_WIDTH, ACTIVITY_BAR_WIDTH };

// Re-export types
export type { EditorPanelType, PanelCounts };

// Re-export provider with old name
export const EditorPanelProvider = EditorUIProvider;

/**
 * @deprecated Use useEditorUI() instead.
 */
export function useEditorPanel() {
  const ctx = useEditorUI();

  // Map new context shape to old for backward compatibility
  return {
    open: ctx.panelOpen,
    setOpen: ctx.setPanelOpen,
    toggleOpen: ctx.togglePanel,
    mobileOpen: ctx.mobileDrawerOpen,
    setMobileOpen: ctx.setMobileDrawer,
    activePanel: ctx.activePanel,
    setActivePanel: ctx.setPanel,
    position: ctx.panelPosition,
    setPosition: ctx.setPanelPosition,
    isMobile: ctx.isMobile,
    isTablet: ctx.isTablet,
    totalWidth: ctx.panelWidth,
    isCollapsed: ctx.isPanelCollapsed,
    counts: ctx.counts,
    setCounts: ctx.setCounts,
  };
}

/**
 * @deprecated Use useEditorUIOptional() instead.
 */
export function useEditorPanelOptional() {
  const ctx = useEditorUIOptional();
  if (!ctx) return null;

  return {
    open: ctx.panelOpen,
    setOpen: ctx.setPanelOpen,
    toggleOpen: ctx.togglePanel,
    mobileOpen: ctx.mobileDrawerOpen,
    setMobileOpen: ctx.setMobileDrawer,
    activePanel: ctx.activePanel,
    setActivePanel: ctx.setPanel,
    position: ctx.panelPosition,
    setPosition: ctx.setPanelPosition,
    isMobile: ctx.isMobile,
    isTablet: ctx.isTablet,
    totalWidth: ctx.panelWidth,
    isCollapsed: ctx.isPanelCollapsed,
    counts: ctx.counts,
    setCounts: ctx.setCounts,
  };
}
