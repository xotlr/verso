import { Command, EditorState, TextSelection } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { screenplaySchema } from '../schema';

// ============================================================================
// Constants
// ============================================================================

/** CSS class for dual dialogue container */
export const DUAL_DIALOGUE_CLASS = 'pm-dual-dialogue';

/** CSS class for element change animation */
export const ELEMENT_CHANGED_CLASS = 'pm-element-changed';

/** Duration of change animation in ms */
export const CHANGE_ANIMATION_DURATION = 400;

/** Node types that can be part of a dialogue block */
const DIALOGUE_BLOCK_TYPES = ['character', 'dialogue', 'parenthetical'] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a dialogue block (CHARACTER + optional PARENTHETICAL + DIALOGUE)
 */
interface DialogueBlockInfo {
  // Position of the first node (CHARACTER) in the block
  startPos: number;
  // Position after the last node in the block
  endPos: number;
  // The nodes that make up this dialogue block
  nodes: ProseMirrorNode[];
  // The character name (text content of CHARACTER node)
  characterName: string;
}

/**
 * Find the dialogue block containing or before the given position.
 * A dialogue block is: CHARACTER (+ optional PARENTHETICAL) + DIALOGUE
 *
 * Returns null if no valid dialogue block is found before the position.
 */
function findDialogueBlockBefore(
  doc: ProseMirrorNode,
  currentPos: number
): DialogueBlockInfo | null {
  let result: DialogueBlockInfo | null = null;
  let currentBlock: {
    startPos: number;
    characterNode: ProseMirrorNode | null;
    nodes: ProseMirrorNode[];
  } | null = null;

  doc.descendants((node, pos) => {
    // Only process top-level block nodes
    if (!node.isBlock || node.type.name === 'doc') return true;

    // Skip nodes at or after current position
    const nodeEnd = pos + node.nodeSize;
    if (pos >= currentPos) return false;

    const typeName = node.type.name;

    if (typeName === 'character') {
      // Start a new potential dialogue block
      currentBlock = {
        startPos: pos,
        characterNode: node,
        nodes: [node],
      };
    } else if (currentBlock && (typeName === 'dialogue' || typeName === 'parenthetical')) {
      // Add to current block
      currentBlock.nodes.push(node);

      // If we found dialogue, we have a complete block
      if (typeName === 'dialogue') {
        result = {
          startPos: currentBlock.startPos,
          endPos: nodeEnd,
          nodes: currentBlock.nodes,
          characterName: currentBlock.characterNode?.textContent || '',
        };
        currentBlock = null;
      }
    } else {
      // Non-dialogue element breaks the sequence
      currentBlock = null;
    }

    return true;
  });

  return result;
}

/**
 * Find the dialogue block at or containing the current cursor position.
 */
function findCurrentDialogueBlock(state: EditorState): DialogueBlockInfo | null {
  const { $head } = state.selection;
  const currentNode = $head.parent;
  const currentType = currentNode.type.name;

  // Must be in character, dialogue, or parenthetical
  if (!(DIALOGUE_BLOCK_TYPES as readonly string[]).includes(currentType)) {
    return null;
  }

  // Find the start of this dialogue block (walk backward to find CHARACTER)
  const doc = state.doc;
  const currentBlockStart = $head.before($head.depth);

  // State for tracking the current dialogue sequence
  interface SequenceState {
    characterPos: number;
    characterNode: ProseMirrorNode;
    nodes: ProseMirrorNode[];
  }

  let currentSequence: SequenceState | null = null;
  let result: SequenceState | null = null;

  doc.descendants((node, nodePos) => {
    if (!node.isBlock || node.type.name === 'doc') return true;

    const typeName = node.type.name;
    const nodeEnd = nodePos + node.nodeSize;

    if (typeName === 'character') {
      // Start new sequence
      currentSequence = {
        characterPos: nodePos,
        characterNode: node,
        nodes: [node],
      };
    } else if (currentSequence && (typeName === 'dialogue' || typeName === 'parenthetical')) {
      currentSequence.nodes.push(node);
    } else {
      currentSequence = null;
    }

    // Check if this is the current block
    if (nodePos <= currentBlockStart && nodeEnd > currentBlockStart) {
      result = currentSequence;
      return false; // Stop searching
    }

    return true;
  });

  if (result === null) {
    return null;
  }

  // TypeScript can't track mutations inside callbacks, so we use type assertion
  // We know result is non-null here because we just checked above
  const foundResult = result as SequenceState;
  const startPos = foundResult.characterPos;
  const nodes = foundResult.nodes;
  const characterNode = foundResult.characterNode;

  // Calculate end position
  let endPos = startPos;
  for (let i = 0; i < nodes.length; i++) {
    endPos += nodes[i].nodeSize;
  }

  const blockInfo: DialogueBlockInfo = {
    startPos,
    endPos,
    nodes,
    characterName: characterNode.textContent || '',
  };

  return blockInfo;
}

