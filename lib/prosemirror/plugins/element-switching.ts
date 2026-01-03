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
 * Title page child node types - these should not be affected by element switching
 */
const TITLE_PAGE_CHILD_TYPES = new Set([
  'title_page',
  'title_page_title',
  'title_page_author',
  'title_page_logline',
  'title_page_contact',
  'title_page_copyright',
  'title_page_draft',
]);

/**
 * Check if the current selection is within a title page element.
 */
function isInTitlePage(state: { selection: { $head: { parent: { type: { name: string } } } } }): boolean {
  const { $head } = state.selection;
  return TITLE_PAGE_CHILD_TYPES.has($head.parent.type.name);
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
 *
 * Note: Does not apply in title page fields - those cannot be converted to screenplay elements.
 */
function setElementType(type: ElementType): Command {
  return (state, dispatch, view) => {
    // Skip element switching in title page fields
    if (isInTitlePage(state)) {
      return false;
    }

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
 *
 * Note: Does not apply in title page fields - those use default Tab behavior.
 */
const handleTab: Command = (state, dispatch, view) => {
  // Skip element switching in title page fields
  if (isInTitlePage(state)) {
    return false;
  }

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
 * Merge current block with adjacent blocks of the same type.
 * This is used after changing element type to restore document structure
 * when the user extracts text and then changes it back.
 */
function mergeAdjacentBlocks(view: EditorView): void {
  const { state } = view;
  const { $head } = state.selection;
  const currentPos = $head.before();
  const currentNode = $head.parent;
  const currentType = currentNode.type.name;

  let tr = state.tr;
  let merged = false;

  // Get parent (doc) and current block index
  const parent = $head.node(-1);
  const indexInParent = $head.index(-1);

  // Try to merge with NEXT block first (so positions don't shift for previous merge)
  if (indexInParent < parent.childCount - 1) {
    const nextNode = parent.child(indexInParent + 1);
    if (nextNode.type.name === currentType && nextNode.isTextblock) {
      // Merge next block into current
      const nextPos = currentPos + currentNode.nodeSize;
      const nextContent = nextNode.textContent;

      if (nextContent) {
        // Delete the next block
        tr = tr.delete(nextPos, nextPos + nextNode.nodeSize);
        // Append its content to current block (with a space if both have content)
        const insertPos = currentPos + currentNode.nodeSize - 1;
        const separator = currentNode.textContent && nextContent ? ' ' : '';
        tr = tr.insertText(separator + nextContent, insertPos);
        merged = true;
      } else {
        // Next block is empty, just delete it
        tr = tr.delete(nextPos, nextPos + nextNode.nodeSize);
        merged = true;
      }
    }
  }

  // Try to merge with PREVIOUS block
  if (indexInParent > 0) {
    const prevNode = parent.child(indexInParent - 1);
    if (prevNode.type.name === currentType && prevNode.isTextblock) {
      // We need to recalculate positions since we may have modified the doc
      const resolvedPos = tr.doc.resolve(tr.mapping.map(currentPos));
      const newIndexInParent = resolvedPos.index(-1);

      if (newIndexInParent > 0) {
        const newParent = resolvedPos.node(-1);
        const newPrevNode = newParent.child(newIndexInParent - 1);
        const currentMappedPos = resolvedPos.before();
        const currentMappedNode = resolvedPos.parent;

        if (newPrevNode.type.name === currentType) {
          const prevPos = currentMappedPos - newPrevNode.nodeSize;
          const currentContent = currentMappedNode.textContent;
          const prevContent = newPrevNode.textContent;

          if (currentContent) {
            // Append current content to previous block
            const insertPos = prevPos + newPrevNode.nodeSize - 1;
            const separator = prevContent && currentContent ? ' ' : '';
            tr = tr.insertText(separator + currentContent, insertPos);
            // Delete current block
            const deleteStart = tr.mapping.map(currentMappedPos);
            const mappedCurrentNode = tr.doc.nodeAt(deleteStart);
            if (mappedCurrentNode) {
              tr = tr.delete(deleteStart, deleteStart + mappedCurrentNode.nodeSize);
            }
            merged = true;
          } else {
            // Current block is empty, just delete it
            tr = tr.delete(currentMappedPos, currentMappedPos + currentMappedNode.nodeSize);
            merged = true;
          }

          // Position cursor at end of merged content in previous block
          if (merged) {
            const newCursorPos = prevPos + newPrevNode.nodeSize - 1 + (prevContent && currentContent ? 1 : 0) + currentContent.length;
            const mappedCursorPos = tr.mapping.map(newCursorPos);
            try {
              const $pos = tr.doc.resolve(mappedCursorPos);
              tr.setSelection(TextSelection.near($pos));
            } catch {
              // If position is invalid, just let ProseMirror handle cursor placement
            }
          }
        }
      }
    }
  }

  if (merged) {
    tr.scrollIntoView();
    view.dispatch(tr);
  }
}

/**
 * Shift+Tab command: Cycle to previous element type.
 * After changing type, merges with adjacent blocks of the same type
 * to restore document structure when undoing Tab extractions.
 *
 * Note: Does not apply in title page fields - those use default Shift+Tab behavior.
 */
const handleShiftTab: Command = (state, dispatch, view) => {
  // Skip element switching in title page fields
  if (isInTitlePage(state)) {
    return false;
  }

  const currentType = getCurrentElementType(state);
  const prevType = getPreviousElementType(currentType);

  const result = setElementType(prevType)(state, dispatch, view);

  // After changing type, merge with adjacent same-type blocks
  if (result && view) {
    // Use requestAnimationFrame to ensure the type change is applied first
    requestAnimationFrame(() => {
      mergeAdjacentBlocks(view);
    });
  }

  return result;
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
 *
 * Note: Does not apply in title page fields - those use default Enter behavior (line break).
 */
const handleEnter: Command = (state, dispatch) => {
  // Skip element switching in title page fields - let default behavior handle line breaks
  if (isInTitlePage(state)) {
    return false;
  }

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
 *
 * Note: Does not apply in title page fields - those use default Shift+Enter behavior.
 */
const handleShiftEnter: Command = (state, dispatch) => {
  // Skip element switching in title page fields
  if (isInTitlePage(state)) {
    return false;
  }

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
