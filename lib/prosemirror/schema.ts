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

// Title page (cover page) container - holds editable child nodes
// All 6 fields are required so ghost placeholders always appear
const title_page: NodeSpec = {
  content: 'title_page_title title_page_author title_page_logline title_page_contact title_page_copyright title_page_draft',
  group: 'block',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page' }, 0];
  },
};

// Editable title field within title page
const title_page_title: NodeSpec = {
  content: 'text*',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page-title' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page-title' }, 0];
  },
};

// Editable author field within title page
const title_page_author: NodeSpec = {
  content: 'text*',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page-author' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page-author' }, 0];
  },
};

// Optional editable logline field within title page
const title_page_logline: NodeSpec = {
  content: 'text*',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page-logline' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page-logline' }, 0];
  },
};

// Optional contact info field within title page (bottom left)
const title_page_contact: NodeSpec = {
  content: 'text*',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page-contact' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page-contact' }, 0];
  },
};

// Optional copyright field within title page (bottom right)
const title_page_copyright: NodeSpec = {
  content: 'text*',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page-copyright' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page-copyright' }, 0];
  },
};

// Optional draft info field within title page (top right)
const title_page_draft: NodeSpec = {
  content: 'text*',
  defining: true,
  parseDOM: [{ tag: 'div.pm-title-page-draft' }],
  toDOM(): DOMOutputSpec {
    return ['div', { class: 'pm-title-page-draft' }, 0];
  },
};

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

// Ending node (THE END - centered, special styling)
const ending: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-ending' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-ending' }, 0];
  },
};

// Shot type enumeration
export type ShotType =
  | 'WIDE'
  | 'EXTREME_WIDE'
  | 'MEDIUM'
  | 'MEDIUM_WIDE'
  | 'MEDIUM_CLOSE'
  | 'CLOSE_UP'
  | 'EXTREME_CLOSE_UP'
  | 'TWO_SHOT'
  | 'THREE_SHOT'
  | 'GROUP_SHOT'
  | 'OVER_SHOULDER'
  | 'POV'
  | 'INSERT'
  | 'ANGLE_ON'
  | 'MOVING'
  | 'TRACKING'
  | 'ESTABLISHING'
  | 'AERIAL'
  | 'LOW_ANGLE'
  | 'HIGH_ANGLE'
  | 'DUTCH_ANGLE'
  | null;

// Shot node (camera direction/shot description)
const shot: NodeSpec = {
  content: 'text*',
  group: 'block',
  attrs: {
    shotType: { default: null }, // ShotType or null
    subject: { default: null }, // What the shot is focused on
    linkedShotId: { default: null }, // Link to shotlist entry
    sceneId: { default: null }, // Parent scene reference
  },
  parseDOM: [
    {
      tag: 'p.pm-shot',
      getAttrs(dom) {
        const el = dom as HTMLElement;
        return {
          shotType: el.getAttribute('data-shot-type'),
          subject: el.getAttribute('data-subject'),
          linkedShotId: el.getAttribute('data-linked-shot-id'),
          sceneId: el.getAttribute('data-scene-id'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    return [
      'p',
      {
        class: 'pm-shot',
        'data-shot-type': node.attrs.shotType,
        'data-subject': node.attrs.subject,
        'data-linked-shot-id': node.attrs.linkedShotId,
        'data-scene-id': node.attrs.sceneId,
      },
      0,
    ];
  },
};

// Super node (on-screen text)
const super_node: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-super' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-super' }, 0];
  },
};

// Chyron node (lower-third text)
const chyron: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-chyron' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-chyron' }, 0];
  },
};

// Flashback node (temporal marker)
const flashback: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-flashback' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-flashback' }, 0];
  },
};

// Montage node (sequence container)
const montage: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-montage' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-montage' }, 0];
  },
};

// Intercut node (parallel action)
const intercut: NodeSpec = {
  content: 'text*',
  group: 'block',
  parseDOM: [{ tag: 'p.pm-intercut' }],
  toDOM(): DOMOutputSpec {
    return ['p', { class: 'pm-intercut' }, 0];
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
  // Document root - optional title page followed by screenplay content
  doc: {
    content: 'title_page? block+',
  },

  // Title page (cover page) - must be first if present
  title_page,
  title_page_title,
  title_page_author,
  title_page_logline,
  title_page_contact,
  title_page_copyright,
  title_page_draft,

  // Block-level screenplay elements
  scene_heading,
  action,
  character,
  dialogue,
  parenthetical,
  transition,
  ending,
  shot,
  super: super_node,
  chyron,
  flashback,
  montage,
  intercut,
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
  highlight: {
    attrs: {
      color: { default: 'yellow' }, // 'yellow' | 'green' | 'blue' | 'pink' | 'orange'
    },
    parseDOM: [
      {
        tag: 'mark[data-highlight]',
        getAttrs: (dom) => ({
          color: (dom as HTMLElement).getAttribute('data-highlight-color') || 'yellow',
        }),
      },
    ],
    toDOM(mark): DOMOutputSpec {
      const color = mark.attrs.color || 'yellow';
      return [
        'mark',
        {
          'data-highlight': 'true',
          'data-highlight-color': color,
          class: `pm-highlight pm-highlight-${color}`,
        },
        0,
      ];
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
  | 'title_page'
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'ending'
  | 'shot'
  | 'super'
  | 'chyron'
  | 'flashback'
  | 'montage'
  | 'intercut'
  | 'dual_dialogue';

/**
 * The standard element cycling order when pressing Tab.
 */
export const ELEMENT_CYCLE_ORDER: ElementType[] = [
  'scene_heading',
  'action',
  'shot',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
  'super',
  'chyron',
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
  title_page: 'Title Page',
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  ending: 'The End',
  shot: 'Shot',
  super: 'Super',
  chyron: 'Chyron',
  flashback: 'Flashback',
  montage: 'Montage',
  intercut: 'Intercut',
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
  'Mod-7': 'shot',
  'Mod-8': 'super',
  'Mod-9': 'chyron',
  'Mod-0': 'ending',
  'Mod-Shift-f': 'flashback',
  'Mod-Shift-m': 'montage',
  'Mod-Shift-i': 'intercut',
};

/**
 * Default content for each element type when created empty.
 */
export const ELEMENT_PLACEHOLDERS: Record<ElementType, string> = {
  title_page: '',
  scene_heading: 'INT. LOCATION - DAY',
  action: '',
  character: '',
  dialogue: '',
  parenthetical: '',
  transition: 'CUT TO:',
  ending: 'THE END',
  shot: '',
  super: 'SUPER:',
  chyron: 'CHYRON:',
  flashback: 'FLASHBACK',
  montage: 'MONTAGE',
  intercut: 'INTERCUT',
  dual_dialogue: '',
};