/**
 * Check if we can create dual dialogue from the current position.
 * Returns true if:
 * - Cursor is in a CHARACTER/DIALOGUE/PARENTHETICAL block
 * - AND there's a complete dialogue block (CHARACTER + DIALOGUE) before it
 */
export function canMakeDualDialogue(state: EditorState): boolean {
  const { $head } = state.selection;
  const currentType = $head.parent.type.name;

  // Must be in character, dialogue, or parenthetical
  if (!(DIALOGUE_BLOCK_TYPES as readonly string[]).includes(currentType)) {
    return false;
  }

  // Check if we're already in a dual dialogue
  for (let d = $head.depth; d > 0; d--) {
    if ($head.node(d).type.name === 'dual_dialogue') {
      return false; // Already in dual dialogue, can't nest
    }
  }

  // Find current dialogue block
  const currentBlock = findCurrentDialogueBlock(state);
  if (!currentBlock) {
    return false;
  }

  // Find previous dialogue block
  const previousBlock = findDialogueBlockBefore(state.doc, currentBlock.startPos);

  return previousBlock !== null;
}

/**
 * Get the name of the previous character (for UI display).
 */
export function getPreviousCharacterName(state: EditorState): string | null {
  const currentBlock = findCurrentDialogueBlock(state);
  if (!currentBlock) return null;

  const previousBlock = findDialogueBlockBefore(state.doc, currentBlock.startPos);
  return previousBlock?.characterName || null;
}

/**
 * Check if we're currently inside a dual_dialogue node.
 */
export function isInDualDialogue(state: EditorState): boolean {
  const { $head } = state.selection;
  for (let d = $head.depth; d > 0; d--) {
    if ($head.node(d).type.name === 'dual_dialogue') {
      return true;
    }
  }
  return false;
}

/**
 * Wrap two adjacent dialogue blocks into dual dialogue.
 * This is the main command for creating dual dialogue.
 */
