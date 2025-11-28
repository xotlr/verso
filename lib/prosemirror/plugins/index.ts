import { Plugin } from 'prosemirror-state';
import { history } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';

import { createInputRulesPlugin } from './input-rules';
import { createElementSwitchingPlugin } from './element-switching';
import { createKeymapPlugin, createBaseKeymapPlugin } from './keymap';
import { createPaginationPlugin } from './pagination';
import { createAutocompletePlugin, AutocompletePluginOptions } from './autocomplete';

export interface CreatePluginsOptions {
  // Enable input rules for auto-formatting
  inputRules?: boolean;
  // Enable element switching via Tab/Enter
  elementSwitching?: boolean;
  // Enable keyboard shortcuts
  keymap?: boolean;
  // Enable undo/redo history
  history?: boolean;
  // Enable drop cursor for drag & drop
  dropCursor?: boolean;
  // Enable gap cursor for navigation
  gapCursor?: boolean;
  // Enable pagination with page breaks
  pagination?: boolean;
  // Enable autocomplete suggestions
  autocomplete?: boolean;
  // Autocomplete options
  autocompleteOptions?: AutocompletePluginOptions;
}

const defaultOptions: CreatePluginsOptions = {
  inputRules: true,
  elementSwitching: true,
  keymap: true,
  history: true,
  dropCursor: true,
  gapCursor: true,
  pagination: true,
  autocomplete: true,
};

/**
 * Create all ProseMirror plugins for the screenplay editor.
 */
export function createAllPlugins(options: CreatePluginsOptions = {}): Plugin[] {
  const opts = { ...defaultOptions, ...options };
  const plugins: Plugin[] = [];

  // Input rules must come before keymap
  if (opts.inputRules) {
    plugins.push(createInputRulesPlugin());
  }

  // Element switching (Tab/Enter handling)
  if (opts.elementSwitching) {
    plugins.push(createElementSwitchingPlugin());
  }

  // Custom keymap (before base keymap)
  if (opts.keymap) {
    plugins.push(createKeymapPlugin());
  }

  // Base keymap (basic text editing)
  plugins.push(createBaseKeymapPlugin());

  // History (undo/redo)
  if (opts.history) {
    plugins.push(history());
  }

  // Pagination (page breaks)
  if (opts.pagination) {
    plugins.push(createPaginationPlugin());
  }

  // Autocomplete suggestions
  if (opts.autocomplete) {
    plugins.push(createAutocompletePlugin(opts.autocompleteOptions || {}));
  }

  // Drop cursor
  if (opts.dropCursor) {
    plugins.push(dropCursor());
  }

  // Gap cursor
  if (opts.gapCursor) {
    plugins.push(gapCursor());
  }

  return plugins;
}

// Re-export individual plugin creators
export { createInputRulesPlugin } from './input-rules';
export { createElementSwitchingPlugin, elementCommands, setElementType } from './element-switching';
export { createKeymapPlugin, createBaseKeymapPlugin, toggleBold, toggleItalic, toggleUnderline } from './keymap';
export { createAutocompletePlugin, autocompletePluginKey, applySuggestion } from './autocomplete';
export type { AutocompleteState, AutocompleteSuggestion, AutocompletePluginOptions } from './autocomplete';
