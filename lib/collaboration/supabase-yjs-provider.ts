/**
 * Supabase Yjs Provider
 * 
 * Syncs Yjs documents using Supabase Realtime channels.
 * Provides awareness (cursor positions) and document sync.
 */

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import * as awarenessProtocol from 'y-protocols/awareness';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SupabaseProviderOptions {
  screenplayId: string;
  ydoc: Y.Doc;
  userId: string;
  userInfo: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export class SupabaseYjsProvider {
  private channel: RealtimeChannel | null = null;
  private ydoc: Y.Doc;
  private screenplayId: string;
  private userId: string;
  private userInfo: { name: string; email: string; image?: string | null };
  private _awareness: Awareness;
  private _connected: boolean = false;
  private _synced: boolean = false;
  
  // Event callbacks
  private onSyncedCallbacks: Set<() => void> = new Set();
  private onConnectionCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor(options: SupabaseProviderOptions) {
    this.screenplayId = options.screenplayId;
    this.ydoc = options.ydoc;
    this.userId = options.userId;
    this.userInfo = options.userInfo;
    
    // Create awareness instance
    this._awareness = new Awareness(this.ydoc);
    
    // Set local awareness state
    this._awareness.setLocalStateField('user', {
      id: this.userId,
      name: this.userInfo.name,
      email: this.userInfo.email,
      image: this.userInfo.image,
      color: this.getUserColor(this.userId),
    });
    
    // Listen for awareness changes to broadcast
    this._awareness.on('update', this.handleAwarenessUpdate.bind(this));
    
    // Listen for document updates to broadcast
    this.ydoc.on('update', this.handleDocUpdate.bind(this));
  }

  get awareness(): Awareness {
    return this._awareness;
  }

  get connected(): boolean {
    return this._connected;
  }

  get synced(): boolean {
    return this._synced;
  }

  /**
   * Connect to the Supabase channel
   */
  async connect(): Promise<void> {
    const supabase = createClient();
    const channelName = `yjs:${this.screenplayId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.userId },
      },
    });

    // Listen for document sync messages
    this.channel.on('broadcast', { event: 'yjs-update' }, (payload) => {
      const update = new Uint8Array(payload.payload.update);
      Y.applyUpdate(this.ydoc, update, 'supabase');
    });

    // Listen for awareness updates
    this.channel.on('broadcast', { event: 'yjs-awareness' }, (payload) => {
      const update = new Uint8Array(payload.payload.update);
      awarenessProtocol.applyAwarenessUpdate(this._awareness, update, 'supabase');
    });

    // Listen for sync requests (when a new user joins)
    this.channel.on('broadcast', { event: 'yjs-sync-request' }, (payload) => {
      // Send full document state to the requesting user
      this.sendSyncResponse(payload.payload.userId);
    });

    // Listen for sync responses
    this.channel.on('broadcast', { event: 'yjs-sync-response' }, (payload) => {
      if (payload.payload.targetUserId === this.userId) {
        const update = new Uint8Array(payload.payload.update);
        Y.applyUpdate(this.ydoc, update, 'supabase');
        this._synced = true;
        this.onSyncedCallbacks.forEach(cb => cb());
      }
    });

    // Subscribe and track presence
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this._connected = true;
        this.onConnectionCallbacks.forEach(cb => cb(true));
        
        // Request sync from other users
        await this.requestSync();
        
        // If no response after 1 second, consider ourselves synced (we're first)
        setTimeout(() => {
          if (!this._synced) {
            this._synced = true;
            this.onSyncedCallbacks.forEach(cb => cb());
          }
        }, 1000);
      } else if (status === 'CLOSED') {
        this._connected = false;
        this.onConnectionCallbacks.forEach(cb => cb(false));
      }
    });
  }

  /**
   * Disconnect from the channel
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this._connected = false;
    this._synced = false;
    this.onConnectionCallbacks.forEach(cb => cb(false));
  }

  /**
   * Handle local document updates
   */
  private handleDocUpdate(update: Uint8Array, origin: unknown): void {
    // Don't broadcast updates that came from Supabase
    if (origin === 'supabase') return;
    
    if (this.channel && this._connected) {
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(update) },
      });
    }
  }

  /**
   * Handle awareness updates
   */
  private handleAwarenessUpdate(
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ): void {
    if (origin === 'supabase') return;
    
    const changedClients = [...added, ...updated, ...removed];
    const update = awarenessProtocol.encodeAwarenessUpdate(this._awareness, changedClients);
    
    if (this.channel && this._connected) {
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-awareness',
        payload: { update: Array.from(update) },
      });
    }
  }

  /**
   * Request full sync from other users
   */
  private async requestSync(): Promise<void> {
    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'yjs-sync-request',
        payload: { userId: this.userId },
      });
    }
  }

  /**
   * Send sync response to a specific user
   */
  private async sendSyncResponse(targetUserId: string): Promise<void> {
    if (this.channel) {
      const update = Y.encodeStateAsUpdate(this.ydoc);
      await this.channel.send({
        type: 'broadcast',
        event: 'yjs-sync-response',
        payload: {
          targetUserId,
          update: Array.from(update),
        },
      });
    }
  }

  /**
   * Register callback for sync completion
   */
  onSynced(callback: () => void): void {
    this.onSyncedCallbacks.add(callback);
    if (this._synced) callback();
  }

  /**
   * Register callback for connection changes
   */
  onConnection(callback: (connected: boolean) => void): void {
    this.onConnectionCallbacks.add(callback);
    callback(this._connected);
  }

  /**
   * Get consistent color for user
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
   * Destroy the provider
   */
  destroy(): void {
    this._awareness.off('update', this.handleAwarenessUpdate.bind(this));
    this.ydoc.off('update', this.handleDocUpdate.bind(this));
    this.disconnect();
  }
}
