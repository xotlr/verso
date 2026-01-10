import { InputRule, inputRules } from 'prosemirror-inputrules';
import { NodeType } from 'prosemirror-model';
import { Plugin, TextSelection } from 'prosemirror-state';
import { screenplaySchema } from '../schema';
import { detectShot } from '@/lib/screenplay/patterns';
import { canMakeDualDialogue, findDialogueBlockBefore, findCurrentDialogueBlock } from '../commands/dual-dialogue';

/**
 * Input rule that converts to a specific node type when pattern matches.
 */
function nodeInputRule(
  regexp: RegExp,
  nodeType: NodeType,
  getAttrs?: (match: RegExpMatchArray) => Record<string, unknown> | null
): InputRule {
  return new InputRule(regexp, (state, match, start, end) => {
    const attrs = getAttrs ? getAttrs(match) : {};
    const $start = state.doc.resolve(start);

    // Only apply at the start of a block
    if ($start.parentOffset !== 0) {
      return null;
    }

    // Check if we can replace with the new node type
    if (!$start.parent.canReplaceWith($start.index(), $start.index(), nodeType)) {
      return null;
    }

    // Create transaction to change node type
    return state.tr
      .delete(start, end)
      .setBlockType(start, start, nodeType, attrs);
  });
}

/**
 * Scene heading input rules.
 * Triggers on: INT. | EXT. | INT/EXT. | I/E.
 */
const sceneHeadingRules = [
  // INT. at start of line
  nodeInputRule(
    /^INT\.\s$/i,
    screenplaySchema.nodes.scene_heading,
    () => ({
      type: 'INT',
      location: '',
      timeOfDay: 'DAY',
    })
  ),

  // EXT. at start of line
  nodeInputRule(
    /^EXT\.\s$/i,
    screenplaySchema.nodes.scene_heading,
    () => ({
      type: 'EXT',
      location: '',
      timeOfDay: 'DAY',
    })
  ),

  // INT/EXT. or INT./EXT. at start of line
  nodeInputRule(
    /^INT\/EXT\.\s$/i,
    screenplaySchema.nodes.scene_heading,
    () => ({
      type: 'INT/EXT',
      location: '',
      timeOfDay: 'DAY',
    })
  ),

  // I/E. shorthand
  nodeInputRule(
    /^I\/E\.\s$/i,
    screenplaySchema.nodes.scene_heading,
    () => ({
      type: 'INT/EXT',
      location: '',
      timeOfDay: 'DAY',
    })
  ),
];

/**
 * Transition input rules.
 * Triggers on common transitions ending with :
 */
const transitionRules = [
  // CUT TO:
  nodeInputRule(
    /^CUT TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // FADE TO:
  nodeInputRule(
    /^FADE TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // DISSOLVE TO:
  nodeInputRule(
    /^DISSOLVE TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // SMASH CUT TO:
  nodeInputRule(
    /^SMASH CUT TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // MATCH CUT TO:
  nodeInputRule(
    /^MATCH CUT TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // TIME CUT TO:
  nodeInputRule(
    /^TIME CUT TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // FADE IN:
  nodeInputRule(
    /^FADE IN:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // FADE OUT.
  nodeInputRule(
    /^FADE OUT\.\s$/i,
    screenplaySchema.nodes.transition
  ),

  // CUT TO BLACK.
  nodeInputRule(
    /^CUT TO BLACK\.?\s$/i,
    screenplaySchema.nodes.transition
  ),

  // FADE TO BLACK.
  nodeInputRule(
    /^FADE TO BLACK\.?\s$/i,
    screenplaySchema.nodes.transition
  ),

  // FADE OUT TO BLACK.
  nodeInputRule(
    /^FADE OUT TO BLACK\.?\s$/i,
    screenplaySchema.nodes.transition
  ),

  // IRIS OUT.
  nodeInputRule(
    /^IRIS OUT\.?\s$/i,
    screenplaySchema.nodes.transition
  ),

  // IRIS IN.
  nodeInputRule(
    /^IRIS IN\.?\s$/i,
    screenplaySchema.nodes.transition
  ),

  // WIPE TO:
  nodeInputRule(
    /^WIPE TO:\s$/i,
    screenplaySchema.nodes.transition
  ),

  // JUMP CUT TO:
  nodeInputRule(
    /^JUMP CUT TO:\s$/i,
    screenplaySchema.nodes.transition
  ),
];

/**
 * Ending input rules.
 * Triggers on THE END and similar patterns.
 */
const endingRules = [
  // THE END (with optional period)
  nodeInputRule(
    /^THE END\.?\s$/i,
    screenplaySchema.nodes.ending
  ),

  // FADE OUT. THE END (common ending pattern)
  nodeInputRule(
    /^FADE OUT\.\s*THE END\.?\s$/i,
    screenplaySchema.nodes.ending
  ),
];

/**
 * Shot input rules.
 * Triggers on common shot patterns followed by space or subject.
 */
const shotRules = [
  // Wide shots
  nodeInputRule(
    /^(WIDE SHOT|WS|WIDE ON)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'WIDE', subject: null })
  ),

  // Close-up shots
  nodeInputRule(
    /^(CLOSE-?UP|CU|CLOSE ON)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'CLOSE_UP', subject: null })
  ),

  // Extreme close-up
  nodeInputRule(
    /^(EXTREME CLOSE-?UP|ECU|XCU)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'EXTREME_CLOSE_UP', subject: null })
  ),

  // Medium shots
  nodeInputRule(
    /^(MEDIUM SHOT|MS|MEDIUM)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'MEDIUM', subject: null })
  ),

  // Two-shot
  nodeInputRule(
    /^(TWO-?SHOT|2-?SHOT)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'TWO_SHOT', subject: null })
  ),

  // POV
  nodeInputRule(
    /^(POV|P\.O\.V\.)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'POV', subject: null })
  ),

  // Insert
  nodeInputRule(
    /^INSERT\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'INSERT', subject: null })
  ),

  // Angle on
  nodeInputRule(
    /^ANGLE ON\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'ANGLE_ON', subject: null })
  ),

  // Over the shoulder
  nodeInputRule(
    /^(OVER THE SHOULDER|OTS|O\/S SHOT)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'OVER_SHOULDER', subject: null })
  ),

  // Tracking shot
  nodeInputRule(
    /^(TRACKING SHOT|TRACKING)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'TRACKING', subject: null })
  ),

  // Establishing shot
  nodeInputRule(
    /^(ESTABLISHING SHOT|ESTABLISHING)\s$/i,
    screenplaySchema.nodes.shot,
    (_match) => ({ shotType: 'ESTABLISHING', subject: null })
  ),
];

