import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export const autocompletePluginKey = new PluginKey('autocomplete');

/**
 * Autocomplete suggestion item.
 */
export interface AutocompleteSuggestion {
  label: string;
  value: string;
  category: 'character' | 'location' | 'time' | 'transition' | 'extension';
  description?: string;
}

/**
 * Autocomplete plugin state.
 */
export interface AutocompleteState {
  active: boolean;
  query: string;
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number } | null;
  context: AutocompleteContext;
}

/**
 * Context for autocomplete suggestions.
 */
export type AutocompleteContext =
  | 'scene-prefix'      // INT./EXT. suggestions
  | 'location'          // Location suggestions after INT./EXT.
  | 'time-of-day'       // DAY/NIGHT/etc. suggestions
  | 'character'         // Character name suggestions
  | 'extension'         // V.O./O.S./CONT'D suggestions
  | 'transition'        // CUT TO:/FADE TO:/etc. suggestions
  | 'none';

/**
 * Default autocomplete state.
 */
const initialState: AutocompleteState = {
  active: false,
  query: '',
  suggestions: [],
  selectedIndex: 0,
  position: null,
  context: 'none',
};

/**
 * Scene prefix suggestions.
 */
const SCENE_PREFIXES: AutocompleteSuggestion[] = [
  { label: 'INT.', value: 'INT. ', category: 'location', description: 'Interior' },
  { label: 'EXT.', value: 'EXT. ', category: 'location', description: 'Exterior' },
  { label: 'INT./EXT.', value: 'INT./EXT. ', category: 'location', description: 'Interior/Exterior' },
  { label: 'I/E.', value: 'I/E. ', category: 'location', description: 'Interior/Exterior (short)' },
];

/**
 * Time of day suggestions.
 */
const TIME_OF_DAY: AutocompleteSuggestion[] = [
  { label: 'DAY', value: 'DAY', category: 'time' },
  { label: 'NIGHT', value: 'NIGHT', category: 'time' },
  { label: 'DAWN', value: 'DAWN', category: 'time' },
  { label: 'DUSK', value: 'DUSK', category: 'time' },
  { label: 'CONTINUOUS', value: 'CONTINUOUS', category: 'time' },
  { label: 'LATER', value: 'LATER', category: 'time' },
  { label: 'MOMENTS LATER', value: 'MOMENTS LATER', category: 'time' },
  { label: 'SAME', value: 'SAME', category: 'time' },
];

/**
 * Character extension suggestions.
 */
const CHARACTER_EXTENSIONS: AutocompleteSuggestion[] = [
  { label: '(V.O.)', value: ' (V.O.)', category: 'extension', description: 'Voice Over' },
  { label: '(O.S.)', value: ' (O.S.)', category: 'extension', description: 'Off Screen' },
  { label: '(O.C.)', value: ' (O.C.)', category: 'extension', description: 'Off Camera' },
  { label: "(CONT'D)", value: " (CONT'D)", category: 'extension', description: 'Continued' },
];

/**
 * Transition suggestions.
 */
const TRANSITIONS: AutocompleteSuggestion[] = [
  { label: 'CUT TO:', value: 'CUT TO:', category: 'transition' },
  { label: 'FADE TO:', value: 'FADE TO:', category: 'transition' },
  { label: 'DISSOLVE TO:', value: 'DISSOLVE TO:', category: 'transition' },
  { label: 'SMASH CUT TO:', value: 'SMASH CUT TO:', category: 'transition' },
  { label: 'MATCH CUT TO:', value: 'MATCH CUT TO:', category: 'transition' },
  { label: 'TIME CUT TO:', value: 'TIME CUT TO:', category: 'transition' },
  { label: 'FADE IN:', value: 'FADE IN:', category: 'transition' },
  { label: 'FADE OUT.', value: 'FADE OUT.', category: 'transition' },
];

/**
 * Determine autocomplete context from current state.
 */
function getContext(state: EditorState): { context: AutocompleteContext; query: string } {
  const { $head } = state.selection;
  const parentType = $head.parent.type.name;
  const text = $head.parent.textContent;
  const cursorPos = $head.parentOffset;
  const textBeforeCursor = text.slice(0, cursorPos);

  // Scene heading context
  if (parentType === 'scene_heading' || parentType === 'action') {
    // Check for scene prefix
    if (/^(I|IN|INT|E|EX|EXT)?$/i.test(textBeforeCursor)) {
      return { context: 'scene-prefix', query: textBeforeCursor };
    }

    // Check for time of day (after " - ")
    const timeMatch = textBeforeCursor.match(/\s+-\s+(\w*)$/);
    if (timeMatch) {
      return { context: 'time-of-day', query: timeMatch[1] || '' };
    }

    // Check for location (after INT./EXT.)
    const locationMatch = textBeforeCursor.match(/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+(.*)$/i);
    if (locationMatch && !textBeforeCursor.includes(' - ')) {
      return { context: 'location', query: locationMatch[1] || '' };
    }
  }

  // Character context
  if (parentType === 'character') {
    // Check for extension
    if (textBeforeCursor.length > 0 && !textBeforeCursor.includes('(')) {
      // Offer character names or extensions
      const lastChar = textBeforeCursor[textBeforeCursor.length - 1];
      if (lastChar === ' ' || /[A-Z]$/.test(textBeforeCursor)) {
        return { context: 'extension', query: '' };
      }
    }
    return { context: 'character', query: textBeforeCursor };
  }

  // Transition context
  if (parentType === 'transition') {
    return { context: 'transition', query: textBeforeCursor };
  }

  return { context: 'none', query: '' };
}

