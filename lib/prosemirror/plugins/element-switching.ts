import { Plugin, PluginKey, Command, TextSelection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { EditorView } from 'prosemirror-view';
import { screenplaySchema, ElementType, getNextElementType, getPreviousElementType } from '../schema';

export const elementSwitchingPluginKey = new PluginKey('elementSwitching');
export const tabArrowPluginKey = new PluginKey('tabArrow');

// Track Tab key state for Tab+Arrow navigation
interface TabArrowState {
  tabHeld: boolean;
  arrowPressedWhileTabHeld: boolean;
}

/**
 * Get the element type of the current selection's parent block.
 */
function getCurrentElementType(state: { selection: { $head: { parent: { type: { name: string } } } } }): ElementType {
  const { $head } = state.selection;
  return $head.parent.type.name as ElementType;
}

/**
 * Check if the current block is empty.
 */
function isCurrentBlockEmpty(state: { selection: { $head: { parent: { textContent: string } } } }): boolean {
  const { $head } = state.selection;
  return !$head.parent.textContent.trim();
}

/**
 * Change the current block to a different element type.
 * Applies a flash animation for visual feedback.
 */
function setElementType(type: ElementType): Command {
  return (state, dispatch, view) => {
    const nodeType = screenplaySchema.nodes[type];
    if (!nodeType) return false;

    const { $from, $to } = state.selection;

    // Check if we can change the block type
    if (!$from.parent.isTextblock) return false;

    if (dispatch) {
      const tr = state.tr.setBlockType($from.pos, $to.pos, nodeType);
      dispatch(tr);

      // Apply flash animation for visual feedback
      if (view) {
        requestAnimationFrame(() => {
          const dom = view.domAtPos($from.start()).node as HTMLElement;
          if (dom && dom.classList) {
            dom.classList.add('pm-element-changed');
            setTimeout(() => {
              dom.classList.remove('pm-element-changed');
            }, 400);
          }
        });
      }
    }

    return true;
  };
}

/**
 * Tab command: Cycle to next element type.
 *
 * Element cycle order:
 * Scene Heading → Action → Shot → Character → Dialogue → Parenthetical → Transition
 *
 * With selection: Extract selected text into a new block with next element type.
 * Without selection: Change current block's type.
 */
const handleTab: Command = (state, dispatch, view) => {
  const { from, to, $head } = state.selection;
  const currentType = getCurrentElementType(state);
  const nextType = getNextElementType(currentType);

  // Get selected text (empty string if no selection)
  const selectedText = !state.selection.empty ? state.doc.textBetween(from, to) : '';

  // No selection or empty selection - just change block type (existing behavior)
  if (state.selection.empty || !selectedText) {
    return setElementType(nextType)(state, dispatch, view);
  }

  // Has selection with text - extract to new block with next type
  if (!dispatch) return true;

  const nodeType = screenplaySchema.nodes[nextType];
  const textAfterSelection = $head.parent.textContent.slice($head.parentOffset);

  let tr = state.tr;
  const selStart = Math.min(from, to);
  const endPos = $head.end();

  // Delete from selection start to end of block
  tr = tr.delete(selStart, endPos);

  // Insert new block with selected text
  const insertPos = tr.mapping.map(selStart);
  const newNode = nodeType.create(null, screenplaySchema.text(selectedText));
  tr = tr.insert(insertPos, newNode);

  // If there was text after selection, add it as another block (same type as original)
  if (textAfterSelection) {
    const afterInsertPos = insertPos + selectedText.length + 2;
    const originalType = screenplaySchema.nodes[currentType];
    tr = tr.insert(afterInsertPos, originalType.create(null, screenplaySchema.text(textAfterSelection)));
  }

  // Position cursor in the new block
  const newPos = tr.doc.resolve(insertPos + 1);
  tr.setSelection(TextSelection.near(newPos)).scrollIntoView();

  // Apply flash animation for visual feedback
  if (view) {
    requestAnimationFrame(() => {
      const dom = view.domAtPos(insertPos + 1).node as HTMLElement;
      if (dom && dom.classList) {
        dom.classList.add('pm-element-changed');
        setTimeout(() => {
          dom.classList.remove('pm-element-changed');
        }, 400);
      }
    });
  }

  dispatch(tr);
  return true;
};

/**
 * Shift+Tab command: Cycle to previous element type.
 */
const handleShiftTab: Command = (state, dispatch, view) => {
  const currentType = getCurrentElementType(state);
  const prevType = getPreviousElementType(currentType);

  return setElementType(prevType)(state, dispatch, view);
};

/**
 * Determine the next element type based on screenplay conventions.
 */
function getNextElementTypeForContext(currentType: ElementType): ElementType {
  switch (currentType) {
    case 'character':
      // After character name, create dialogue
      return 'dialogue';

    case 'dialogue':
      // After dialogue, create new character (for next speaker)
      return 'character';

    case 'parenthetical':
      // After parenthetical, continue with dialogue
      return 'dialogue';

    case 'scene_heading':
      // After scene heading, create action
      return 'action';

    case 'action':
      // After action, create more action
      return 'action';

    case 'transition':
      // After transition, create scene heading (new scene)
      return 'scene_heading';

    default:
      return 'action';
  }
}

/**
 * Enter command: Smart element creation based on context.
 *
 * Behavior:
 * - If cursor is mid-text: split the block, carry text after cursor to new line
 * - After Character → Create Dialogue
 * - After Dialogue → Create Character (ready for next speaker)
 * - After Parenthetical → Create Dialogue
 * - After empty element → Convert to Action
 * - Otherwise → Create same element type
 */
const handleEnter: Command = (state, dispatch) => {
  const { $head, from, to } = state.selection;
  const currentType = getCurrentElementType(state);
  const isEmpty = isCurrentBlockEmpty(state);

  // If current block is empty, convert to action
  if (isEmpty && currentType !== 'action') {
    return setElementType('action')(state, dispatch);
  }

  // Determine what element type to create next
  const nextType = getNextElementTypeForContext(currentType);

  if (!dispatch) return true;

  const parentOffset = $head.parentOffset;
  const parentText = $head.parent.textContent;
  const startPos = $head.start();
  const endPos = $head.end();

  // Check if there's a selection (text is selected)
  const hasSelection = from !== to;

  // Check if cursor is at the end of the block
  const isAtEnd = parentOffset >= parentText.length;

  // If cursor at end and no selection, simple case: just create new block
  if (isAtEnd && !hasSelection) {
    const nodeType = screenplaySchema.nodes[nextType];
    const tr = state.tr.insert(endPos, nodeType.create());
    const newPos = tr.doc.resolve(endPos + 2);
    tr.setSelection(TextSelection.near(newPos)).scrollIntoView();
    dispatch(tr);
    return true;
  }

  // Split case: cursor is mid-text or there's a selection
  // Delete selected text (if any) or split at cursor position
  const nodeType = screenplaySchema.nodes[nextType];

  if (hasSelection) {
    // Delete selection, then split
    const textAfterSelection = parentText.slice($head.parentOffset);
    let tr = state.tr;

    // Delete from selection start to end of block
    const selStart = Math.min(from, to);
    tr = tr.delete(selStart, endPos);

    // Insert new block with text after selection
    const insertPos = tr.mapping.map(selStart);
    const newNode = textAfterSelection
      ? nodeType.create(null, screenplaySchema.text(textAfterSelection))
      : nodeType.create();
    tr = tr.insert(insertPos, newNode);

    // Position cursor at start of new block
    const newPos = tr.doc.resolve(insertPos + 1);
    tr.setSelection(TextSelection.near(newPos)).scrollIntoView();

    dispatch(tr);
  } else {
    // No selection, split at cursor position
    const textAfterCursor = parentText.slice(parentOffset);
    let tr = state.tr;

    // Delete text after cursor from current block
    const cursorPos = startPos + parentOffset;
    tr = tr.delete(cursorPos, endPos);

    // Insert new block with text after cursor
    const insertPos = tr.mapping.map(cursorPos);
    const newNode = textAfterCursor
      ? nodeType.create(null, screenplaySchema.text(textAfterCursor))
      : nodeType.create();
    tr = tr.insert(insertPos, newNode);

    // Position cursor at start of new block
    const newPos = tr.doc.resolve(insertPos + 1);
    tr.setSelection(TextSelection.near(newPos)).scrollIntoView();

    dispatch(tr);
  }

  return true;
};

/**
 * Shift+Enter command: Always create a new action line.
 * Unlike Enter, this ignores context and always creates an action block.
 * Supports mid-line cursor and selection - carries text after to new action.
 */
const handleShiftEnter: Command = (state, dispatch) => {
  const { $head, from, to } = state.selection;

  if (!dispatch) return true;

  const parentOffset = $head.parentOffset;
  const parentText = $head.parent.textContent;
  const startPos = $head.start();
  const endPos = $head.end();
  const nodeType = screenplaySchema.nodes['action'];

  // Check if there's a selection
  const hasSelection = from !== to;

  // Check if cursor at end
  const isAtEnd = parentOffset >= parentText.length;

  // If cursor at end and no selection, simple case - create empty action
  if (isAtEnd && !hasSelection) {
    const tr = state.tr.insert(endPos, nodeType.create());
    const newPos = tr.doc.resolve(endPos + 2);
    tr.setSelection(TextSelection.near(newPos)).scrollIntoView();
    dispatch(tr);
    return true;
  }

  // Split case: mid-text or selection
  if (hasSelection) {
    // Delete selection, carry text after to new action block
    const textAfterSelection = parentText.slice($head.parentOffset);
    let tr = state.tr;
    const selStart = Math.min(from, to);
    tr = tr.delete(selStart, endPos);

    const insertPos = tr.mapping.map(selStart);
    const newNode = textAfterSelection
      ? nodeType.create(null, screenplaySchema.text(textAfterSelection))
      : nodeType.create();
    tr = tr.insert(insertPos, newNode);

    const newPos = tr.doc.resolve(insertPos + 1);
    tr.setSelection(TextSelection.near(newPos)).scrollIntoView();
    dispatch(tr);
  } else {
    // Split at cursor position
    const textAfterCursor = parentText.slice(parentOffset);
    let tr = state.tr;
    const cursorPos = startPos + parentOffset;
    tr = tr.delete(cursorPos, endPos);

    const insertPos = tr.mapping.map(cursorPos);
    const newNode = textAfterCursor
      ? nodeType.create(null, screenplaySchema.text(textAfterCursor))
      : nodeType.create();
    tr = tr.insert(insertPos, newNode);

    const newPos = tr.doc.resolve(insertPos + 1);
    tr.setSelection(TextSelection.near(newPos)).scrollIntoView();
    dispatch(tr);
  }

  return true;
};

/**
 * Create the element switching keymap plugin.
 */
export function createElementSwitchingPlugin(): Plugin {
  return keymap({
    Tab: handleTab,
    'Shift-Tab': handleShiftTab,
    Enter: handleEnter,
    'Shift-Enter': handleShiftEnter,
  });
}

/**
 * Create the Tab+Arrow navigation plugin.
 * Hold Tab and press Left/Right arrows to cycle through element types.
 * - Tab + ArrowLeft: Go to previous element type
 * - Tab + ArrowRight: Go to next element type
 */
export function createTabArrowPlugin(): Plugin {
  return new Plugin({
    key: tabArrowPluginKey,

    state: {
      init(): TabArrowState {
        return { tabHeld: false, arrowPressedWhileTabHeld: false };
      },
      apply(tr, value): TabArrowState {
        // State is managed via DOM events, not transactions
        return value;
      },
    },

    props: {
      handleDOMEvents: {
        keydown(view: EditorView, event: KeyboardEvent) {
          const pluginState = tabArrowPluginKey.getState(view.state) as TabArrowState;

          // Track Tab key being held down
          if (event.key === 'Tab' && !event.repeat) {
            pluginState.tabHeld = true;
            pluginState.arrowPressedWhileTabHeld = false;
            // Don't prevent default yet - let it bubble to see if arrows are pressed
            return false;
          }

          // Handle arrows while Tab is held
          if (pluginState.tabHeld && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
            event.preventDefault();
            event.stopPropagation();
            pluginState.arrowPressedWhileTabHeld = true;

            const currentType = getCurrentElementType(view.state);
            const newType = event.key === 'ArrowLeft'
              ? getPreviousElementType(currentType)
              : getNextElementType(currentType);

            setElementType(newType)(view.state, view.dispatch, view);
            return true;
          }

          return false;
        },

        keyup(view: EditorView, event: KeyboardEvent) {
          const pluginState = tabArrowPluginKey.getState(view.state) as TabArrowState;

          if (event.key === 'Tab') {
            const wasArrowPressed = pluginState.arrowPressedWhileTabHeld;
            pluginState.tabHeld = false;
            pluginState.arrowPressedWhileTabHeld = false;

            // If arrows were pressed while Tab was held, prevent the normal Tab behavior
            // by returning true (we already handled the element switching via arrows)
            if (wasArrowPressed) {
              event.preventDefault();
              return true;
            }
          }

          return false;
        },

        blur(_view: EditorView, _event: FocusEvent) {
          // Reset Tab state when editor loses focus
          const pluginState = tabArrowPluginKey.getState(_view.state) as TabArrowState;
          if (pluginState) {
            pluginState.tabHeld = false;
            pluginState.arrowPressedWhileTabHeld = false;
          }
          return false;
        },
      },
    },
  });
}

/**
 * Create direct element type commands for toolbar/shortcuts.
 */
export const elementCommands = {
  setSceneHeading: setElementType('scene_heading'),
  setAction: setElementType('action'),
  setCharacter: setElementType('character'),
  setDialogue: setElementType('dialogue'),
  setParenthetical: setElementType('parenthetical'),
  setTransition: setElementType('transition'),
  setShot: setElementType('shot'),
  setSuper: setElementType('super'),
  setChyron: setElementType('chyron'),
  setEnding: setElementType('ending'),
  setFlashback: setElementType('flashback'),
  setMontage: setElementType('montage'),
  setIntercut: setElementType('intercut'),
};

export { handleTab, handleShiftTab, handleEnter, handleShiftEnter, setElementType };