export const wrapInDualDialogue: Command = (state, dispatch, view) => {
  // If already in dual dialogue, unwrap instead (toggle behavior)
  if (isInDualDialogue(state)) {
    return unwrapDualDialogue(state, dispatch, view);
  }

  if (!canMakeDualDialogue(state)) {
    return false;
  }

  const currentBlock = findCurrentDialogueBlock(state);
  if (!currentBlock) return false;

  const previousBlock = findDialogueBlockBefore(state.doc, currentBlock.startPos);
  if (!previousBlock) return false;

  if (!dispatch) return true;

  // Build the dual_dialogue structure
  const schema = screenplaySchema;
  const dualDialogueType = schema.nodes.dual_dialogue;
  const columnType = schema.nodes.dual_dialogue_column;

  // Create left column content (previous block's nodes)
  const leftColumnContent = previousBlock.nodes.map((node) => {
    // Mark character as isDual
    if (node.type.name === 'character') {
      return node.type.create({ ...node.attrs, isDual: true }, node.content, node.marks);
    }
    return node.copy(node.content);
  });

  // Create right column content (current block's nodes)
  // If current block only has CHARACTER, add empty dialogue
  let rightColumnContent = currentBlock.nodes.map((node) => {
    if (node.type.name === 'character') {
      return node.type.create({ ...node.attrs, isDual: true }, node.content, node.marks);
    }
    return node.copy(node.content);
  });

  // Ensure we have dialogue in the right column (add empty if missing)
  const hasDialogue = rightColumnContent.some((n) => n.type.name === 'dialogue');
  if (!hasDialogue) {
    rightColumnContent.push(schema.nodes.dialogue.create());
  }

  // Create the columns
  const leftColumn = columnType.create(null, leftColumnContent);
  const rightColumn = columnType.create(null, rightColumnContent);

  // Create the dual dialogue container
  const dualDialogue = dualDialogueType.create(null, [leftColumn, rightColumn]);

  // Replace the range from previous block start to current block end
  let tr = state.tr;
  tr = tr.replaceWith(previousBlock.startPos, currentBlock.endPos, dualDialogue);

  // Position cursor in the right column's dialogue
  // The structure is: dual_dialogue > dual_dialogue_column > character/dialogue
  // We want to be at the end of the dialogue in the right column
  const dualDialoguePos = previousBlock.startPos;
  const rightColumnOffset = leftColumn.nodeSize + 1; // +1 for dual_dialogue opening
  const rightColumnPos = dualDialoguePos + rightColumnOffset;

  // Find the dialogue node in right column and position at its end
  const rightColNode = tr.doc.nodeAt(rightColumnPos);
  if (rightColNode && rightColNode.type.name === 'dual_dialogue_column') {
    let dialoguePos = rightColumnPos + 1; // Enter the column
    rightColNode.forEach((child, offset) => {
      if (child.type.name === 'dialogue') {
        dialoguePos = rightColumnPos + 1 + offset;
      }
    });
    // Position at end of dialogue content
    const dialogueNode = tr.doc.nodeAt(dialoguePos);
    if (dialogueNode) {
      const endOfDialogue = dialoguePos + dialogueNode.nodeSize - 1;
      try {
        const $pos = tr.doc.resolve(endOfDialogue);
        tr = tr.setSelection(TextSelection.near($pos, -1));
      } catch {
        // If position is invalid, just scroll to view
      }
    }
  }

  tr.scrollIntoView();
  dispatch(tr);

  // Apply visual feedback
  if (view) {
    requestAnimationFrame(() => {
      const dom = view.domAtPos(previousBlock.startPos + 1).node as HTMLElement;
      if (dom) {
        const dualDialogueDom = dom.closest(`.${DUAL_DIALOGUE_CLASS}`) as HTMLElement;
        if (dualDialogueDom) {
          dualDialogueDom.classList.add(ELEMENT_CHANGED_CLASS);
          setTimeout(() => {
            dualDialogueDom.classList.remove(ELEMENT_CHANGED_CLASS);
          }, CHANGE_ANIMATION_DURATION);
        }
      }
    });
  }

  return true;
};

/**
 * Unwrap dual dialogue back to sequential blocks.
 */
export const unwrapDualDialogue: Command = (state, dispatch, _view) => {
  const { $head } = state.selection;

  // Find the dual_dialogue node
  let dualDialogueDepth: number | null = null;
  for (let d = $head.depth; d > 0; d--) {
    if ($head.node(d).type.name === 'dual_dialogue') {
      dualDialogueDepth = d;
      break;
    }
  }

  if (dualDialogueDepth === null) {
    return false;
  }

  const dualDialogueNode = $head.node(dualDialogueDepth);
  const dualDialoguePos = $head.before(dualDialogueDepth);

  if (!dispatch) return true;

  // Extract content from both columns
  const extractedNodes: ProseMirrorNode[] = [];

  dualDialogueNode.forEach((column) => {
    if (column.type.name === 'dual_dialogue_column') {
      column.forEach((node) => {
        // Remove isDual attribute from character nodes
        if (node.type.name === 'character') {
          extractedNodes.push(
            node.type.create({ ...node.attrs, isDual: false }, node.content, node.marks)
          );
        } else {
          extractedNodes.push(node.copy(node.content));
        }
      });
    }
  });

  // Replace dual dialogue with extracted nodes
  let tr = state.tr;
  const endPos = dualDialoguePos + dualDialogueNode.nodeSize;
  tr = tr.replaceWith(dualDialoguePos, endPos, extractedNodes);

  // Position cursor at start of extracted content
  try {
    const $pos = tr.doc.resolve(dualDialoguePos + 1);
    tr = tr.setSelection(TextSelection.near($pos));
  } catch {
    // Ignore position errors
  }

  tr.scrollIntoView();
  dispatch(tr);

  return true;
};

