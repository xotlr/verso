import { Schema, NodeSpec, MarkSpec, DOMOutputSpec } from 'prosemirror-model';

/**
 * ProseMirror schema for screenplay documents.
 *
 * Node types:
 * - scene_heading: INT./EXT. LOCATION - TIME
 * - action: Description/direction blocks
 * - character: Character name cue (ALL CAPS)
 * - dialogue: Character speech
 * - parenthetical: Acting directions within dialogue
 * - transition: CUT TO:, FADE OUT., etc.
 * - dual_dialogue: Container for simultaneous dialogue
 */

// Scene heading node
const scene_heading: NodeSpec = {
  content: 'text*',
  group: 'block',
  attrs: {
    id: { default: null },
    type: { default: 'INT' }, // INT | EXT | INT/EXT | I/E
    location: { default: '' },
    timeOfDay: { default: 'DAY' }, // DAY | NIGHT | DAWN | DUSK | CONTINUOUS | LATER | MOMENTS LATER
    sceneNumber: { default: null },
  },
  parseDOM: [
    {
      tag: 'h3.pm-scene-heading',
      getAttrs(dom) {
        const el = dom as HTMLElement;
        return {
          id: el.getAttribute('data-scene-id'),
          type: el.getAttribute('data-type') || 'INT',
          location: el.getAttribute('data-location') || '',
          timeOfDay: el.getAttribute('data-time') || 'DAY',
          sceneNumber: el.getAttribute('data-scene-number'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return [
      'h3',
      {
        class: 'pm-scene-heading',
        'data-scene-id': node.attrs.id,
        'data-type': node.attrs.type,
        'data-location': node.attrs.location,
        'data-time': node.attrs.timeOfDay,
        'data-scene-number': node.attrs.sceneNumber,
      },
      0,
    ];
  },
};

// Action/description node
const action: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-action' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-action' }, 0];
  },
};

// Character name cue
const character: NodeSpec = {
  content: 'text*',
  group: 'block',
  attrs: {
    characterId: { default: null }, // Normalized character identifier
    extension: { default: null }, // V.O. | O.S. | O.C. | CONT'D
    isDual: { default: false }, // Part of dual dialogue
  },
  parseDOM: [
    {
      tag: 'p.pm-character',
      getAttrs(dom) {
        const el = dom as HTMLElement;
        return {
          characterId: el.getAttribute('data-character-id'),
          extension: el.getAttribute('data-extension'),
          isDual: el.getAttribute('data-dual') === 'true',
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return [
      'p',
      {
        class: 'pm-character',
        'data-character-id': node.attrs.characterId,
        'data-extension': node.attrs.extension,
        'data-dual': node.attrs.isDual ? 'true' : undefined,
      },
      0,
    ];
  },
};

// Dialogue node
const dialogue: NodeSpec = {
  content: 'text*',
  group: 'block',
  attrs: {
    characterId: { default: null }, // Reference to the character speaking
  },
  parseDOM: [
    {
      tag: 'p.pm-dialogue',
      getAttrs(dom) {
        const el = dom as HTMLElement;
        return {
          characterId: el.getAttribute('data-character-id'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return [
      'p',
      {
        class: 'pm-dialogue',
        'data-character-id': node.attrs.characterId,
      },
      0,
    ];
  },
};

// Parenthetical node (acting direction within dialogue)
const parenthetical: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-parenthetical' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-parenthetical' }, 0];
  },
};

// Transition node (CUT TO:, FADE OUT., etc.)
const transition: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-transition' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-transition' }, 0];
  },
};

// Dual dialogue container (two characters speaking simultaneously)
const dual_dialogue: NodeSpec = {
  content: 'dual_dialogue_column dual_dialogue_column',
  group: 'block',
  parseDOM: [{ tag: 'div.pm-dual-dialogue' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-dual-dialogue' }, 0];
  },
};

// Dual dialogue column (one side of dual dialogue)
const dual_dialogue_column: NodeSpec = {
  content: '(character dialogue? parenthetical?)+',
  parseDOM: [{ tag: 'div.pm-dual-dialogue-column' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-dual-dialogue-column' }, 0];
  },
};

// Hard line break
const hard_break: NodeSpec = {
  inline: true,
  group: 'inline',
  selectable: false,
  parseDOM: [{ tag: 'br' }],
  toDOM(): DOMOutputSpec {
    return ['br'];
  },
};

// All node specifications
const nodes: Record<string, NodeSpec> = {
  // Document root
  doc: {
    content: 'block+',
  },

  // Block-level screenplay elements
  scene_heading,
  action,
  character,
  dialogue,
  parenthetical,
  transition,
  dual_dialogue,
  dual_dialogue_column,

  // Inline elements
  text: {
    group: 'inline',
  },
  hard_break,
};

// Mark specifications (inline formatting)
const marks: Record<string, MarkSpec> = {
  bold: {
    parseDOM: [
      { tag: 'strong' },
      { tag: 'b' },
      { style: 'font-weight', getAttrs: (value) => /^(bold|[7-9]\d{2})$/.test(value as string) && null },
    ],
    toDOM(): DOMOutputSpec {
      return ['strong', 0];
    },
  },
  italic: {
    parseDOM: [
      { tag: 'em' },
      { tag: 'i' },
      { style: 'font-style=italic' },
    ],
    toDOM(): DOMOutputSpec {
      return ['em', 0];
    },
  },
  underline: {
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration', getAttrs: (value) => (value as string).includes('underline') && null },
    ],
    toDOM(): DOMOutputSpec {
      return ['u', 0];
    },
  },
};

/**
 * The ProseMirror schema for screenplay documents.
 */
export const screenplaySchema = new Schema({ nodes, marks });

/**
 * Element type names for the schema.
 */
export type ElementType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'dual_dialogue';

/**
 * The standard element cycling order when pressing Tab.
 */
export const ELEMENT_CYCLE_ORDER: ElementType[] = [
  'scene_heading',
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
];

/**
 * Get the next element type in the Tab cycle.
 */
export function getNextElementType(current: ElementType): ElementType {
  const index = ELEMENT_CYCLE_ORDER.indexOf(current);
  if (index === -1) return 'action';
  return ELEMENT_CYCLE_ORDER[(index + 1) % ELEMENT_CYCLE_ORDER.length];
}

/**
 * Get the previous element type (Shift+Tab).
 */
export function getPreviousElementType(current: ElementType): ElementType {
  const index = ELEMENT_CYCLE_ORDER.indexOf(current);
  if (index === -1) return 'action';
  return ELEMENT_CYCLE_ORDER[(index - 1 + ELEMENT_CYCLE_ORDER.length) % ELEMENT_CYCLE_ORDER.length];
}

/**
 * Element type display names for UI.
 */
export const ELEMENT_DISPLAY_NAMES: Record<ElementType, string> = {
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  dual_dialogue: 'Dual Dialogue',
};

/**
 * Element type keyboard shortcuts.
 */
export const ELEMENT_SHORTCUTS: Record<string, ElementType> = {
  'Mod-1': 'scene_heading',
  'Mod-2': 'action',
  'Mod-3': 'character',
  'Mod-4': 'dialogue',
  'Mod-5': 'parenthetical',
  'Mod-6': 'transition',
};

/**
 * Default content for each element type when created empty.
 */
export const ELEMENT_PLACEHOLDERS: Record<ElementType, string> = {
  scene_heading: 'INT. LOCATION - DAY',
  action: '',
  character: '',
  dialogue: '',
  parenthetical: '',
  transition: 'CUT TO:',
  dual_dialogue: '',
};
