// Schema
export {
  screenplaySchema,
  type ElementType,
  ELEMENT_CYCLE_ORDER,
  ELEMENT_DISPLAY_NAMES,
  ELEMENT_SHORTCUTS,
  ELEMENT_PLACEHOLDERS,
  getNextElementType,
  getPreviousElementType,
} from './schema';

// Serialization
export {
  type SerializedScreenplay,
  type ProseMirrorJSON,
  isProseMirrorContent,
  plainTextToProseMirror,
  proseMirrorToPlainText,
  serializeForStorage,
  deserializeFromStorage,
  createEmptyDocument,
  createStarterDocument,
} from './serialization';

// Plugins
export { createAllPlugins } from './plugins';
export { createAutocompletePlugin, type AutocompleteState, type AutocompleteSuggestion } from './plugins/autocomplete';
export { elementCommands } from './plugins/element-switching';