/**
 * Create dual dialogue with a specific character name on the right.
 * Used by autocomplete when user selects "CHARACTER ^" option.
 *
 * This operation is atomic - both the character name update and the wrap
 * are combined into a single undo step.
 */
export function createDualDialogueWithCharacter(
  state: EditorState,
  dispatch: ((tr: import('prosemirror-state').Transaction) => void) | undefined,
  characterName: string
): boolean {
  // First, set the character name in the current block
  const { $head } = state.selection;

  if ($head.parent.type.name !== 'character') {
    return false;
  }

  if (!canMakeDualDialogue(state)) {
    return false;
  }

  if (!dispatch) return true;

  // We need to do this as a single transaction for proper undo behavior
  // First, update character name
  let tr = state.tr;
  const startPos = $head.start();
  const endPos = $head.end();

  // Replace character content with new name
  tr = tr.replaceWith(startPos, endPos, screenplaySchema.text(characterName));

  // Apply to get intermediate state
  const intermediateState = state.apply(tr);

  // Now find blocks in the intermediate state and build the dual dialogue
  const currentBlock = findCurrentDialogueBlock(intermediateState);
  if (!currentBlock) return false;

  const previousBlock = findDialogueBlockBefore(intermediateState.doc, currentBlock.startPos);
  if (!previousBlock) return false;

  // Build the dual_dialogue structure directly in the original transaction
  const schema = screenplaySchema;
  const dualDialogueType = schema.nodes.dual_dialogue;
  const columnType = schema.nodes.dual_dialogue_column;

  // Create left column content (previous block's nodes)
  const leftColumnContent = previousBlock.nodes.map((node) => {
    if (node.type.name === 'character') {
      return node.type.create({ ...node.attrs, isDual: true }, node.content, node.marks);
    }
    return node.copy(node.content);
  });

  // Create right column content (current block's nodes)
  let rightColumnContent = currentBlock.nodes.map((node) => {
    if (node.type.name === 'character') {
      return node.type.create({ ...node.attrs, isDual: true }, node.content, node.marks);
    }
    return node.copy(node.content);
  });

  // Ensure we have dialogue in the right column
  const hasDialogue = rightColumnContent.some((n) => n.type.name === 'dialogue');
  if (!hasDialogue) {
    rightColumnContent.push(schema.nodes.dialogue.create());
  }

  // Create the columns and dual dialogue
  const leftColumn = columnType.create(null, leftColumnContent);
  const rightColumn = columnType.create(null, rightColumnContent);
  const dualDialogue = dualDialogueType.create(null, [leftColumn, rightColumn]);

  // Replace the range - this builds on the previous tr changes
  tr = tr.replaceWith(previousBlock.startPos, currentBlock.endPos, dualDialogue);

  // Position cursor in the right column's dialogue
  const dualDialoguePos = previousBlock.startPos;
  const rightColumnPos = dualDialoguePos + 1 + leftColumn.nodeSize;
  const rightColNode = tr.doc.nodeAt(rightColumnPos);

  if (rightColNode && rightColNode.type.name === 'dual_dialogue_column') {
    let dialoguePos = rightColumnPos + 1;
    rightColNode.forEach((child, offset) => {
      if (child.type.name === 'dialogue') {
        dialoguePos = rightColumnPos + 1 + offset;
      }
    });
    const dialogueNode = tr.doc.nodeAt(dialoguePos);
    if (dialogueNode) {
      const endOfDialogue = dialoguePos + dialogueNode.nodeSize - 1;
      try {
        const $pos = tr.doc.resolve(endOfDialogue);
        tr = tr.setSelection(TextSelection.near($pos, -1));
      } catch {
        // Ignore position errors
      }
    }
  }

  tr.scrollIntoView();
  dispatch(tr);

  return true;
}

export { findDialogueBlockBefore, findCurrentDialogueBlock };
