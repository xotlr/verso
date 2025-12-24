/**
 * Pagination Change Tracker
 *
 * Tracks document changes for incremental pagination.
 * When edits occur, we record the approximate element index to enable
 * the WASM pagination engine to skip recalculating unchanged pages.
 */

import { Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import type { DocumentChange, ChangeType } from '@/lib/verso/types';

export interface ChangeTrackerState {
  /** Changes accumulated since last pagination */
  changes: DocumentChange[];
  /** Whether we have reliable change data */
  hasReliableChanges: boolean;
}

export const paginationChangeTrackerKey = new PluginKey<ChangeTrackerState>('paginationChangeTracker');

/**
 * Convert a ProseMirror document position to an element index.
 *
 * Elements in the screenplay are top-level children of the doc.
 * This function finds which element contains the given position.
 */
function posToElementIndex(doc: ProseMirrorNode, pos: number): number {
  let elementIndex = 0;
  let currentPos = 0;

  // Skip title_page if present
  const firstChild = doc.firstChild;
  if (firstChild?.type.name === 'title_page') {
    if (pos < firstChild.nodeSize) {
      return 0; // Inside title page, treat as first element
    }
    currentPos = firstChild.nodeSize;
    elementIndex = 0; // Title page is not counted as an element for pagination
  }

  // Walk through remaining children
  for (let i = firstChild?.type.name === 'title_page' ? 1 : 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const nodeStart = currentPos;
    const nodeEnd = currentPos + child.nodeSize;

    if (pos >= nodeStart && pos < nodeEnd) {
      return elementIndex;
    }

    currentPos = nodeEnd;
    elementIndex++;
  }

  // Position is at or after the end - return last element
  return Math.max(0, elementIndex - 1);
}

/**
 * Analyze a transaction to extract document changes.
 */
function analyzeTransaction(tr: Transaction): DocumentChange[] {
  if (!tr.docChanged) {
    return [];
  }

  const changes: DocumentChange[] = [];
  const doc = tr.doc;

  // Track the earliest position that changed
  let earliestChangePos = Infinity;

  tr.steps.forEach((_step, stepIndex) => {
    const map = tr.mapping.maps[stepIndex];

    // forEach gives us: oldStart, oldEnd, newStart, newEnd
    map.forEach((_oldStart, _oldEnd, newStart, _newEnd) => {
      earliestChangePos = Math.min(earliestChangePos, newStart);
    });
  });

  if (earliestChangePos === Infinity) {
    return [];
  }

  // Convert position to element index
  const elementIndex = posToElementIndex(doc, earliestChangePos);

  // Determine change type based on document size change
  const sizeDiff = tr.doc.content.size - tr.before.content.size;
  let changeType: ChangeType;

  if (sizeDiff > 0) {
    changeType = 'insert';
  } else if (sizeDiff < 0) {
    changeType = 'delete';
  } else {
    changeType = 'modify';
  }

  // Create a single change representing the edit region
  changes.push({
    start_index: elementIndex,
    end_index: elementIndex + 1,
    change_type: changeType,
  });

  return changes;
}

/**
 * Create the pagination change tracker plugin.
 *
 * This plugin accumulates changes between pagination runs.
 * After each pagination, call `clearChanges()` to reset.
 */
export function createPaginationChangeTracker(): Plugin<ChangeTrackerState> {
  return new Plugin<ChangeTrackerState>({
    key: paginationChangeTrackerKey,

    state: {
      init(): ChangeTrackerState {
        return {
          changes: [],
          hasReliableChanges: true,
        };
      },

      apply(tr, state): ChangeTrackerState {
        // Check for explicit clear
        const clearMeta = tr.getMeta(paginationChangeTrackerKey);
        if (clearMeta?.clear) {
          return {
            changes: [],
            hasReliableChanges: true,
          };
        }

        // Skip non-document-changing transactions
        if (!tr.docChanged) {
          return state;
        }

        // Analyze the transaction
        const newChanges = analyzeTransaction(tr);

        if (newChanges.length === 0) {
          return state;
        }

        // Merge with existing changes
        // For simplicity, just keep all changes - WASM will find the earliest
        return {
          changes: [...state.changes, ...newChanges],
          hasReliableChanges: state.hasReliableChanges,
        };
      },
    },
  });
}

/**
 * Get accumulated changes from editor state.
 */
export function getAccumulatedChanges(state: { plugins: readonly Plugin[] }): DocumentChange[] {
  const pluginState = paginationChangeTrackerKey.getState(state as Parameters<typeof paginationChangeTrackerKey.getState>[0]);
  return pluginState?.changes ?? [];
}

/**
 * Check if we have reliable change tracking data.
 */
export function hasReliableChangeData(state: { plugins: readonly Plugin[] }): boolean {
  const pluginState = paginationChangeTrackerKey.getState(state as Parameters<typeof paginationChangeTrackerKey.getState>[0]);
  return pluginState?.hasReliableChanges ?? false;
}

/**
 * Create a transaction that clears accumulated changes.
 * Call this after pagination completes.
 */
export function createClearChangesTr(tr: Transaction): Transaction {
  return tr.setMeta(paginationChangeTrackerKey, { clear: true });
}
