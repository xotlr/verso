import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { screenplaySchema } from '@/lib/prosemirror/schema';
import {
  canMakeDualDialogue,
  wrapInDualDialogue,
  unwrapDualDialogue,
  isInDualDialogue,
  getPreviousCharacterName,
  findDialogueBlockBefore,
  findCurrentDialogueBlock,
} from '@/lib/prosemirror/commands/dual-dialogue';

/**
 * Helper to create an EditorState from JSON content
 * @param content - Array of node objects
 * @param nodeIndex - Index of the node to place cursor in (0-based)
 */
function createEditorState(
  content: object[],
  nodeIndex?: number
): EditorState {
  const doc = screenplaySchema.nodeFromJSON({
    type: 'doc',
    content,
  });

  let state = EditorState.create({
    doc,
    schema: screenplaySchema,
  });

  // Position cursor in the specified node index
  if (nodeIndex !== undefined && nodeIndex < doc.childCount) {
    let pos = 0;
    for (let i = 0; i < nodeIndex; i++) {
      pos += doc.child(i).nodeSize;
    }
    // Position inside the target node (pos + 1 enters the node)
    const targetPos = pos + 1;
    if (targetPos <= doc.content.size) {
      const $pos = state.doc.resolve(targetPos);
      state = state.apply(state.tr.setSelection(TextSelection.near($pos)));
    }
  }

  return state;
}

/**
 * Helper to create a character node JSON
 */
function character(name: string, isDual = false) {
  return {
    type: 'character',
    attrs: { isDual },
    content: [{ type: 'text', text: name }],
  };
}

/**
 * Helper to create a dialogue node JSON
 */
function dialogue(text: string) {
  return {
    type: 'dialogue',
    content: [{ type: 'text', text }],
  };
}

/**
 * Helper to create an action node JSON
 */
function action(text: string) {
  return {
    type: 'action',
    content: [{ type: 'text', text }],
  };
}

/**
 * Helper to create a parenthetical node JSON
 */
function parenthetical(text: string) {
  return {
    type: 'parenthetical',
    content: [{ type: 'text', text }],
  };
}

describe('canMakeDualDialogue', () => {
  it('returns true when cursor is on CHARACTER with previous DIALOGUE block', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello there.'),
        character('MARY'),
      ],
      2 // Index 2 = MARY's character block
    );

    expect(canMakeDualDialogue(state)).toBe(true);
  });

  it('returns true when cursor is on DIALOGUE with previous DIALOGUE block', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello there.'),
        character('MARY'),
        dialogue('Hi John!'),
      ],
      3 // Index 3 = MARY's dialogue
    );

    expect(canMakeDualDialogue(state)).toBe(true);
  });

  it('returns false when on CHARACTER with no previous DIALOGUE', () => {
    const state = createEditorState(
      [
        action('John enters the room.'),
        character('JOHN'),
      ],
      1 // Index 1 = JOHN's character block
    );

    expect(canMakeDualDialogue(state)).toBe(false);
  });

  it('returns false when on ACTION element', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello.'),
        action('John walks away.'),
      ],
      2 // Index 2 = action
    );

    expect(canMakeDualDialogue(state)).toBe(false);
  });

  it('returns false when already inside dual dialogue', () => {
    const state = createEditorState(
      [
        {
          type: 'dual_dialogue',
          content: [
            {
              type: 'dual_dialogue_column',
              content: [character('JOHN', true), dialogue('Hello.')],
            },
            {
              type: 'dual_dialogue_column',
              content: [character('MARY', true), dialogue('Hi.')],
            },
          ],
        },
      ],
      0 // Index 0 = dual_dialogue
    );

    expect(canMakeDualDialogue(state)).toBe(false);
  });
});

describe('isInDualDialogue', () => {
  it('returns true when cursor is inside dual dialogue', () => {
    const state = createEditorState(
      [
        {
          type: 'dual_dialogue',
          content: [
            {
              type: 'dual_dialogue_column',
              content: [character('JOHN', true), dialogue('Hello.')],
            },
            {
              type: 'dual_dialogue_column',
              content: [character('MARY', true), dialogue('Hi.')],
            },
          ],
        },
      ],
      0 // Index 0 = dual_dialogue
    );

    expect(isInDualDialogue(state)).toBe(true);
  });

  it('returns false when cursor is outside dual dialogue', () => {
    const state = createEditorState(
      [character('JOHN'), dialogue('Hello.')],
      0 // Index 0 = character
    );

    expect(isInDualDialogue(state)).toBe(false);
  });
});

