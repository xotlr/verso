import { Plugin } from 'prosemirror-state';
import { history } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';

import { createInputRulesPlugin } from './input-rules';
import { createElementSwitchingPlugin, createTabArrowPlugin } from './element-switching';
import { createKeymapPlugin, createBaseKeymapPlugin } from './keymap';
import { createPaginationPlugin } from './pagination';
import { createSceneNumberingPlugin, SceneNumberingOptions } from './scene-numbering';
import { createSmartClickPlugin } from './smart-click';
import { createAutocompletePlugin, AutocompletePluginOptions } from './autocomplete';
import { createCollaborationPlugin, CollaborationPluginOptions } from './collaboration';
import { createPastePlugin, CoverPageData } from './paste-handler';
import { createTypewriterScrollPlugin } from './typewriter-scroll';
import { createShotMarkersPlugin, ShotMarker } from './shot-markers';
import { createPaginationChangeTracker } from './pagination-change-tracker';
import { createYjsCollaborationPlugins, type YjsCollaborationPluginOptions } from './yjs-collaboration';
import { createTypingMetricsPlugin, type TypingMetricsOptions } from './typing-metrics';

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
  // Enable scene numbering on left margin
  sceneNumbering?: boolean;
  // Scene numbering options
  sceneNumberingOptions?: SceneNumberingOptions;
  // Enable autocomplete suggestions
  autocomplete?: boolean;
  // Autocomplete options
  autocompleteOptions?: AutocompletePluginOptions;
  // Enable real-time collaboration
  collaboration?: boolean;
  // Collaboration options
  collaborationOptions?: CollaborationPluginOptions;
  // Callback when cover page is detected in pasted content
  onCoverPageDetected?: (coverPage: CoverPageData) => void;
  // Enable typewriter scroll (keeps cursor centered)
  typewriterScroll?: boolean;
  // Initial enabled state for typewriter scroll
  typewriterScrollEnabled?: boolean;
  // Enable shot markers for linking shots to document positions
  shotMarkers?: boolean;
  // Initial shot markers data
  initialShotMarkers?: ShotMarker[];
  // Enable pagination change tracking for incremental pagination
  paginationChangeTracker?: boolean;
  // Yjs CRDT collaboration (replaces history plugin when enabled)
  yjs?: boolean;
  // Yjs plugin options
  yjsOptions?: YjsCollaborationPluginOptions;
  // Enable typing metrics for debug panel (dev only)
  typingMetrics?: boolean;
  // Typing metrics options
  typingMetricsOptions?: TypingMetricsOptions;
}

const defaultOptions: CreatePluginsOptions = {
  inputRules: true,
  elementSwitching: true,
  keymap: true,
  history: true,
  dropCursor: true,
  gapCursor: true,
  pagination: true,
  sceneNumbering: true,
  autocomplete: true,
  collaboration: false, // Disabled by default, enabled when collaboration is active
  typewriterScroll: true,
  typewriterScrollEnabled: false, // Off by default, user can enable in settings
  shotMarkers: true, // Enabled by default for shot-to-text linking
  paginationChangeTracker: true, // Enabled by default for incremental pagination
  typingMetrics: process.env.NODE_ENV === 'development', // Dev-only
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
    // Tab+Arrow navigation (hold Tab + Left/Right arrows to cycle elements)
    plugins.push(createTabArrowPlugin());
  }

  // Custom keymap (before base keymap)
  if (opts.keymap) {
    plugins.push(createKeymapPlugin());
  }

  // Base keymap (basic text editing)
  plugins.push(createBaseKeymapPlugin());

  // History (undo/redo) - Yjs has its own undo manager
  if (opts.yjs && opts.yjsOptions) {
    // Use Yjs collaboration plugins (includes undo/redo)
    plugins.push(...createYjsCollaborationPlugins(opts.yjsOptions));
  } else if (opts.history) {
    // Use standard prosemirror-history
    plugins.push(history());
  }

  // Pagination (page breaks)
  if (opts.pagination) {
    plugins.push(createPaginationPlugin());
  }

  // Pagination change tracking (for incremental pagination)
  if (opts.paginationChangeTracker) {
    plugins.push(createPaginationChangeTracker());
  }

  // Scene numbering
  if (opts.sceneNumbering) {
    plugins.push(createSceneNumberingPlugin(opts.sceneNumberingOptions || {}));
  }

  // Smart click-to-focus (nearest editable line)
  plugins.push(createSmartClickPlugin());

  // Autocomplete suggestions
  if (opts.autocomplete) {
    plugins.push(createAutocompletePlugin(opts.autocompleteOptions || {}));
  }

  // Real-time collaboration
  if (opts.collaboration) {
    plugins.push(createCollaborationPlugin(opts.collaborationOptions || {}));
  }

  // Typewriter scroll (keeps cursor centered)
  if (opts.typewriterScroll) {
    plugins.push(createTypewriterScrollPlugin({ enabled: opts.typewriterScrollEnabled ?? false }));
  }

  // Shot markers (invisible metadata linking shots to positions)
  if (opts.shotMarkers) {
    plugins.push(createShotMarkersPlugin(opts.initialShotMarkers || []));
  }

  // Drop cursor
  if (opts.dropCursor) {
    plugins.push(dropCursor());
  }

  // Gap cursor
  if (opts.gapCursor) {
    plugins.push(gapCursor());
  }

  // Paste handler (cover page detection)
  plugins.push(createPastePlugin({
    onCoverPageDetected: opts.onCoverPageDetected,
  }));

  // Typing metrics (dev only)
  if (opts.typingMetrics) {
    plugins.push(createTypingMetricsPlugin(opts.typingMetricsOptions || {}));
  }

  return plugins;
}

