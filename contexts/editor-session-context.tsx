'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

/**
 * Yjs collaboration status.
 */
export interface YjsStatus {
  enabled: boolean;
  isConnected: boolean;
  isSynced: boolean;
  isPersistenceSynced: boolean;
}

/**
 * Editor command handlers passed to the provider.
 */
export interface EditorCommandHandlers {
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenVersionHistory: () => void;
  onSaveTitle: (title: string) => void;
}

/**
 * Unified editor session context combining status tracking and commands.
 * Replaces separate EditorStatusContext and EditorCommandsContext.
 */
export interface EditorSessionContextValue {
  // === Status (from EditorStatusContext) ===
  /** Whether Yjs collaboration is enabled */
  yjsEnabled: boolean;
  /** Whether connected to Yjs server */
  isConnected: boolean;
  /** Whether Yjs document is synced */
  isSynced: boolean;
  /** Whether persistence provider is synced */
  isPersistenceSynced: boolean;
  /** Browser online/offline status */
  isOnline: boolean;

  // === Session Info ===
  /** Current screenplay ID (null if not in editor) */
  screenplayId: string | null;
  /** Whether editor commands are available */
  isCommandsAvailable: boolean;

  // === Status Actions ===
  /** Update Yjs status (called by editor) */
  setYjsStatus: (status: YjsStatus) => void;

  // === Commands (from EditorCommandsContext) ===
  /** Open the share dialog */
  openShare: () => void;
  /** Open the export dialog */
  openExport: () => void;
  /** Open the version history panel */
  openVersionHistory: () => void;
  /** Navigate to timelapse view */
  openTimelapse: () => void;
  /** Save the current title */
  saveTitle: (title: string) => void;
}

const EditorSessionContext = createContext<EditorSessionContextValue | null>(null);

interface EditorSessionProviderProps {
  children: ReactNode;
  /** Screenplay ID - set when inside editor, null otherwise */
  screenplayId?: string | null;
  /** Command handlers - only required when screenplayId is set */
  commands?: EditorCommandHandlers;
}

/**
 * Provider for editor session state and commands.
 *
 * Usage:
 * - In layout: <EditorSessionProvider> (no screenplayId - status tracking only)
 * - In editor: <EditorSessionProvider screenplayId={id} commands={handlers}>
 */
export function EditorSessionProvider({
  children,
  screenplayId = null,
  commands,
}: EditorSessionProviderProps) {
  const router = useRouter();

  // === Yjs Status State ===
  const [yjsEnabled, setYjsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isPersistenceSynced, setIsPersistenceSynced] = useState(false);

  // === Browser Connectivity ===
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Batch update Yjs status
  const setYjsStatus = useCallback((status: YjsStatus) => {
    setYjsEnabled(status.enabled);
    setIsConnected(status.isConnected);
    setIsSynced(status.isSynced);
    setIsPersistenceSynced(status.isPersistenceSynced);
  }, []);

  // === Commands ===
  const isCommandsAvailable = screenplayId !== null && commands !== undefined;

  const openShare = useCallback(() => {
    commands?.onOpenShare();
  }, [commands]);

  const openExport = useCallback(() => {
    commands?.onOpenExport();
  }, [commands]);

  const openVersionHistory = useCallback(() => {
    commands?.onOpenVersionHistory();
  }, [commands]);

  const openTimelapse = useCallback(() => {
    if (screenplayId) {
      router.push(`/screenplay/${screenplayId}/timelapse`);
    }
  }, [router, screenplayId]);

  const saveTitle = useCallback((title: string) => {
    commands?.onSaveTitle(title);
  }, [commands]);

  const value = useMemo<EditorSessionContextValue>(() => ({
    // Status
    yjsEnabled,
    isConnected,
    isSynced,
    isPersistenceSynced,
    isOnline,
    // Session info
    screenplayId,
    isCommandsAvailable,
    // Status actions
    setYjsStatus,
    // Commands
    openShare,
    openExport,
    openVersionHistory,
    openTimelapse,
    saveTitle,
  }), [
    yjsEnabled,
    isConnected,
    isSynced,
    isPersistenceSynced,
    isOnline,
    screenplayId,
    isCommandsAvailable,
    setYjsStatus,
    openShare,
    openExport,
    openVersionHistory,
    openTimelapse,
    saveTitle,
  ]);

  return (
    <EditorSessionContext.Provider value={value}>
      {children}
    </EditorSessionContext.Provider>
  );
}

// === Hooks ===

/**
 * Hook to access full editor session context.
 * Returns safe defaults if not inside provider.
 */
export function useEditorSession(): EditorSessionContextValue {
  const context = useContext(EditorSessionContext);

  if (!context) {
    return {
      yjsEnabled: false,
      isConnected: false,
      isSynced: false,
      isPersistenceSynced: false,
      isOnline: true,
      screenplayId: null,
      isCommandsAvailable: false,
      setYjsStatus: () => {},
      openShare: () => {},
      openExport: () => {},
      openVersionHistory: () => {},
      openTimelapse: () => {},
      saveTitle: () => {},
    };
  }

  return context;
}

/**
 * Hook that requires session context - throws if not available.
 */
export function useEditorSessionStrict(): EditorSessionContextValue {
  const context = useContext(EditorSessionContext);
  if (!context) {
    throw new Error('useEditorSessionStrict must be used within EditorSessionProvider');
  }
  return context;
}

// === Compatibility Hooks ===
// These maintain backward compatibility with the old separate contexts.

/**
 * @deprecated Use useEditorSession() instead.
 * Compatibility hook for EditorStatusContext consumers.
 */
export function useEditorStatus() {
  const session = useEditorSession();
  return {
    yjsEnabled: session.yjsEnabled,
    isConnected: session.isConnected,
    isSynced: session.isSynced,
    isPersistenceSynced: session.isPersistenceSynced,
    isOnline: session.isOnline,
    setYjsStatus: session.setYjsStatus,
  };
}

/**
 * @deprecated Use useEditorSession() instead.
 * Compatibility hook for EditorCommandsContext consumers.
 */
export function useEditorCommands() {
  const session = useEditorSession();
  return {
    openShare: session.openShare,
    openExport: session.openExport,
    openVersionHistory: session.openVersionHistory,
    openTimelapse: session.openTimelapse,
    saveTitle: session.saveTitle,
    isAvailable: session.isCommandsAvailable,
  };
}
