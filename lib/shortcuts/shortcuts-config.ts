// Central shortcut configuration - single source of truth for all keyboard shortcuts

export type ShortcutCategory = 'general' | 'formatting' | 'elements' | 'navigation' | 'selection' | 'view';

export type ShortcutId =
  // General
  | 'save'
  | 'undo'
  | 'redo'
  | 'find'
  | 'findNext'
  // Text formatting
  | 'bold'
  | 'italic'
  | 'underline'
  // Element types
  | 'setSceneHeading'
  | 'setAction'
  | 'setCharacter'
  | 'setDialogue'
  | 'setParenthetical'
  | 'setTransition'
  | 'setShot'
  | 'setSuper'
  | 'setChyron'
  | 'setEnding'
  | 'setFlashback'
  | 'setMontage'
  | 'setIntercut'
  | 'setDualDialogue'
  // Element cycling
  | 'cycleElementNext'
  | 'cycleElementPrev'
  | 'newElement'
  // Navigation
  | 'goToStart'
  | 'goToEnd'
  | 'prevScene'
  | 'nextScene'
  | 'prevSpread'
  | 'nextSpread'
  // Selection
  | 'selectAll'
  | 'selectToSceneStart'
  | 'selectToSceneEnd'
  // View
  | 'centerLine'
  | 'toggleTypewriter'
  // Block manipulation (Classic Editor)
  | 'moveBlockUp'
  | 'moveBlockDown';

export interface ShortcutDefinition {
  id: ShortcutId;
  keys: string[]; // ProseMirror format: ['Mod', 'Shift', 'Z']
  description: string;
  category: ShortcutCategory;
  editable: boolean; // Some shortcuts like Tab/Enter may not be editable
}

// Helper to create shortcut definitions
function shortcut(
  id: ShortcutId,
  keys: string[],
  description: string,
  category: ShortcutCategory,
  editable: boolean = true
): ShortcutDefinition {
  return { id, keys, description, category, editable };
}

// Default shortcut definitions - these are the out-of-box settings
export const DEFAULT_SHORTCUTS: Record<ShortcutId, ShortcutDefinition> = {
  // General
  save: shortcut('save', ['Mod', 'S'], 'Save screenplay', 'general'),
  undo: shortcut('undo', ['Mod', 'Z'], 'Undo', 'general'),
  redo: shortcut('redo', ['Mod', 'Shift', 'Z'], 'Redo', 'general'),
  find: shortcut('find', ['Mod', 'F'], 'Find in document', 'general'),
  findNext: shortcut('findNext', ['Mod', 'G'], 'Find next', 'general'),

  // Text formatting
  bold: shortcut('bold', ['Mod', 'B'], 'Bold', 'formatting'),
  italic: shortcut('italic', ['Mod', 'I'], 'Italic', 'formatting'),
  underline: shortcut('underline', ['Mod', 'U'], 'Underline', 'formatting'),

  // Element types
  setSceneHeading: shortcut('setSceneHeading', ['Mod', '1'], 'Scene heading', 'elements'),
  setAction: shortcut('setAction', ['Mod', '2'], 'Action', 'elements'),
  setCharacter: shortcut('setCharacter', ['Mod', '3'], 'Character', 'elements'),
  setDialogue: shortcut('setDialogue', ['Mod', '4'], 'Dialogue', 'elements'),
  setParenthetical: shortcut('setParenthetical', ['Mod', '5'], 'Parenthetical', 'elements'),
  setTransition: shortcut('setTransition', ['Mod', '6'], 'Transition', 'elements'),
  setShot: shortcut('setShot', ['Mod', '7'], 'Shot', 'elements'),
  setSuper: shortcut('setSuper', ['Mod', '8'], 'Super (on-screen text)', 'elements'),
  setChyron: shortcut('setChyron', ['Mod', '9'], 'Chyron (lower-third)', 'elements'),
  setEnding: shortcut('setEnding', ['Mod', '0'], 'The End', 'elements'),
  setFlashback: shortcut('setFlashback', ['Mod', 'Shift', 'F'], 'Flashback', 'elements'),
  setMontage: shortcut('setMontage', ['Mod', 'Shift', 'M'], 'Montage', 'elements'),
  setIntercut: shortcut('setIntercut', ['Mod', 'Shift', 'I'], 'Intercut', 'elements'),
  setDualDialogue: shortcut('setDualDialogue', ['Mod', 'Shift', 'D'], 'Dual dialogue', 'elements'),

  // Element cycling - these are core to the editor flow and not editable
  cycleElementNext: shortcut('cycleElementNext', ['Tab'], 'Cycle through element types', 'elements', false),
  cycleElementPrev: shortcut('cycleElementPrev', ['Shift', 'Tab'], 'Cycle element types (reverse)', 'elements', false),
  newElement: shortcut('newElement', ['Enter'], 'New element (smart continuation)', 'elements', false),

  // Navigation
  goToStart: shortcut('goToStart', ['Mod', 'Home'], 'Go to beginning', 'navigation'),
  goToEnd: shortcut('goToEnd', ['Mod', 'End'], 'Go to end', 'navigation'),
  prevScene: shortcut('prevScene', ['Mod', 'ArrowUp'], 'Previous scene', 'navigation'),
  nextScene: shortcut('nextScene', ['Mod', 'ArrowDown'], 'Next scene', 'navigation'),
  prevSpread: shortcut('prevSpread', ['Alt', 'ArrowLeft'], 'Previous spread (dual view)', 'navigation'),
  nextSpread: shortcut('nextSpread', ['Alt', 'ArrowRight'], 'Next spread (dual view)', 'navigation'),

  // Selection
  selectAll: shortcut('selectAll', ['Mod', 'A'], 'Select all', 'selection'),
  selectToSceneStart: shortcut('selectToSceneStart', ['Mod', 'Shift', 'ArrowUp'], 'Select to scene start', 'selection'),
  selectToSceneEnd: shortcut('selectToSceneEnd', ['Mod', 'Shift', 'ArrowDown'], 'Select to scene end', 'selection'),

  // View
  centerLine: shortcut('centerLine', ['Shift', 'Ctrl', 'E'], 'Center current line', 'view'),
  toggleTypewriter: shortcut('toggleTypewriter', ['Mod', 'Shift', 'T'], 'Toggle typewriter scroll', 'view'),

  // Block manipulation (Classic Editor only)
  moveBlockUp: shortcut('moveBlockUp', ['Alt', 'ArrowUp'], 'Move block up', 'elements'),
  moveBlockDown: shortcut('moveBlockDown', ['Alt', 'ArrowDown'], 'Move block down', 'elements'),
};