/**
 * Smart shot detection input rule.
 * Auto-detects shot patterns and converts to shot element with appropriate attributes.
 */
const smartShotRule = new InputRule(
  // Match shot patterns with subject after a separator
  /^(WIDE SHOT|WS|WIDE ON|CLOSE-?UP|CU|CLOSE ON|EXTREME CLOSE-?UP|ECU|XCU|MEDIUM SHOT|MS|TWO-?SHOT|2-?SHOT|POV|INSERT|ANGLE ON|OTS|TRACKING|ESTABLISHING)\s*[-:–—]\s*(.+)$/i,
  (state, match, start, end) => {
    const $start = state.doc.resolve(start);

    // Only at start of block
    if ($start.parentOffset !== 0) {
      return null;
    }

    const fullText = match[0];
    const detected = detectShot(fullText);

    if (!detected) {
      return null;
    }

    const nodeType = screenplaySchema.nodes.shot;
    if (!$start.parent.canReplaceWith($start.index(), $start.index(), nodeType)) {
      return null;
    }

    return state.tr.setBlockType(start, end, nodeType, {
      shotType: detected.shotType,
      subject: detected.subject,
    });
  }
);

/**
 * Parenthetical input rule.
 * Triggers when wrapping text in parentheses.
 */
const parentheticalRule = new InputRule(
  /^\((.+)\)\s$/,
  (state, match, start, end) => {
    const $start = state.doc.resolve(start);

    // Only at start of block
    if ($start.parentOffset !== 0) {
      return null;
    }

    // Only after character or dialogue
    const prevNode = $start.nodeBefore;
    if (prevNode) {
      const prevType = prevNode.type.name;
      if (prevType !== 'character' && prevType !== 'dialogue') {
        return null;
      }
    }

    const nodeType = screenplaySchema.nodes.parenthetical;
    if (!$start.parent.canReplaceWith($start.index(), $start.index(), nodeType)) {
      return null;
    }

    // Keep the parenthetical content but change node type
    return state.tr
      .setBlockType(start, end, nodeType);
  }
);

/**
 * Smart quotes input rule.
 * Converts straight quotes to curly quotes.
 */
