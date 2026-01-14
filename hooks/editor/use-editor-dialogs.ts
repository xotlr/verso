import { useState, useCallback } from 'react';
import type { ScreenplayVersion } from '@/types/version';

/**
 * Manages all dialog/drawer state for the screenplay editor.
 * Centralizes open/close logic to reduce boilerplate in the wrapper component.
 */
export function useEditorDialogs() {
  // Panel states
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Dialog states
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Version comparison states
  const [compareVersion, setCompareVersion] = useState<ScreenplayVersion | null>(null);
  const [compareTwoVersions, setCompareTwoVersions] = useState<{
    from: ScreenplayVersion;
    to: ScreenplayVersion;
  } | null>(null);

  // Convenience open methods
  const openShare = useCallback(() => setIsShareDialogOpen(true), []);
  const openExport = useCallback(() => setIsExportDialogOpen(true), []);
  const openVersionHistory = useCallback(() => setIsVersionHistoryOpen(true), []);
  const openDetails = useCallback(() => setIsDetailsOpen(true), []);
  const openPanel = useCallback(() => setIsPanelOpen(true), []);

  // Convenience close methods
  const closeShare = useCallback(() => setIsShareDialogOpen(false), []);
  const closeExport = useCallback(() => setIsExportDialogOpen(false), []);
  const closeVersionHistory = useCallback(() => setIsVersionHistoryOpen(false), []);
  const closeDetails = useCallback(() => setIsDetailsOpen(false), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const closeCompare = useCallback(() => setCompareVersion(null), []);
  const closeCompareTwo = useCallback(() => setCompareTwoVersions(null), []);

  // Close all dialogs (useful for cleanup or navigation)
  const closeAll = useCallback(() => {
    setIsPanelOpen(false);
    setIsVersionHistoryOpen(false);
    setIsDetailsOpen(false);
    setIsShareDialogOpen(false);
    setIsExportDialogOpen(false);
    setCompareVersion(null);
    setCompareTwoVersions(null);
  }, []);

  return {
    // Raw state (for controlled components)
    isPanelOpen,
    isVersionHistoryOpen,
    isDetailsOpen,
    isShareDialogOpen,
    isExportDialogOpen,
    compareVersion,
    compareTwoVersions,

    // Setters (for custom control)
    setIsPanelOpen,
    setIsVersionHistoryOpen,
    setIsDetailsOpen,
    setIsShareDialogOpen,
    setIsExportDialogOpen,
    setCompareVersion,
    setCompareTwoVersions,

    // Convenience methods
    openShare,
    openExport,
    openVersionHistory,
    openDetails,
    openPanel,
    closeShare,
    closeExport,
    closeVersionHistory,
    closeDetails,
    closePanel,
    closeCompare,
    closeCompareTwo,
    closeAll,
  };
}

export type EditorDialogs = ReturnType<typeof useEditorDialogs>;
