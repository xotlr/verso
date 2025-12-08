import { Plugin, Selection, Command } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { undo, redo } from 'prosemirror-history';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { screenplaySchema } from '../schema';
import { elementCommands } from './element-switching';
import {
  ShortcutId,
  DEFAULT_SHORTCUTS,
  keysToKeymapString,
} from '@/lib/shortcuts/shortcuts-config';

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
 * Go to start of document command.
 */
const goToStart: Command = (state, dispatch) => {
  if (dispatch) {
    const tr = state.tr.setSelection(Selection.atStart(state.doc));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * Go to end of document command.
 */
const goToEnd: Command = (state, dispatch) => {
  if (dispatch) {
    const tr = state.tr.setSelection(Selection.atEnd(state.doc));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * Map of shortcut IDs to their ProseMirror commands.
 * Note: Some shortcuts (like save, centerLine) are handled at the React level,
 * not in ProseMirror, so they're not included here.
 */
const SHORTCUT_COMMANDS: Partial<Record<ShortcutId, Command>> = {
  undo,
  redo,
  bold: toggleBold,
  italic: toggleItalic,
  underline: toggleUnderline,
  setSceneHeading: elementCommands.setSceneHeading,
  setAction: elementCommands.setAction,
  setCharacter: elementCommands.setCharacter,
  setDialogue: elementCommands.setDialogue,
  setParenthetical: elementCommands.setParenthetical,
  setTransition: elementCommands.setTransition,
  goToStart,
  goToEnd,
};

/**
 * Build keymap bindings from a shortcuts configuration.
 * This allows for dynamic shortcuts based on user preferences.
 *
 * @param customShortcuts - Optional custom shortcut bindings (shortcut ID to keys array)
 * @returns Record of keymap string to command
 */
export function buildKeymapBindings(
  customShortcuts?: Partial<Record<ShortcutId, string[]>>
): Record<string, Command> {
  const bindings: Record<string, Command> = {};

  // For each shortcut that has a ProseMirror command, add it to bindings
  for (const [id, command] of Object.entries(SHORTCUT_COMMANDS)) {
    const shortcutId = id as ShortcutId;

    // Get the keys - either custom or default
    const keys = customShortcuts?.[shortcutId] || DEFAULT_SHORTCUTS[shortcutId].keys;
    const keymapString = keysToKeymapString(keys);

    bindings[keymapString] = command;
  }

  // Handle redo alternate binding (Mod-y) - always add this
  // since some users expect it
  const redoKeys = customShortcuts?.redo || DEFAULT_SHORTCUTS.redo.keys;
  if (!redoKeys.includes('Y')) {
    // If the main redo isn't Mod-Y, also bind Mod-Y as an alternate
    bindings['Mod-y'] = redo;
  }

  return bindings;
}

/**
 * Create the main keymap plugin with all shortcuts.
 * Uses default shortcuts - for custom shortcuts, use createCustomKeymapPlugin.
 */
export function createKeymapPlugin(): Plugin {
  return keymap(buildKeymapBindings());
}

/**
 * Create a keymap plugin with custom shortcut bindings.
 *
 * @param customShortcuts - Custom shortcut bindings (shortcut ID to keys array)
 */
export function createCustomKeymapPlugin(
  customShortcuts: Partial<Record<ShortcutId, string[]>>
): Plugin {
  return keymap(buildKeymapBindings(customShortcuts));
}

/**
 * Create the base keymap plugin (basic text editing).
 */
export function createBaseKeymapPlugin(): Plugin {
  return keymap(baseKeymap);
}

export { toggleBold, toggleItalic, toggleUnderline, goToStart, goToEnd };