const smartQuotesRules = [
  // Opening double quote after space or start
  new InputRule(/(?:^|[\s\(\[\{])"$/, (state, match, start, end) => {
    return state.tr.insertText('\u201C', end - 1, end);
  }),

  // Closing double quote
  new InputRule(/"$/, (state, match, start, end) => {
    return state.tr.insertText('\u201D', start, end);
  }),

  // Opening single quote / apostrophe
  new InputRule(/(?:^|[\s\(\[\{])'$/, (state, match, start, end) => {
    return state.tr.insertText('\u2018', end - 1, end);
  }),

  // Closing single quote / apostrophe
  new InputRule(/'$/, (state, match, start, end) => {
    return state.tr.insertText('\u2019', start, end);
  }),
];

/**
 * Em dash input rule.
 * Converts -- to em dash.
 */
const emDashRule = new InputRule(/--$/, (state, match, start, end) => {
  return state.tr.insertText('\u2014', start, end);
});

/**
 * Ellipsis input rule.
 * Converts ... to ellipsis character.
 */
const ellipsisRule = new InputRule(/\.\.\.$/, (state, match, start, end) => {
  return state.tr.insertText('\u2026', start, end);
});

/**
 * Super input rules.
 * Triggers on SUPER: at start of line.
 */
const superRules = [
  nodeInputRule(
    /^SUPER:\s$/i,
    screenplaySchema.nodes.super
  ),
];

/**
 * Chyron input rules.
 * Triggers on CHYRON: at start of line.
 */
const chyronRules = [
  nodeInputRule(
    /^CHYRON:\s$/i,
    screenplaySchema.nodes.chyron
  ),
];

/**
 * Flashback input rules.
 * Triggers on FLASHBACK or BEGIN FLASHBACK at start of line.
 */
const flashbackRules = [
  nodeInputRule(
    /^FLASHBACK\.?\s$/i,
    screenplaySchema.nodes.flashback
  ),
  nodeInputRule(
    /^BEGIN FLASHBACK\.?\s$/i,
    screenplaySchema.nodes.flashback
  ),
];

/**
 * Montage input rules.
 * Triggers on MONTAGE or BEGIN MONTAGE at start of line.
 */
const montageRules = [
  nodeInputRule(
    /^MONTAGE\.?\s$/i,
    screenplaySchema.nodes.montage
  ),
  nodeInputRule(
    /^BEGIN MONTAGE\.?\s$/i,
    screenplaySchema.nodes.montage
  ),
];

/**
 * Intercut input rules.
 * Triggers on INTERCUT or INTERCUT BETWEEN: at start of line.
 */
const intercutRules = [
  nodeInputRule(
    /^INTERCUT\.?\s$/i,
    screenplaySchema.nodes.intercut
  ),
  nodeInputRule(
    /^INTERCUT BETWEEN:\s$/i,
    screenplaySchema.nodes.intercut
  ),
];

/**
 * Dual dialogue input rule (Fountain ^ syntax).
 * When user types "CHARACTER ^" or "CHARACTER ^ " in a character block,
 * and there's a previous dialogue block, wrap both into dual dialogue.
 */
const dualDialogueRule = new InputRule(
  // Match ^ at end of character name (with optional trailing space)
  /\s*\^\s*$/,
  (state, _match, _start, _end) => {
    const { $head } = state.selection;

    // Must be in a character block
    if ($head.parent.type.name !== 'character') {
      return null;
    }

    // Must be able to create dual dialogue
    if (!canMakeDualDialogue(state)) {
      return null;
    }

    // Find the dialogue blocks
    const currentBlock = findCurrentDialogueBlock(state);
    if (!currentBlock) return null;

    const previousBlock = findDialogueBlockBefore(state.doc, currentBlock.startPos);
    if (!previousBlock) return null;

    const schema = screenplaySchema;
    const dualDialogueType = schema.nodes.dual_dialogue;
    const columnType = schema.nodes.dual_dialogue_column;

    // Strip the ^ from the character name
    const characterText = $head.parent.textContent.replace(/\s*\^\s*$/, '').trim();

    // Create left column content (previous block's nodes)
    const leftColumnContent = previousBlock.nodes.map((node) => {
      if (node.type.name === 'character') {
        return node.type.create({ ...node.attrs, isDual: true }, node.content, node.marks);
      }
      return node.copy(node.content);
    });

    // Create right column content (current character + empty dialogue)
    const rightCharacter = schema.nodes.character.create(
      { isDual: true },
      characterText ? schema.text(characterText) : undefined
    );
    const rightDialogue = schema.nodes.dialogue.create();

    const leftColumn = columnType.create(null, leftColumnContent);
    const rightColumn = columnType.create(null, [rightCharacter, rightDialogue]);
    const dualDialogue = dualDialogueType.create(null, [leftColumn, rightColumn]);

    // Replace from previous block start to current block end with dual dialogue
    let tr = state.tr.replaceWith(previousBlock.startPos, currentBlock.endPos, dualDialogue);

    // Position cursor in the right column's dialogue
    const dualDialoguePos = previousBlock.startPos;
    const rightColumnPos = dualDialoguePos + 1 + leftColumn.nodeSize;

    // Find dialogue in right column and position cursor there
    const dialoguePos = rightColumnPos + 1 + rightCharacter.nodeSize;
    try {
      const $pos = tr.doc.resolve(dialoguePos + 1);
      tr = tr.setSelection(TextSelection.near($pos));
    } catch {
      // Ignore position errors
    }

    tr.scrollIntoView();
    return tr;
  }
);

/**
 * All input rules for the screenplay editor.
 */
export function createInputRulesPlugin(): Plugin {
  return inputRules({
    rules: [
      ...sceneHeadingRules,
      ...transitionRules,
      ...endingRules,
      ...shotRules,
      smartShotRule,
      parentheticalRule,
      dualDialogueRule,
      ...superRules,
      ...chyronRules,
      ...flashbackRules,
      ...montageRules,
      ...intercutRules,
      ...smartQuotesRules,
      emDashRule,
      ellipsisRule,
    ],
  });
}

export { sceneHeadingRules, transitionRules, shotRules, parentheticalRule };
