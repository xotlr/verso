import { Plugin, PluginKey, Command, TextSelection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { screenplaySchema, ElementType, getNextElementType, getPreviousElementType } from '../schema';

export const elementSwitchingPluginKey = new PluginKey('elementSwitching');

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
 */
function setElementType(type: ElementType): Command {
  return (state, dispatch) => {
    const nodeType = screenplaySchema.nodes[type];
    if (!nodeType) return false;

    const { $from, $to } = state.selection;

    // Check if we can change the block type
    if (!$from.parent.isTextblock) return false;

    if (dispatch) {
      const tr = state.tr.setBlockType($from.pos, $to.pos, nodeType);
      dispatch(tr.scrollIntoView());
    }

    return true;
  };
}

/**
 * Tab command: Cycle to next element type.
 *
 * Element cycle order:
 * Scene Heading → Action → Character → Dialogue → Parenthetical → Transition
 */
const handleTab: Command = (state, dispatch) => {
  const currentType = getCurrentElementType(state);
  const nextType = getNextElementType(currentType);

  return setElementType(nextType)(state, dispatch);
};

/**
 * Shift+Tab command: Cycle to previous element type.
 */
const handleShiftTab: Command = (state, dispatch) => {
  const currentType = getCurrentElementType(state);
  const prevType = getPreviousElementType(currentType);

  return setElementType(prevType)(state, dispatch);
};

/**
 * Enter command: Smart element creation based on context.
 *
 * Behavior:
 * - After Character → Create Dialogue
 * - After Dialogue → Create Character (ready for next speaker)
 * - After Parenthetical → Create Dialogue
 * - After empty element → Convert to Action
 * - Otherwise → Create same element type
 */
const handleEnter: Command = (state, dispatch) => {
  const { $head } = state.selection;
  const currentType = getCurrentElementType(state);
  const isEmpty = isCurrentBlockEmpty(state);

  // If current block is empty, convert to action
  if (isEmpty && currentType !== 'action') {
    return setElementType('action')(state, dispatch);
  }

  // Determine what element type to create next
  let nextType: ElementType = 'action';

  switch (currentType) {
    case 'character':
      // After character name, create dialogue
      nextType = 'dialogue';
      break;

    case 'dialogue':
      // After dialogue, create new character (for next speaker)
      nextType = 'character';
      break;

    case 'parenthetical':
      // After parenthetical, continue with dialogue
      nextType = 'dialogue';
      break;

    case 'scene_heading':
      // After scene heading, create action
      nextType = 'action';
      break;

    case 'action':
      // After action, create more action
      nextType = 'action';
      break;

    case 'transition':
      // After transition, create scene heading (new scene)
      nextType = 'scene_heading';
      break;

    default:
      nextType = 'action';
  }

  if (!dispatch) return true;

  // Create new paragraph at end of current block
  const endPos = $head.end();
  const nodeType = screenplaySchema.nodes[nextType];

  const tr = state.tr.insert(endPos, nodeType.create());
  const newPos = tr.doc.resolve(endPos + 2);
  tr.setSelection(TextSelection.near(newPos)).scrollIntoView();

  dispatch(tr);
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
};

export { handleTab, handleShiftTab, handleEnter, setElementType };