describe('getPreviousCharacterName', () => {
  it('returns the previous character name when applicable', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello there.'),
        character('MARY'),
      ],
      2 // Index 2 = MARY
    );

    expect(getPreviousCharacterName(state)).toBe('JOHN');
  });

  it('returns null when there is no previous dialogue block', () => {
    const state = createEditorState([character('JOHN')], 0);

    expect(getPreviousCharacterName(state)).toBeNull();
  });
});

describe('findDialogueBlockBefore', () => {
  it('finds dialogue block before given position', () => {
    const doc = screenplaySchema.nodeFromJSON({
      type: 'doc',
      content: [
        character('JOHN'),
        dialogue('Hello there.'),
        character('MARY'),
      ],
    });

    // Find block before MARY's position
    const block = findDialogueBlockBefore(doc, 25);

    expect(block).not.toBeNull();
    expect(block?.characterName).toBe('JOHN');
    expect(block?.nodes.length).toBe(2); // character + dialogue
  });

  it('returns null when no dialogue block exists before position', () => {
    const doc = screenplaySchema.nodeFromJSON({
      type: 'doc',
      content: [action('Some action.'), character('JOHN')],
    });

    const block = findDialogueBlockBefore(doc, 20);

    expect(block).toBeNull();
  });

  it('includes parenthetical in dialogue block', () => {
    const doc = screenplaySchema.nodeFromJSON({
      type: 'doc',
      content: [
        character('JOHN'),
        parenthetical('whispering'),
        dialogue('Hello.'),
        character('MARY'),
      ],
    });

    const block = findDialogueBlockBefore(doc, 40);

    expect(block).not.toBeNull();
    expect(block?.characterName).toBe('JOHN');
    expect(block?.nodes.length).toBe(3); // character + parenthetical + dialogue
  });
});

describe('findCurrentDialogueBlock', () => {
  it('finds dialogue block containing cursor', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello.'),
        character('MARY'),
        dialogue('Hi.'),
      ],
      3 // Index 3 = MARY's dialogue
    );

    const block = findCurrentDialogueBlock(state);

    expect(block).not.toBeNull();
    expect(block?.characterName).toBe('MARY');
  });

  it('returns null when cursor is not in dialogue element', () => {
    const state = createEditorState(
      [action('Some action.'), character('JOHN')],
      0 // Index 0 = action
    );

    const block = findCurrentDialogueBlock(state);

    expect(block).toBeNull();
  });
});

describe('wrapInDualDialogue', () => {
  it('wraps two dialogue blocks into dual dialogue', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello there.'),
        character('MARY'),
      ],
      2 // Index 2 = MARY's character block
    );

    let resultState: EditorState | null = null;
    const dispatch = (tr: import('prosemirror-state').Transaction) => {
      resultState = state.apply(tr);
    };

    const result = wrapInDualDialogue(state, dispatch);

    expect(result).toBe(true);
    expect(resultState).not.toBeNull();

    // Check the resulting document structure
    const doc = resultState!.doc;
    expect(doc.firstChild?.type.name).toBe('dual_dialogue');

    // Check columns
    const dualDialogue = doc.firstChild!;
    expect(dualDialogue.childCount).toBe(2);
    expect(dualDialogue.child(0).type.name).toBe('dual_dialogue_column');
    expect(dualDialogue.child(1).type.name).toBe('dual_dialogue_column');
  });

  it('returns false when cannot make dual dialogue', () => {
    const state = createEditorState([action('Some action.')], 0);

    const result = wrapInDualDialogue(state, undefined);

    expect(result).toBe(false);
  });

  it('returns true without dispatch for dry run', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello.'),
        character('MARY'),
      ],
      2 // Index 2 = MARY
    );

    // Without dispatch, should return true indicating command is available
    const result = wrapInDualDialogue(state, undefined);

    expect(result).toBe(true);
  });

  it('sets isDual attribute on character nodes', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello.'),
        character('MARY'),
      ],
      2 // Index 2 = MARY
    );

    let resultState: EditorState | null = null;
    const dispatch = (tr: import('prosemirror-state').Transaction) => {
      resultState = state.apply(tr);
    };

    wrapInDualDialogue(state, dispatch);

    const doc = resultState!.doc;
    const dualDialogue = doc.firstChild!;
    const leftColumn = dualDialogue.child(0);
    const rightColumn = dualDialogue.child(1);

    // Both character nodes should have isDual = true
    expect(leftColumn.child(0).attrs.isDual).toBe(true);
    expect(rightColumn.child(0).attrs.isDual).toBe(true);
  });

  it('adds empty dialogue if right column only has character', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        dialogue('Hello.'),
        character('MARY'), // MARY has no dialogue yet
      ],
      2 // Index 2 = MARY
    );

    let resultState: EditorState | null = null;
    const dispatch = (tr: import('prosemirror-state').Transaction) => {
      resultState = state.apply(tr);
    };

    wrapInDualDialogue(state, dispatch);

    const doc = resultState!.doc;
    const rightColumn = doc.firstChild!.child(1);

    // Should have character AND dialogue (even if empty)
    let hasDialogue = false;
    rightColumn.forEach((node) => {
      if (node.type.name === 'dialogue') hasDialogue = true;
    });
    expect(hasDialogue).toBe(true);
  });
});

