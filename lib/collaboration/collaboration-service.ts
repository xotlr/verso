/**
 * Collaboration Service
 *
 * Manages real-time collaboration using Supabase Realtime.
 * Works with both ProseMirror and Classic editors by syncing at the text level.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  EditorType,
  CollaborationOperation,
  RemoteUser,
  BroadcastChangePayload,
  PresencePayload,
  getUserColor,
} from '@/types/collaboration';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class CollaborationService {
  private channel: RealtimeChannel | null = null;
  private screenplayId: string;
  private userId: string;
  private editorType: EditorType;
  private localCursorPosition: number = 0;
  private remoteUsers: Map<string, RemoteUser> = new Map();
  private sequenceNumber: number = 0;

  // Callbacks
  private onRemoteChangeCallback?: (operation: CollaborationOperation) => void;
  private onPresenceChangeCallback?: (users: RemoteUser[]) => void;
  private onConnectionChangeCallback?: (connected: boolean) => void;

  constructor(
    screenplayId: string,
    userId: string,
    editorType: EditorType
  ) {
    this.screenplayId = screenplayId;
    this.userId = userId;
    this.editorType = editorType;
  }

  /**
   * Connect to the collaboration channel
   */
  async connect(userInfo: { name: string; email: string; image?: string | null }) {
    const supabase = createClient();
    const channelName = `screenplay:${this.screenplayId}`;

    // Create channel
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        presence: { key: this.userId },
      },
    });

    // Listen for operations (text changes)
    this.channel.on(
      'broadcast',
      { event: 'operation' },
      (payload: { payload: CollaborationOperation }) => {
        if (this.onRemoteChangeCallback) {
          this.onRemoteChangeCallback(payload.payload);
        }
      }
    );

    // Listen for presence changes (who's online)
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState();
        if (state) {
          this.updatePresence(state);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
        const state = this.channel?.presenceState();
        if (state) {
          this.updatePresence(state);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        const state = this.channel?.presenceState();
        if (state) {
          this.updatePresence(state);
        }
      });

    // Subscribe to channel
    const status = await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Connected to collaboration channel');

        // Track our presence
        await this.trackPresence(userInfo, 0);

        if (this.onConnectionChangeCallback) {
          this.onConnectionChangeCallback(true);
        }
      } else if (status === 'CLOSED') {
        console.log('❌ Disconnected from collaboration channel');
        if (this.onConnectionChangeCallback) {
          this.onConnectionChangeCallback(false);
        }
      }
    });

    return status;
  }

  /**
   * Disconnect from the collaboration channel
   */
  async disconnect() {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
      this.remoteUsers.clear();

      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback(false);
      }
    }
  }

  /**
   * Broadcast a text change operation
   */
  async broadcastChange(payload: BroadcastChangePayload) {
    if (!this.channel) {
      console.warn('Cannot broadcast: not connected');
      return;
    }

    const operation: CollaborationOperation = {
      id: crypto.randomUUID(),
      screenplayId: this.screenplayId,
      userId: this.userId,
      operationType: payload.type,
      position: payload.position ?? null,
      content: payload.content ?? null,
      metadata: {
        ...payload.metadata,
        editorType: this.editorType,
      },
      timestamp: new Date(),
      sequenceNumber: ++this.sequenceNumber,
    };

    // Broadcast to other users
    await this.channel.send({
      type: 'broadcast',
      event: 'operation',
      payload: operation,
    });

    // Also persist to database for conflict resolution
    await this.persistOperation(operation);
  }

  /**
   * Update cursor position
   */
  async updateCursor(position: number, userInfo: { name: string; email: string; image?: string | null }) {
    this.localCursorPosition = position;
    await this.trackPresence(userInfo, position);
  }

  /**
   * Track presence (cursor position and online status)
   */
  private async trackPresence(
    userInfo: { name: string; email: string; image?: string | null },
    cursorPosition: number
  ) {
    if (!this.channel) return;

    const color = this.getUserColor(this.userId);

    await this.channel.track({
      userId: this.userId,
      userName: userInfo.name,
      userEmail: userInfo.email,
      userImage: userInfo.image,
      editorType: this.editorType,
      cursorPosition,
      color,
      timestamp: Date.now(),
    });
  }

  /**
   * Update remote users list from presence state
   */
  private updatePresence(presenceState: Record<string, any[]>) {
    this.remoteUsers.clear();

    Object.entries(presenceState).forEach(([userId, presences]) => {
      if (userId === this.userId) return; // Skip self

      // Get the latest presence for this user
      const latest = presences[0] as PresencePayload & { timestamp: number };
      if (!latest) return;

      this.remoteUsers.set(userId, {
        id: latest.userId,
        name: latest.userName,
        email: latest.userEmail,
        image: latest.userImage,
        editorType: latest.editorType,
        cursorPosition: latest.cursorPosition,
        color: latest.color,
        lastSeen: new Date(latest.timestamp),
      });
    });

    if (this.onPresenceChangeCallback) {
      this.onPresenceChangeCallback(Array.from(this.remoteUsers.values()));
    }
  }

  /**
   * Persist operation to database for conflict resolution
   * NOTE: This is optional - we can work without it since we're using Broadcast
   */
  private async persistOperation(operation: CollaborationOperation) {
    // We're using Broadcast channels for real-time sync, so database persistence
    // is optional for now. Can be enabled later for conflict resolution.
    // Commenting out to avoid requiring database replication.

    /*
    const supabase = createClient();

    try {
      // Type assertion needed because Supabase client doesn't have Prisma schema types
      const { error } = await (supabase.from('screenplay_operations') as any).insert({
        id: operation.id,
        screenplay_id: operation.screenplayId,
        user_id: operation.userId,
        operation_type: operation.operationType,
        position: operation.position,
        content: operation.content,
        metadata: operation.metadata,
        sequence_number: operation.sequenceNumber,
      });

      if (error) {
        console.error('Failed to persist operation:', error);
      }
    } catch (error) {
      console.error('Failed to persist operation:', error);
    }
    */
  }

  /**
   * Get a consistent color for a user
   */
  private getUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52C41A',
    ];

    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Register callbacks
   */
  onRemoteChange(callback: (operation: CollaborationOperation) => void) {
    this.onRemoteChangeCallback = callback;
  }

  onPresenceChange(callback: (users: RemoteUser[]) => void) {
    this.onPresenceChangeCallback = callback;
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.onConnectionChangeCallback = callback;
  }

  /**
   * Get current remote users
   */
  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.channel !== null;
  }
}