// Category metadata for UI display
export const SHORTCUT_CATEGORIES: Record<ShortcutCategory, { title: string; order: number }> = {
  general: { title: 'General', order: 1 },
  formatting: { title: 'Formatting', order: 2 },
  elements: { title: 'Elements', order: 3 },
  navigation: { title: 'Navigation', order: 4 },
  selection: { title: 'Selection', order: 5 },
  view: { title: 'View', order: 6 },
};

// Get shortcuts grouped by category (for UI display)
export function getShortcutsByCategory(shortcuts: Record<ShortcutId, string[]>): Record<ShortcutCategory, ShortcutDefinition[]> {
  const result: Record<ShortcutCategory, ShortcutDefinition[]> = {
    general: [],
    formatting: [],
    elements: [],
    navigation: [],
    selection: [],
    view: [],
  };

  Object.values(DEFAULT_SHORTCUTS).forEach((def) => {
    // Use custom keys if available, otherwise default
    const customKeys = shortcuts[def.id];
    result[def.category].push({
      ...def,
      keys: customKeys || def.keys,
    });
  });

  return result;
}

// Convert keys array to ProseMirror keymap string: ['Mod', 'Shift', 'Z'] -> 'Mod-Shift-z'
export function keysToKeymapString(keys: string[]): string {
  return keys
    .map((key, i) => {
      // Last key should be lowercase for single characters
      if (i === keys.length - 1 && key.length === 1) {
        return key.toLowerCase();
      }
      return key;
    })
    .join('-');
}

// Parse keymap string back to keys array: 'Mod-Shift-z' -> ['Mod', 'Shift', 'Z']
export function keymapStringToKeys(str: string): string[] {
  return str.split('-').map((key, i, arr) => {
    // Last key should be uppercase for single characters
    if (i === arr.length - 1 && key.length === 1) {
      return key.toUpperCase();
    }
    return key;
  });
}

