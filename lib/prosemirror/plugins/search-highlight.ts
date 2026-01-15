import { Plugin, PluginKey } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';

/**
 * Plugin key for search highlight decorations.
 * Used by FindReplacePanel to dispatch decoration updates.
 */
export const searchHighlightKey = new PluginKey<DecorationSet>('searchHighlight');

/**
 * Creates the search highlight plugin that manages find/replace decorations.
 * This plugin stores DecorationSet state and applies it to the editor view.
 */
export function createSearchHighlightPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: searchHighlightKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, decorations) {
        // Check for decoration updates in transaction meta
        const newDecorations = tr.getMeta(searchHighlightKey);
        if (newDecorations !== undefined) {
          return newDecorations;
        }
        // Map existing decorations through document changes
        return decorations.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