describe('unwrapDualDialogue', () => {
  it('unwraps dual dialogue to sequential blocks', () => {
    const state = createEditorState(
      [
        {
          type: 'dual_dialogue',
          content: [
            {
              type: 'dual_dialogue_column',
              content: [
                { type: 'character', attrs: { isDual: true }, content: [{ type: 'text', text: 'JOHN' }] },
                { type: 'dialogue', content: [{ type: 'text', text: 'Hello.' }] },
              ],
            },
            {
              type: 'dual_dialogue_column',
              content: [
                { type: 'character', attrs: { isDual: true }, content: [{ type: 'text', text: 'MARY' }] },
                { type: 'dialogue', content: [{ type: 'text', text: 'Hi.' }] },
              ],
            },
          ],
        },
      ],
      0 // Index 0 = dual_dialogue
    );

    let resultState: EditorState | null = null;
    const dispatch = (tr: import('prosemirror-state').Transaction) => {
      resultState = state.apply(tr);
    };

    const result = unwrapDualDialogue(state, dispatch);

    expect(result).toBe(true);
    expect(resultState).not.toBeNull();

    // Should have 4 top-level nodes: JOHN, dialogue, MARY, dialogue
    const doc = resultState!.doc;
    expect(doc.childCount).toBe(4);
    expect(doc.child(0).type.name).toBe('character');
    expect(doc.child(0).attrs.isDual).toBe(false);
    expect(doc.child(1).type.name).toBe('dialogue');
    expect(doc.child(2).type.name).toBe('character');
    expect(doc.child(2).attrs.isDual).toBe(false);
    expect(doc.child(3).type.name).toBe('dialogue');
  });

  it('returns false when not inside dual dialogue', () => {
    const state = createEditorState([character('JOHN'), dialogue('Hello.')], 0);

    const result = unwrapDualDialogue(state, undefined);

    expect(result).toBe(false);
  });

  it('returns true without dispatch for dry run', () => {
    const state = createEditorState(
      [
        {
          type: 'dual_dialogue',
          content: [
            {
              type: 'dual_dialogue_column',
              content: [
                { type: 'character', attrs: { isDual: true }, content: [{ type: 'text', text: 'JOHN' }] },
                { type: 'dialogue', content: [{ type: 'text', text: 'Hello.' }] },
              ],
            },
            {
              type: 'dual_dialogue_column',
              content: [
                { type: 'character', attrs: { isDual: true }, content: [{ type: 'text', text: 'MARY' }] },
                { type: 'dialogue', content: [{ type: 'text', text: 'Hi.' }] },
              ],
            },
          ],
        },
      ],
      0 // Index 0 = dual_dialogue
    );

    const result = unwrapDualDialogue(state, undefined);

    expect(result).toBe(true);
  });
});