// Re-export individual plugin creators
export { createInputRulesPlugin } from './input-rules';
export { createElementSwitchingPlugin, createTabArrowPlugin, tabArrowPluginKey, elementCommands, setElementType } from './element-switching';
export { createKeymapPlugin, createBaseKeymapPlugin, toggleBold, toggleItalic, toggleUnderline } from './keymap';
export {
  createSceneNumberingPlugin,
  sceneNumberingPluginKey,
  updateSceneNumberingSettings,
  updateWasmSceneNumbers,
  getSceneNumberingState,
  SCENE_NUMBERING_WASM_META,
} from './scene-numbering';
export type { SceneNumberingOptions } from './scene-numbering';
export { createSmartClickPlugin, smartClickPluginKey } from './smart-click';
export { createAutocompletePlugin, autocompletePluginKey, applySuggestion } from './autocomplete';
export type { AutocompleteState, AutocompleteSuggestion, AutocompletePluginOptions } from './autocomplete';
export { createCollaborationPlugin, collaborationPluginKey, updateRemoteUsers } from './collaboration';
export type { CollaborationPluginOptions, CollaborationPluginState } from './collaboration';

// Pagination plugin exports
export {
  createPaginationPlugin,
  paginationPluginKey,
  getPaginationState,
  updatePaginationState,
  PAGINATION_UPDATE_META,
} from './pagination';
export type { PaginationState, PageBreak } from './pagination';

// Paste handler plugin exports
export { createPastePlugin, pastePluginKey, extractCoverPage } from './paste-handler';
export type { CoverPageData, PastePluginOptions } from './paste-handler';

// Typewriter scroll plugin exports
export {
  createTypewriterScrollPlugin,
  typewriterScrollPluginKey,
  updateTypewriterScrollSettings,
  toggleTypewriterScroll,
  getTypewriterScrollState,
} from './typewriter-scroll';
export type { TypewriterScrollOptions } from './typewriter-scroll';

// Shot markers plugin exports
export {
  createShotMarkersPlugin,
  shotMarkersPluginKey,
  addShotMarker,
  removeShotMarker,
  removeShotMarkersForShot,
  setShotMarkers,
  getShotMarkersState,
  getMarkersForScene,
  getMarkerForShot,
  hasMarkerNearPosition,
} from './shot-markers';
export type { ShotMarker, ShotMarkersState } from './shot-markers';

// Pagination change tracker plugin exports
export {
  createPaginationChangeTracker,
  paginationChangeTrackerKey,
  getAccumulatedChanges,
  hasReliableChangeData,
  createClearChangesTr,
} from './pagination-change-tracker';
export type { ChangeTrackerState } from './pagination-change-tracker';

// Typing metrics plugin exports (dev only)
export {
  createTypingMetricsPlugin,
  typingMetricsPluginKey,
  TYPING_METRICS_ENABLE_META,
} from './typing-metrics';
export type { TypingMetricsOptions, TypingMetricsState } from './typing-metrics';
