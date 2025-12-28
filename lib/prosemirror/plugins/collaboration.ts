/**
 * ProseMirror Collaboration Plugin
 *
 * Provides remote cursor display and local change broadcasting for timelapse.
 *
 * ## What This Plugin Does
 *
 * - **Remote cursor decorations**: Shows where other users are editing
 * - **Change broadcasting**: Debounced (300ms) notifications of local edits
 *   via `onLocalChange` callback for timelapse recording
 *
 * ## Real-time Collaboration
 *
 * Document sync is handled by Yjs CRDT:
 * - Uses `useYjsCollaboration` hook → `SupabaseYjsProvider`
 * - ProseMirror binds to Yjs via `createYjsCollaborationPlugins` (y-prosemirror)
 * - Full conflict-free sync with proper cursor awareness
 *
 * @see `/hooks/use-yjs-collaboration.ts` - Collaboration hook
 * @see `/lib/prosemirror/plugins/yjs-collaboration.ts` - Yjs plugin factory
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { RemoteUser } from '@/types/collaboration';

export const collaborationPluginKey = new PluginKey('collaboration');

export interface CollaborationPluginState {
  remoteUsers: RemoteUser[];
  decorations: DecorationSet;
  lastRemoteUpdate: number;
}

export interface CollaborationPluginOptions {
  onLocalChange?: (content: string, cursorPos: number) => void;
  getRemoteUsers?: () => RemoteUser[];
}

/**
 * Create the collaboration plugin
 */
export function createCollaborationPlugin(
  options: CollaborationPluginOptions = {}
): Plugin<CollaborationPluginState> {
  return new Plugin<CollaborationPluginState>({
    key: collaborationPluginKey,

    state: {
      init() {
        return {
          remoteUsers: [],
          decorations: DecorationSet.empty,
          lastRemoteUpdate: 0,
        };
      },

      apply(tr, value, oldState, newState) {
        const meta = tr.getMeta(collaborationPluginKey);

        // Handle remote user updates
        if (meta?.type === 'updateRemoteUsers') {
          const remoteUsers = meta.users as RemoteUser[];
          return {
            ...value,
            remoteUsers,
            decorations: createRemoteCursorDecorations(newState.doc, remoteUsers),
          };
        }

        // Handle remote content changes
        if (meta?.type === 'remoteChange') {
          return {
            ...value,
            lastRemoteUpdate: Date.now(),
          };
        }

        // Update decorations on document change
        if (tr.docChanged) {
          return {
            ...value,
            decorations: value.decorations.map(tr.mapping, tr.doc),
          };
        }

        return value;
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations;
      },
    },

    view(_editorView) {
      let updateTimeout: NodeJS.Timeout | null = null;

      return {
        update(view, prevState) {
          // Debounce local changes to avoid flooding the network
          if (view.state.doc !== prevState.doc) {
            if (updateTimeout) clearTimeout(updateTimeout);

            updateTimeout = setTimeout(() => {
              if (options.onLocalChange) {
                const content = view.state.doc.textContent;
                const cursorPos = view.state.selection.from;
                options.onLocalChange(content, cursorPos);
              }
            }, 300); // 300ms debounce
          }
        },

        destroy() {
          if (updateTimeout) clearTimeout(updateTimeout);
        },
      };
    },
  });
}

/**
 * Create decorations for remote cursors
 */
function createRemoteCursorDecorations(doc: ProseMirrorNode, remoteUsers: RemoteUser[]): DecorationSet {
  const decorations: Decoration[] = [];

  remoteUsers.forEach((user) => {
    const pos = Math.min(user.cursorPosition, doc.content.size);
    if (pos < 0 || pos > doc.content.size) return;

    // Create cursor decoration
    const cursorWidget = document.createElement('span');
    cursorWidget.className = 'remote-cursor';
    cursorWidget.style.borderLeft = `2px solid ${user.color}`;
    cursorWidget.style.height = '1.2em';
    cursorWidget.style.display = 'inline-block';
    cursorWidget.style.position = 'relative';
    cursorWidget.style.animation = 'blink 1s infinite';

    // Create label
    const label = document.createElement('span');
    label.className = 'remote-cursor-label';
    label.textContent = user.name;
    label.style.position = 'absolute';
    label.style.top = '-20px';
    label.style.left = '2px';
    label.style.backgroundColor = user.color;
    label.style.color = 'white';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '3px';
    label.style.fontSize = '11px';
    label.style.fontWeight = '500';
    label.style.whiteSpace = 'nowrap';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '1000';

    cursorWidget.appendChild(label);

    const decoration = Decoration.widget(pos, cursorWidget, {
      side: -1,
      key: `cursor-${user.id}`,
    });

    decorations.push(decoration);
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Update remote users in the editor
 */
export function updateRemoteUsers(view: EditorView, users: RemoteUser[]) {
  const tr = view.state.tr.setMeta(collaborationPluginKey, {
    type: 'updateRemoteUsers',
    users,
  });
  view.dispatch(tr);
}

