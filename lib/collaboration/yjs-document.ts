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

export interface YjsDocumentOptions {
  screenplayId: string;
  /** Initial content to set if document is empty */
  initialContent?: string;
  /** Callback when document is synced from IndexedDB */
  onSync?: () => void;
}

/**
 * Get or create a Yjs document for a screenplay
 */
export function getYjsDocument(options: YjsDocumentOptions): Y.Doc {
  const { screenplayId, initialContent, onSync } = options;
  
  // Return existing document if available
  if (documents.has(screenplayId)) {
    return documents.get(screenplayId)!;
  }
  
  // Create new document
  const ydoc = new Y.Doc();
  documents.set(screenplayId, ydoc);
  
  // Set up IndexedDB persistence for offline support
  const persistence = new IndexeddbPersistence(`screenplay-${screenplayId}`, ydoc);
  persistences.set(screenplayId, persistence);
  
  persistence.on('synced', () => {
    // If document is empty after sync, initialize with content
    const yXmlFragment = ydoc.getXmlFragment('prosemirror');
    if (yXmlFragment.length === 0 && initialContent) {
      // Initial content will be set by ProseMirror binding
    }
    onSync?.();
  });
  
  return ydoc;
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
