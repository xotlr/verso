'use client';

/**
 * React hook for Yjs collaborative editing
 *
 * Provides Yjs document, awareness, and connection state
 * for use with ProseMirror editor.
 *
 * IMPORTANT: This hook waits for IndexedDB persistence to sync
 * before exposing yXmlFragment to prevent race conditions where
 * the editor binds to an empty/stale document.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { getYjsDocument, getYjsXmlFragment } from '@/lib/collaboration/yjs-document';
import { SupabaseYjsProvider } from '@/lib/collaboration/supabase-yjs-provider';

export interface UseYjsCollaborationOptions {
  screenplayId: string;
  userId: string;
  userInfo: {
    name: string;
    email: string;
    image?: string | null;
  };
  enabled?: boolean;
  initialContent?: string;
}

export interface UseYjsCollaborationReturn {
  /** The Yjs document */
  ydoc: Y.Doc | null;
  /** The XmlFragment for ProseMirror binding (null until persistence synced) */
  yXmlFragment: Y.XmlFragment | null;
  /** Awareness instance for cursor sync */
  awareness: Awareness | null;
  /** Whether connected to sync provider */
  isConnected: boolean;
  /** Whether initial sync is complete (both local persistence AND remote) */
  isSynced: boolean;
  /** Whether local IndexedDB persistence is synced */
  isPersistenceSynced: boolean;
  /** Remote users currently editing */
  remoteUsers: RemoteYjsUser[];
  /** Disconnect from collaboration */
  disconnect: () => Promise<void>;
}

export interface RemoteYjsUser {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  color: string;
  cursor?: {
    anchor: number;
    head: number;
  };
}

export function useYjsCollaboration(
  options: UseYjsCollaborationOptions
): UseYjsCollaborationReturn {
  const { screenplayId, userId, userInfo, enabled = true, initialContent } = options;

  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [yXmlFragment, setYXmlFragment] = useState<Y.XmlFragment | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isPersistenceSynced, setIsPersistenceSynced] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteYjsUser[]>([]);

  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const mountedRef = useRef(true);
  // Use ref for initialContent - it's only used once during setup, not for ongoing sync
  const initialContentRef = useRef(initialContent);

  // Initialize Yjs document and provider
  useEffect(() => {
    if (!enabled || !screenplayId || !userId) {
      return;
    }

    mountedRef.current = true;

    // Get or create Yjs document
    const { ydoc: doc, persistenceReady } = getYjsDocument({
      screenplayId,
      initialContent: initialContentRef.current,
      onSync: () => {
        if (mountedRef.current) {
          // Document synced from IndexedDB
        }
      },
    });

    if (mountedRef.current) {
      setYdoc(doc);
    }

    // Wait for IndexedDB persistence to sync before exposing XmlFragment
    // This prevents race condition where editor binds to empty/stale document
    persistenceReady.then(() => {
      if (!mountedRef.current) return;

      const xmlFragment = getYjsXmlFragment(doc);
      setYXmlFragment(xmlFragment);
      setIsPersistenceSynced(true);
    });

    // Create Supabase provider
    const provider = new SupabaseYjsProvider({
      screenplayId,
      ydoc: doc,
      userId,
      userInfo,
    });

    providerRef.current = provider;

    if (mountedRef.current) {
      setAwareness(provider.awareness);
    }

    // Listen for connection changes
    provider.onConnection((connected) => {
      if (mountedRef.current) {
        setIsConnected(connected);
      }
    });

    // Listen for sync completion
    provider.onSynced(() => {
      if (mountedRef.current) {
        setIsSynced(true);
      }
    });

    // Listen for awareness changes (remote users)
    provider.awareness.on('change', () => {
      if (!mountedRef.current) return;

      const states = provider.awareness.getStates();
      const users: RemoteYjsUser[] = [];

      states.forEach((state, clientId) => {
        // Skip local user
        if (clientId === provider.awareness.clientID) return;

        const user = state.user;
        if (user) {
          users.push({
            id: user.id || String(clientId),
            name: user.name || 'Anonymous',
            email: user.email,
            image: user.image,
            color: user.color || '#999',
            cursor: state.cursor,
          });
        }
      });

      setRemoteUsers(users);
    });

    // Connect to provider
    provider.connect();

    return () => {
      mountedRef.current = false;
      provider.disconnect();
    };
  }, [screenplayId, userId, userInfo.name, userInfo.email, userInfo.image, enabled]);

  // Disconnect function
  const disconnect = useCallback(async () => {
    if (providerRef.current) {
      await providerRef.current.disconnect();
    }
  }, []);

  return {
    ydoc,
    yXmlFragment,
    awareness,
    isConnected,
    isSynced,
    isPersistenceSynced,
    remoteUsers,
    disconnect,
  };
}