/**
 * Get suggestions based on context.
 */
function getSuggestions(
  context: AutocompleteContext,
  query: string,
  characters: string[] = [],
  locations: string[] = []
): AutocompleteSuggestion[] {
  const lowerQuery = query.toLowerCase();

  switch (context) {
    case 'scene-prefix':
      return SCENE_PREFIXES.filter((s) =>
        s.label.toLowerCase().startsWith(lowerQuery)
      );

    case 'time-of-day':
      return TIME_OF_DAY.filter((s) =>
        s.label.toLowerCase().startsWith(lowerQuery)
      );

    case 'location':
      return locations
        .filter((loc) => loc.toLowerCase().includes(lowerQuery))
        .slice(0, 5)
        .map((loc) => ({
          label: loc,
          value: loc,
          category: 'location' as const,
        }));

    case 'character':
      return characters
        .filter((char) => char.toLowerCase().startsWith(lowerQuery))
        .slice(0, 5)
        .map((char) => ({
          label: char,
          value: char,
          category: 'character' as const,
        }));

    case 'extension':
      return CHARACTER_EXTENSIONS;

    case 'transition':
      return TRANSITIONS.filter((s) =>
        s.label.toLowerCase().includes(lowerQuery)
      );

    default:
      return [];
  }
}

/**
 * Configuration for autocomplete plugin.
 */
export interface AutocompletePluginOptions {
  characters?: string[];
  locations?: string[];
  onStateChange?: (state: AutocompleteState) => void;
}

/**
 * Create the autocomplete plugin.
 */
export function createAutocompletePlugin(options: AutocompletePluginOptions = {}): Plugin {
  const { characters = [], locations = [], onStateChange } = options;

  return new Plugin({
    key: autocompletePluginKey,

    state: {
      init(): AutocompleteState {
        return initialState;
      },

      apply(tr, prevState, oldState, newState): AutocompleteState {
        // Check if selection changed or doc changed
        if (!tr.selectionSet && !tr.docChanged) {
          return prevState;
        }

        // Get context
        const { context, query } = getContext(newState);

        // No autocomplete context
        if (context === 'none') {
          if (prevState.active) {
            const state = { ...initialState };
            onStateChange?.(state);
            return state;
          }
          return prevState;
        }

        // Get suggestions
        const suggestions = getSuggestions(context, query, characters, locations);

        // No suggestions
        if (suggestions.length === 0) {
          if (prevState.active) {
            const state = { ...initialState };
            onStateChange?.(state);
            return state;
          }
          return prevState;
        }

        // Build new state
        const state: AutocompleteState = {
          active: true,
          query,
          suggestions,
          selectedIndex: Math.min(prevState.selectedIndex, suggestions.length - 1),
          position: null, // Will be calculated in view
          context,
        };

        onStateChange?.(state);
        return state;
      },
    },

    props: {
      handleKeyDown(view, event) {
        const state = autocompletePluginKey.getState(view.state) as AutocompleteState;
        if (!state?.active) return false;

        switch (event.key) {
          case 'ArrowDown': {
            event.preventDefault();
            const newIndex = (state.selectedIndex + 1) % state.suggestions.length;
            const newState = { ...state, selectedIndex: newIndex };
            view.dispatch(view.state.tr.setMeta(autocompletePluginKey, newState));
            onStateChange?.(newState);
            return true;
          }

          case 'ArrowUp': {
            event.preventDefault();
            const newIndex =
              (state.selectedIndex - 1 + state.suggestions.length) %
              state.suggestions.length;
            const newState = { ...state, selectedIndex: newIndex };
            view.dispatch(view.state.tr.setMeta(autocompletePluginKey, newState));
            onStateChange?.(newState);
            return true;
          }

          case ' ': {
            // Space dismisses autocomplete and lets editor handle it
            const newState = { ...initialState };
            view.dispatch(view.state.tr.setMeta(autocompletePluginKey, newState));
            onStateChange?.(newState);
            return false; // Let space pass through to editor
          }

          case 'Tab': {
            // Tab selects the current suggestion
            if (state.suggestions.length > 0) {
              event.preventDefault();
              const suggestion = state.suggestions[state.selectedIndex];
              applySuggestion(view, suggestion);
              return true;
            }
            return false;
          }

          case 'Enter': {
            // Enter dismisses autocomplete and lets element-switching handle it
            const newState = { ...initialState };
            view.dispatch(view.state.tr.setMeta(autocompletePluginKey, newState));
            onStateChange?.(newState);
            // Return false to allow element-switching plugin to create new block
            return false;
          }

          case 'Escape': {
            event.preventDefault();
            const newState = { ...initialState };
            view.dispatch(view.state.tr.setMeta(autocompletePluginKey, newState));
            onStateChange?.(newState);
            return true;
          }

          default:
            return false;
        }
      },
    },
  });
}

/**
 * Apply a suggestion to the editor.
 */
function applySuggestion(view: EditorView, suggestion: AutocompleteSuggestion): void {
  const { state, dispatch } = view;
  const { $head } = state.selection;
  const pluginState = autocompletePluginKey.getState(state) as AutocompleteState;

  // Calculate replacement range
  const start = $head.pos - pluginState.query.length;
  const end = $head.pos;

  // Create transaction
  const tr = state.tr.replaceWith(
    start,
    end,
    state.schema.text(suggestion.value)
  );

  dispatch(tr);
  view.focus();
}

export { getSuggestions, getContext, applySuggestion };
