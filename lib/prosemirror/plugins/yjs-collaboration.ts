/**
 * Yjs ProseMirror Collaboration Plugin
 * 
 * Integrates Yjs CRDT with ProseMirror for real-time collaboration.
 * Uses y-prosemirror for binding.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo as yjsUndoCheck,
  redo as yjsRedoCheck,
  undoCommand,
  redoCommand,
} from 'y-prosemirror';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';

export const yjsCollaborationPluginKey = new PluginKey('yjs-collaboration');

export interface YjsCollaborationPluginOptions {
  /** The Yjs XmlFragment to sync with */
  yXmlFragment: Y.XmlFragment;
  /** Awareness instance for cursor sync */
  awareness: Awareness;
  /** User's cursor color */
  cursorColor?: string;
  /** User's name to display at cursor */
  cursorName?: string;
}

/**
 * Create Yjs collaboration plugins for ProseMirror
 * 
 * Returns an array of plugins that should be added to the editor:
 * - ySyncPlugin: Syncs document state with Yjs
 * - yCursorPlugin: Shows remote user cursors
 * - yUndoPlugin: Provides undo/redo that works with Yjs
 */
export function createYjsCollaborationPlugins(
  options: YjsCollaborationPluginOptions
): Plugin[] {
  const { yXmlFragment, awareness, cursorColor, cursorName } = options;

  // Update local awareness state with cursor info
  if (cursorColor || cursorName) {
    awareness.setLocalStateField('user', {
      ...awareness.getLocalState()?.user,
      color: cursorColor,
      name: cursorName,
    });
  }

  return [
    // Sync plugin - binds ProseMirror state to Yjs
    ySyncPlugin(yXmlFragment),
    
    // Cursor plugin - shows remote user cursors
    yCursorPlugin(awareness, {
      // Custom cursor builder for styling
      cursorBuilder: (user) => {
        const cursor = document.createElement('span');
        cursor.className = 'yjs-cursor';
        const userColor = user.color || '#999';
        cursor.style.borderLeft = '2px solid ' + userColor;
        cursor.style.borderRight = 'none';
        cursor.style.marginLeft = '-1px';
        cursor.style.marginRight = '-1px';
        cursor.style.pointerEvents = 'none';
        cursor.style.position = 'relative';
        cursor.style.height = '1.2em';
        cursor.style.display = 'inline-block';
        
        // Add name label
        const label = document.createElement('div');
        label.className = 'yjs-cursor-label';
        label.textContent = user.name || 'Anonymous';
        label.style.position = 'absolute';
        label.style.top = '-18px';
        label.style.left = '0';
        label.style.backgroundColor = userColor;
        label.style.color = 'white';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '3px';
        label.style.fontSize = '11px';
        label.style.fontWeight = '500';
        label.style.whiteSpace = 'nowrap';
        label.style.pointerEvents = 'none';
        label.style.zIndex = '1000';
        
        cursor.appendChild(label);
        return cursor;
      },
    }),
    
    // Undo plugin - provides undo/redo compatible with Yjs
    yUndoPlugin(),
  ];
}

/**
 * Yjs-aware undo command (ProseMirror Command signature)
 */
export { undoCommand as yjsUndo };

/**
 * Yjs-aware redo command (ProseMirror Command signature)
 */
export { redoCommand as yjsRedo };

/**
 * Check if Yjs undo is available (for canUndo state)
 */
export { yjsUndoCheck };

/**
 * Check if Yjs redo is available (for canRedo state)
 */
export { yjsRedoCheck };

/**
 * Check if Yjs collaboration is active in the editor state
 */
export function isYjsCollaborationActive(state: { plugins: Plugin[] }): boolean {
  return state.plugins.some(p => p.spec.key === yjsCollaborationPluginKey);
}
