/**
 * useCollaboration Hook
 *
 * React hook for real-time collaboration.
 * Works with both ProseMirror and Classic editors.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { CollaborationService } from '@/lib/collaboration/collaboration-service';
import type {
  EditorType,
  CollaborationOperation,
  RemoteUser,
  BroadcastChangePayload,
} from '@/types/collaboration';

export interface UseCollaborationOptions {
  screenplayId: string;
  editorType: EditorType;
  enabled?: boolean;
  onRemoteChange?: (operation: CollaborationOperation) => void;
}

export interface UseCollaborationReturn {
  // State
  isConnected: boolean;
  remoteUsers: RemoteUser[];
  activeUsers: number;

  // Actions
  broadcastChange: (payload: BroadcastChangePayload) => Promise<void>;
  updateCursor: (position: number) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useCollaboration({
  screenplayId,
  editorType,
  enabled = true,
  onRemoteChange,
}: UseCollaborationOptions): UseCollaborationReturn {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const serviceRef = useRef<CollaborationService | null>(null);
  const mountedRef = useRef(true);

  // Use ref pattern for onRemoteChange to avoid effect re-runs when callback changes
  const onRemoteChangeRef = useRef(onRemoteChange);
  useEffect(() => { onRemoteChangeRef.current = onRemoteChange; }, [onRemoteChange]);

  // Initialize collaboration service
  useEffect(() => {
    if (!enabled || !session?.user?.id) return;

    mountedRef.current = true;

    serviceRef.current = new CollaborationService(
      screenplayId,
      session.user.id,
      editorType
    );

    // Set up callbacks with mounted check
    serviceRef.current.onConnectionChange((connected) => {
      if (mountedRef.current) {
        setIsConnected(connected);
      }
    });

    serviceRef.current.onPresenceChange((users) => {
      if (mountedRef.current) {
        setRemoteUsers(users);
      }
    });

    // Use ref to get current callback (avoids dependency on onRemoteChange)
    if (onRemoteChangeRef.current) {
      serviceRef.current.onRemoteChange((op) => {
        if (mountedRef.current) {
          onRemoteChangeRef.current?.(op);
        }
      });
    }

    return () => {
      mountedRef.current = false;
      serviceRef.current?.disconnect();
    };
  }, [screenplayId, editorType, enabled, session?.user?.id]);

  // Auto-connect when enabled
  useEffect(() => {
    if (!enabled || !session?.user || !serviceRef.current || isConnected) return;

    const connectToChannel = async () => {
      try {
        await serviceRef.current?.connect({
          name: session.user.name || 'Anonymous',
          email: session.user.email || '',
          image: session.user.image,
        });
      } catch (error) {
        console.error('Failed to connect to collaboration:', error);
      }
    };

    connectToChannel();

    return () => {
      serviceRef.current?.disconnect();
    };
  }, [enabled, session?.user, isConnected]);

  // Broadcast a change
  const broadcastChange = useCallback(
    async (payload: BroadcastChangePayload) => {
      if (!serviceRef.current || !isConnected) {
        console.warn('Cannot broadcast: not connected');
        return;
      }

      try {
        await serviceRef.current.broadcastChange(payload);
      } catch (error) {
        console.error('Failed to broadcast change:', error);
      }
    },
    [isConnected]
  );

  // Update cursor position
  const updateCursor = useCallback(
    async (position: number) => {
      if (!serviceRef.current || !session?.user) return;

      try {
        await serviceRef.current.updateCursor(position, {
          name: session.user.name || 'Anonymous',
          email: session.user.email || '',
          image: session.user.image,
        });
      } catch (error) {
        console.error('Failed to update cursor:', error);
      }
    },
    [session?.user]
  );

  // Manual connect
  const connect = useCallback(async () => {
    if (!serviceRef.current || !session?.user) return;

    try {
      await serviceRef.current.connect({
        name: session.user.name || 'Anonymous',
        email: session.user.email || '',
        image: session.user.image,
      });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [session?.user]);

  // Manual disconnect
  const disconnect = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      await serviceRef.current.disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, []);

  return {
    isConnected,
    remoteUsers,
    activeUsers: remoteUsers.length,
    broadcastChange,
    updateCursor,
    connect,
    disconnect,
  };
}
