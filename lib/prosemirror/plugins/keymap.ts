import { Plugin, Selection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { undo, redo } from 'prosemirror-history';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { screenplaySchema } from '../schema';
import { elementCommands } from './element-switching';

/**
 * Toggle bold mark command.
 */
const toggleBold = toggleMark(screenplaySchema.marks.bold);

/**
 * Toggle italic mark command.
 */
const toggleItalic = toggleMark(screenplaySchema.marks.italic);

/**
 * Toggle underline mark command.
 */
const toggleUnderline = toggleMark(screenplaySchema.marks.underline);

/**
 * Create the main keymap plugin with all shortcuts.
 */
export function createKeymapPlugin(): Plugin {
  const bindings: Record<string, ReturnType<typeof toggleMark>> = {
    // Undo/Redo
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,

    // Formatting
    'Mod-b': toggleBold,
    'Mod-i': toggleItalic,
    'Mod-u': toggleUnderline,

    // Element shortcuts
    'Mod-1': elementCommands.setSceneHeading,
    'Mod-2': elementCommands.setAction,
    'Mod-3': elementCommands.setCharacter,
    'Mod-4': elementCommands.setDialogue,
    'Mod-5': elementCommands.setParenthetical,
    'Mod-6': elementCommands.setTransition,

    // Navigation
    'Mod-Home': (state, dispatch) => {
      if (dispatch) {
        const tr = state.tr.setSelection(
          Selection.atStart(state.doc)
        );
        dispatch(tr.scrollIntoView());
      }
      return true;
    },
    'Mod-End': (state, dispatch) => {
      if (dispatch) {
        const tr = state.tr.setSelection(
          Selection.atEnd(state.doc)
        );
        dispatch(tr.scrollIntoView());
      }
      return true;
    },
  };

  return keymap(bindings);
}

/**
 * Create the base keymap plugin (basic text editing).
 */
export function createBaseKeymapPlugin(): Plugin {
  return keymap(baseKeymap);
}

export { toggleBold, toggleItalic, toggleUnderline };