describe('toggle behavior', () => {
  it('wrapInDualDialogue unwraps if already in dual dialogue', () => {
    const state = createEditorState(
      [
        {
          type: 'dual_dialogue',
          content: [
            {
              type: 'dual_dialogue_column',
              content: [
                { type: 'character', attrs: { isDual: true }, content: [{ type: 'text', text: 'JOHN' }] },
                { type: 'dialogue', content: [{ type: 'text', text: 'Hello.' }] },
              ],
            },
            {
              type: 'dual_dialogue_column',
              content: [
                { type: 'character', attrs: { isDual: true }, content: [{ type: 'text', text: 'MARY' }] },
                { type: 'dialogue', content: [{ type: 'text', text: 'Hi.' }] },
              ],
            },
          ],
        },
      ],
      0 // Index 0 = dual_dialogue
    );

    let resultState: EditorState | null = null;
    const dispatch = (tr: import('prosemirror-state').Transaction) => {
      resultState = state.apply(tr);
    };

    // Calling wrap when already in dual dialogue should unwrap
    const result = wrapInDualDialogue(state, dispatch);

    expect(result).toBe(true);
    expect(resultState).not.toBeNull();

    // Should be unwrapped now - no dual_dialogue at top level
    const doc = resultState!.doc;
    expect(doc.firstChild?.type.name).not.toBe('dual_dialogue');
    expect(doc.child(0).type.name).toBe('character');
  });
});

describe('edge cases', () => {
  it('handles parenthetical in dialogue block', () => {
    const state = createEditorState(
      [
        character('JOHN'),
        parenthetical('whispering'),
        dialogue('Hello.'),
        character('MARY'),
      ],
      3 // Index 3 = MARY
    );

    let resultState: EditorState | null = null;
    const dispatch = (tr: import('prosemirror-state').Transaction) => {
      resultState = state.apply(tr);
    };

    const result = wrapInDualDialogue(state, dispatch);

    expect(result).toBe(true);

    // Left column should include character + parenthetical + dialogue
    const leftColumn = resultState!.doc.firstChild!.child(0);
    const nodeTypes: string[] = [];
    leftColumn.forEach((node) => nodeTypes.push(node.type.name));

    expect(nodeTypes).toContain('character');
    expect(nodeTypes).toContain('parenthetical');
    expect(nodeTypes).toContain('dialogue');
  });

  it('handles empty character name', () => {
    const state = createEditorState(
      [
        { type: 'character', content: [{ type: 'text', text: 'JOHN' }] },
        dialogue('Hello.'),
        { type: 'character', content: [] }, // Empty character
      ],
      2 // Index 2 = empty character
    );

    // Should still work, even with empty character
    expect(canMakeDualDialogue(state)).toBe(true);
  });

  it('finds most recent dialogue block even with intervening action', () => {
    const doc = screenplaySchema.nodeFromJSON({
      type: 'doc',
      content: [
        character('JOHN'),
        dialogue('Hello.'),
        action('John pauses.'), // Action breaks the sequence
        character('MARY'),
        dialogue('Hi.'),
      ],
    });

    // Calculate position before MARY (after action)
    // JOHN char + JOHN dialogue + action = approx positions
    let pos = 0;
    for (let i = 0; i < 3; i++) {
      pos += doc.child(i).nodeSize;
    }

    // Looking before MARY's position, should find MARY's dialogue block
    // (which is the most recent complete block before that position)
    const block = findDialogueBlockBefore(doc, pos);

    // JOHN's block is the only complete dialogue block before MARY
    expect(block).not.toBeNull();
    expect(block?.characterName).toBe('JOHN');
  });
});

describe('performance', () => {
  it('handles large documents efficiently', () => {
    // Create a large document with 100 dialogue exchanges
    const content: object[] = [];
    for (let i = 0; i < 100; i++) {
      content.push(character(`CHARACTER_${i}`));
      content.push(dialogue(`Dialogue line ${i}. This is some longer text to simulate real content.`));
    }
    // Add final character for dual dialogue test
    content.push(character('FINAL_CHARACTER'));

    const state = createEditorState(content, content.length - 1);

    // Traversal should complete quickly (under 10ms for 200 nodes)
    const start = performance.now();
    const result = canMakeDualDialogue(state);
    const elapsed = performance.now() - start;

    expect(result).toBe(true);
    expect(elapsed).toBeLessThan(10);
  });

  it('processes 200 node document in under 50ms', () => {
    // Create a document with 200 nodes
    const content: object[] = [];
    for (let i = 0; i < 100; i++) {
      content.push(character(`CHARACTER_${i}`));
      content.push(dialogue(`Line ${i}`));
    }
    content.push(character('LAST'));

    const state = createEditorState(content, content.length - 1);

    const start = performance.now();
    canMakeDualDialogue(state);
    const elapsed = performance.now() - start;

    // Should complete well under 50ms even on slow CI machines
    expect(elapsed).toBeLessThan(50);
  });
});
