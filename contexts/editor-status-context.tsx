'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use useEditorSession from '@/contexts/editor-session-context' instead.
 */

import {
  useEditorSession,
  useEditorSessionStrict,
  EditorSessionProvider,
  type YjsStatus,
} from './editor-session-context';

// Re-export types
export type { YjsStatus };

// Re-export provider with old name
export const EditorStatusProvider = EditorSessionProvider;

/**
 * @deprecated Use useEditorSession() instead.
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
 * @deprecated Use useEditorSessionStrict() instead.
 */
export function useEditorStatusStrict() {
  const session = useEditorSessionStrict();
  return {
    yjsEnabled: session.yjsEnabled,
    isConnected: session.isConnected,
    isSynced: session.isSynced,
    isPersistenceSynced: session.isPersistenceSynced,
    isOnline: session.isOnline,
    setYjsStatus: session.setYjsStatus,
  };
}
