/**
 * Yjs Document Manager
 *
 * Manages Yjs documents for collaborative editing.
 * Each screenplay gets its own Yjs document instance.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Map of screenplay ID to Yjs document
const documents = new Map<string, Y.Doc>();
const persistences = new Map<string, IndexeddbPersistence>();
const persistenceSyncStates = new Map<string, boolean>();

export interface YjsDocumentOptions {
  screenplayId: string;
  /** Initial content to set if document is empty */
  initialContent?: string;
  /** Callback when document is synced from IndexedDB */
  onSync?: () => void;
}

export interface YjsDocumentResult {
  ydoc: Y.Doc;
  /** Promise that resolves when IndexedDB persistence is synced */
  persistenceReady: Promise<void>;
  /** Whether IndexedDB persistence has synced */
  isPersistenceSynced: () => boolean;
}

/**
 * Get or create a Yjs document for a screenplay
 */
export function getYjsDocument(options: YjsDocumentOptions): YjsDocumentResult {
  const { screenplayId, initialContent, onSync } = options;

  // Return existing document if available
  if (documents.has(screenplayId)) {
    const ydoc = documents.get(screenplayId)!;
    return {
      ydoc,
      persistenceReady: persistenceSyncStates.get(screenplayId)
        ? Promise.resolve()
        : new Promise((resolve) => {
            const persistence = persistences.get(screenplayId);
            if (persistence) {
              if (persistence.synced) {
                resolve();
              } else {
                persistence.once('synced', () => resolve());
              }
            } else {
              resolve();
            }
          }),
      isPersistenceSynced: () => persistenceSyncStates.get(screenplayId) ?? false,
    };
  }

  // Create new document
  const ydoc = new Y.Doc();
  documents.set(screenplayId, ydoc);
  persistenceSyncStates.set(screenplayId, false);

  // Set up IndexedDB persistence for offline support
  const persistence = new IndexeddbPersistence(`screenplay-${screenplayId}`, ydoc);
  persistences.set(screenplayId, persistence);

  // Create promise that resolves when persistence syncs
  const persistenceReady = new Promise<void>((resolve) => {
    persistence.on('synced', () => {
      persistenceSyncStates.set(screenplayId, true);

      // If document is empty after sync, we need to initialize it
      // This happens before the binding is created
      const yXmlFragment = ydoc.getXmlFragment('prosemirror');
      if (yXmlFragment.length === 0 && initialContent) {
        // We'll let the hook handle initialization to avoid double-init
      }

      onSync?.();
      resolve();
    });
  });

  return {
    ydoc,
    persistenceReady,
    isPersistenceSynced: () => persistenceSyncStates.get(screenplayId) ?? false,
  };
}

/**
 * Get the XmlFragment for ProseMirror from a Yjs document
 */
export function getYjsXmlFragment(ydoc: Y.Doc): Y.XmlFragment {
  return ydoc.getXmlFragment('prosemirror');
}

/**
 * Destroy a Yjs document and clean up resources
 */
export async function destroyYjsDocument(screenplayId: string): Promise<void> {
  const persistence = persistences.get(screenplayId);
  if (persistence) {
    await persistence.destroy();
    persistences.delete(screenplayId);
  }
  
  const doc = documents.get(screenplayId);
  if (doc) {
    doc.destroy();
    documents.delete(screenplayId);
  }
}

/**
 * Get awareness from document for cursor/presence sync
 */
export function getAwareness(_ydoc: Y.Doc) {
  // Awareness is typically provided by the sync provider
  // For now, return null - will be set up by the provider
  return null;
}

/**
 * Export document state for saving to database
 */
export function exportDocumentState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Import document state from database
 */
export function importDocumentState(ydoc: Y.Doc, state: Uint8Array): void {
  Y.applyUpdate(ydoc, state);
}

/**
 * Get document as state vector for incremental sync
 */
export function getStateVector(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(ydoc);
}

/**
 * Get missing updates since a state vector
 */
export function getMissingUpdates(ydoc: Y.Doc, stateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc, stateVector);
}