// Check if a keyboard event matches a shortcut's keys
export function eventMatchesKeys(event: KeyboardEvent, keys: string[]): boolean {
  const modifiers: Record<string, boolean> = {
    Mod: event.metaKey || event.ctrlKey,
    Ctrl: event.ctrlKey,
    Meta: event.metaKey,
    Alt: event.altKey,
    Shift: event.shiftKey,
  };

  // Get the main key (last in array, or the only non-modifier)
  const mainKey = keys.find(k => !['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'].includes(k));
  const requiredModifiers = keys.filter(k => ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'].includes(k));

  // Check main key matches
  if (mainKey) {
    const eventKey = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    const checkKey = mainKey.length === 1 ? mainKey.toUpperCase() : mainKey;

    // Handle special keys
    if (eventKey !== checkKey && event.code !== `Key${checkKey}` && event.key !== mainKey) {
      return false;
    }
  }

  // Check all required modifiers are pressed
  for (const mod of requiredModifiers) {
    if (!modifiers[mod]) {
      return false;
    }
  }

  // Check no extra modifiers are pressed (except for 'Mod' which can be either Ctrl or Meta)
  const hasExtraMod = (mod: string, required: string[]) => {
    if (required.includes(mod)) return false;
    if (mod === 'Ctrl' && required.includes('Mod')) return false;
    if (mod === 'Meta' && required.includes('Mod')) return false;
    return true;
  };

  if (event.ctrlKey && hasExtraMod('Ctrl', requiredModifiers)) return false;
  if (event.metaKey && hasExtraMod('Meta', requiredModifiers)) return false;
  if (event.altKey && !requiredModifiers.includes('Alt')) return false;
  if (event.shiftKey && !requiredModifiers.includes('Shift')) return false;

  return true;
}

// Format keys for display: ['Mod', 'Shift', 'Z'] -> "⌘⇧Z" or "Ctrl+Shift+Z"
export function formatKeysForDisplay(keys: string[], platform?: 'mac' | 'other'): string {
  const isMac = platform === 'mac' || (typeof navigator !== 'undefined' && navigator.platform?.includes('Mac'));

  const keyMap: Record<string, { mac: string; other: string }> = {
    Mod: { mac: '⌘', other: 'Ctrl' },
    Ctrl: { mac: '⌃', other: 'Ctrl' },
    Meta: { mac: '⌘', other: 'Win' },
    Alt: { mac: '⌥', other: 'Alt' },
    Shift: { mac: '⇧', other: 'Shift' },
    Enter: { mac: '↵', other: 'Enter' },
    Tab: { mac: '⇥', other: 'Tab' },
    Backspace: { mac: '⌫', other: 'Backspace' },
    Delete: { mac: '⌦', other: 'Delete' },
    Escape: { mac: '⎋', other: 'Esc' },
    ArrowUp: { mac: '↑', other: '↑' },
    ArrowDown: { mac: '↓', other: '↓' },
    ArrowLeft: { mac: '←', other: '←' },
    ArrowRight: { mac: '→', other: '→' },
    Home: { mac: '↖', other: 'Home' },
    End: { mac: '↘', other: 'End' },
    PageUp: { mac: '⇞', other: 'PgUp' },
    PageDown: { mac: '⇟', other: 'PgDn' },
    Space: { mac: '␣', other: 'Space' },
  };

  const formattedKeys = keys.map((key) => {
    if (keyMap[key]) {
      return isMac ? keyMap[key].mac : keyMap[key].other;
    }
    // Single character keys stay as-is
    return key.length === 1 ? key.toUpperCase() : key;
  });

  // On Mac, join without separator for a cleaner look
  // On other platforms, use + separator
  return isMac ? formattedKeys.join('') : formattedKeys.join('+');
}

// Format keys as array for the keyboard shortcuts dialog: ['Mod', 'S'] -> ['Cmd/Ctrl', 'S']
export function formatKeysAsArray(keys: string[]): string[] {
  return keys.map((key) => {
    if (key === 'Mod') return 'Cmd/Ctrl';
    if (key === 'ArrowUp') return 'Up';
    if (key === 'ArrowDown') return 'Down';
    if (key === 'ArrowLeft') return 'Left';
    if (key === 'ArrowRight') return 'Right';
    return key;
  });
}

// Get all shortcut IDs
export function getAllShortcutIds(): ShortcutId[] {
  return Object.keys(DEFAULT_SHORTCUTS) as ShortcutId[];
}

// Get shortcut definition by ID
export function getShortcutDefinition(id: ShortcutId): ShortcutDefinition {
  return DEFAULT_SHORTCUTS[id];
}
