import { InputRule, inputRules } from 'prosemirror-inputrules';
import { NodeType } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import { screenplaySchema } from '../schema';

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
];

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
 * All input rules for the screenplay editor.
 */
export function createInputRulesPlugin(): Plugin {
  return inputRules({
    rules: [
      ...sceneHeadingRules,
      ...transitionRules,
      parentheticalRule,
      ...smartQuotesRules,
      emDashRule,
      ellipsisRule,
    ],
  });
}

export { sceneHeadingRules, transitionRules, parentheticalRule };
