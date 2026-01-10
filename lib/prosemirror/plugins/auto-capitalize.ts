import { Plugin, PluginKey, Transaction, TextSelection } from 'prosemirror-state';

export interface AutoCapitalizeOptions {
  /** Enable auto-capitalize (default: true) */
  enabled?: boolean;
}

export interface AutoCapitalizeState {
  enabled: boolean;
}

export const autoCapitalizePluginKey = new PluginKey<AutoCapitalizeState>('autoCapitalize');

/** Node types that should be auto-capitalized */
const AUTO_CAPITALIZE_NODES = new Set([
  'character',
  'scene_heading',
]);

/**
 * Create auto-capitalize plugin.
 * Transforms text to uppercase in character and scene_heading elements as typed.
 *
 * This is different from the HTML autocapitalize attribute which only works on mobile.
 * This plugin provides consistent uppercase behavior across all platforms.
 */
export function createAutoCapitalizePlugin(options: AutoCapitalizeOptions = {}): Plugin {
  const { enabled = true } = options;

  return new Plugin({
    key: autoCapitalizePluginKey,

    state: {
      init(): AutoCapitalizeState {
        return { enabled };
      },
      apply(tr, state): AutoCapitalizeState {
        const meta = tr.getMeta(autoCapitalizePluginKey);
        if (meta?.enabled !== undefined) {
          return { enabled: meta.enabled };
        }
        return state;
      },
    },

    appendTransaction(transactions, oldState, newState) {
      // Check if enabled
      const pluginState = autoCapitalizePluginKey.getState(newState);
      if (!pluginState?.enabled) return null;

      // Only process if text was inserted
      const docChanged = transactions.some(tr => tr.docChanged);
      if (!docChanged) return null;

      // Get the text change - only process single character insertions (typing)
      let hasTextInsert = false;
      for (const tr of transactions) {
        tr.steps.forEach(step => {
          // Check if it's a replace step with text content
          const stepJSON = step.toJSON();
          if (stepJSON.stepType === 'replace' && stepJSON.slice?.content) {
            hasTextInsert = true;
          }
        });
      }
      if (!hasTextInsert) return null;

      // Check if cursor is in an auto-capitalize node
      const { $from } = newState.selection;
      const parentType = $from.parent.type.name;

      if (!AUTO_CAPITALIZE_NODES.has(parentType)) {
        return null;
      }

      // Get the current text content
      const text = $from.parent.textContent;
      const upperText = text.toUpperCase();

      // If already uppercase, no change needed
      if (text === upperText) {
        return null;
      }

      // Create transaction to replace with uppercase
      // Find the node position
      const nodePos = $from.before($from.depth);
      const nodeEndPos = nodePos + $from.parent.nodeSize;

      // Replace the text content with uppercase
      const tr = newState.tr;

      // Delete current text and insert uppercase version
      // Keep the node type and attributes, just replace the text
      if ($from.parent.content.size > 0) {
        tr.insertText(
          upperText,
          nodePos + 1,  // Start after opening tag
          nodeEndPos - 1  // End before closing tag
        );

        // Preserve cursor position at the end
        const newPos = nodePos + 1 + upperText.length;
        if (newPos <= tr.doc.content.size) {
          tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
        }

        // Don't add to history - this is a formatting transform
        tr.setMeta('addToHistory', false);
        tr.setMeta('autoCapitalize', true);

        return tr;
      }

      return null;
    },
  });
}

/**
 * Update auto-capitalize settings via transaction.
 */
export function updateAutoCapitalizeSettings(
  view: { state: import('prosemirror-state').EditorState; dispatch: (tr: Transaction) => void },
  options: { enabled: boolean }
): void {
  const tr = view.state.tr.setMeta(autoCapitalizePluginKey, options);
  view.dispatch(tr);
}
