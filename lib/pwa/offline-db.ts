/**
 * Offline Database using IndexedDB
 *
 * Provides local storage for screenplay drafts and a sync queue
 * for offline-first editing capability.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Types for offline drafts
export interface OfflineDraft {
  screenplayId: string;
  content: string;
  title: string;
  lastModified: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict';
  localVersion: number;
  serverUpdatedAt?: number;
}

// Types for sync queue items
export interface SyncQueueItem {
  id: string;
  type: 'save' | 'create-version';
  screenplayId: string;
  payload: {
    content?: string;
    title?: string;
    reason?: string;
  };
  timestamp: number;
  attempts: number;
}

// IndexedDB Schema
interface VersoDB extends DBSchema {
  drafts: {
    key: string;
    value: OfflineDraft;
    indexes: { 'by-sync-status': string };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'verso-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<VersoDB> | null = null;

/**
 * Get or create the IndexedDB instance
 */
export async function getDB(): Promise<IDBPDatabase<VersoDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VersoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create drafts store
      if (!db.objectStoreNames.contains('drafts')) {
        const draftsStore = db.createObjectStore('drafts', { keyPath: 'screenplayId' });
        draftsStore.createIndex('by-sync-status', 'syncStatus');
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

/**
 * Save a draft to IndexedDB
 */
export async function saveDraft(draft: OfflineDraft): Promise<void> {
  const db = await getDB();
  await db.put('drafts', draft);
}

/**
 * Get a draft from IndexedDB
 */
export async function getDraft(screenplayId: string): Promise<OfflineDraft | undefined> {
  const db = await getDB();
  return db.get('drafts', screenplayId);
}

/**
 * Get all drafts with a specific sync status
 */
export async function getDraftsByStatus(status: OfflineDraft['syncStatus']): Promise<OfflineDraft[]> {
  const db = await getDB();
  return db.getAllFromIndex('drafts', 'by-sync-status', status);
}

/**
 * Delete a draft from IndexedDB
 */
export async function deleteDraft(screenplayId: string): Promise<void> {
  const db = await getDB();
  await db.delete('drafts', screenplayId);
}

/**
 * Update draft sync status
 */
export async function updateDraftStatus(
  screenplayId: string,
  status: OfflineDraft['syncStatus'],
  serverUpdatedAt?: number
): Promise<void> {
  const db = await getDB();
  const draft = await db.get('drafts', screenplayId);
  if (draft) {
    draft.syncStatus = status;
    if (serverUpdatedAt !== undefined) {
      draft.serverUpdatedAt = serverUpdatedAt;
    }
    await db.put('drafts', draft);
  }
}

/**
 * Add an item to the sync queue
 */
export async function queueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'attempts'>): Promise<void> {
  const db = await getDB();
  const queueItem: SyncQueueItem = {
    ...item,
    id: `${item.screenplayId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    attempts: 0,
  };
  await db.put('syncQueue', queueItem);
}

/**
 * Get all items from the sync queue, ordered by timestamp
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

/**
 * Remove an item from the sync queue
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

/**
 * Increment attempt count for a queue item
 */
export async function incrementSyncAttempt(id: string): Promise<SyncQueueItem | null> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.attempts++;
    item.timestamp = Date.now(); // Move to back of queue
    await db.put('syncQueue', item);
    return item;
  }
  return null;
}

/**
 * Clear all synced drafts older than specified age
 */
export async function cleanupSyncedDrafts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const db = await getDB();
  const syncedDrafts = await db.getAllFromIndex('drafts', 'by-sync-status', 'synced');
  const cutoffTime = Date.now() - maxAgeMs;

  for (const draft of syncedDrafts) {
    if (draft.lastModified < cutoffTime) {
      await db.delete('drafts', draft.screenplayId);
    }
  }
}

/**
 * Get pending sync count
 */
export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB();
  const queue = await db.getAll('syncQueue');
  return queue.length;
}

/**
 * Check if there are any pending changes for a screenplay
 */
export async function hasPendingChanges(screenplayId: string): Promise<boolean> {
  const draft = await getDraft(screenplayId);
  return draft?.syncStatus === 'pending' || draft?.syncStatus === 'syncing';
}
