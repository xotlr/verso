import { describe, it, expect } from 'vitest';
import {
  screenplaySchema,
  getNextElementType,
  getPreviousElementType,
  ELEMENT_CYCLE_ORDER,
  ELEMENT_DISPLAY_NAMES,
  ELEMENT_SHORTCUTS,
  ELEMENT_PLACEHOLDERS,
  type ElementType,
} from '@/lib/prosemirror/schema';

describe('screenplaySchema', () => {
  describe('node types', () => {
    it('should have doc node type', () => {
      expect(screenplaySchema.nodes.doc).toBeDefined();
    });

    it('should have scene_heading node type', () => {
      expect(screenplaySchema.nodes.scene_heading).toBeDefined();
    });

    it('should have action node type', () => {
      expect(screenplaySchema.nodes.action).toBeDefined();
    });

    it('should have character node type', () => {
      expect(screenplaySchema.nodes.character).toBeDefined();
    });

    it('should have dialogue node type', () => {
      expect(screenplaySchema.nodes.dialogue).toBeDefined();
    });

    it('should have parenthetical node type', () => {
      expect(screenplaySchema.nodes.parenthetical).toBeDefined();
    });

    it('should have transition node type', () => {
      expect(screenplaySchema.nodes.transition).toBeDefined();
    });

    it('should have title_page node type', () => {
      expect(screenplaySchema.nodes.title_page).toBeDefined();
    });

    it('should have title_page_title node type', () => {
      expect(screenplaySchema.nodes.title_page_title).toBeDefined();
    });

    it('should have title_page_author node type', () => {
      expect(screenplaySchema.nodes.title_page_author).toBeDefined();
    });

    it('should have title_page_logline node type', () => {
      expect(screenplaySchema.nodes.title_page_logline).toBeDefined();
    });

    it('should have ending node type', () => {
      expect(screenplaySchema.nodes.ending).toBeDefined();
    });

    it('should have shot node type', () => {
      expect(screenplaySchema.nodes.shot).toBeDefined();
    });

    it('should have dual_dialogue node type', () => {
      expect(screenplaySchema.nodes.dual_dialogue).toBeDefined();
    });

    it('should have dual_dialogue_column node type', () => {
      expect(screenplaySchema.nodes.dual_dialogue_column).toBeDefined();
    });

    it('should have text node type', () => {
      expect(screenplaySchema.nodes.text).toBeDefined();
    });

    it('should have hard_break node type', () => {
      expect(screenplaySchema.nodes.hard_break).toBeDefined();
    });
  });

  describe('mark types', () => {
    it('should have bold mark', () => {
      expect(screenplaySchema.marks.bold).toBeDefined();
    });

    it('should have italic mark', () => {
      expect(screenplaySchema.marks.italic).toBeDefined();
    });

    it('should have underline mark', () => {
      expect(screenplaySchema.marks.underline).toBeDefined();
    });
  });

  describe('node creation', () => {
    it('should create scene_heading node with default attrs', () => {
      const node = screenplaySchema.nodes.scene_heading.create();
      expect(node.type.name).toBe('scene_heading');
      expect(node.attrs.type).toBe('INT');
      expect(node.attrs.timeOfDay).toBe('DAY');
      expect(node.attrs.sceneNumber).toBeNull();
    });

    it('should create scene_heading node with custom attrs', () => {
      const node = screenplaySchema.nodes.scene_heading.create({
        type: 'EXT',
        location: 'BEACH',
        timeOfDay: 'NIGHT',
      });
      expect(node.attrs.type).toBe('EXT');
      expect(node.attrs.location).toBe('BEACH');
      expect(node.attrs.timeOfDay).toBe('NIGHT');
    });

    it('should create character node with default attrs', () => {
      const node = screenplaySchema.nodes.character.create();
      expect(node.type.name).toBe('character');
      expect(node.attrs.characterId).toBeNull();
      expect(node.attrs.extension).toBeNull();
      expect(node.attrs.isDual).toBe(false);
    });

    it('should create character node with custom attrs', () => {
      const node = screenplaySchema.nodes.character.create({
        characterId: 'john',
        extension: 'V.O.',
        isDual: true,
      });
      expect(node.attrs.characterId).toBe('john');
      expect(node.attrs.extension).toBe('V.O.');
      expect(node.attrs.isDual).toBe(true);
    });

    it('should create dialogue node with characterId', () => {
      const node = screenplaySchema.nodes.dialogue.create({
        characterId: 'sarah',
      });
      expect(node.type.name).toBe('dialogue');
      expect(node.attrs.characterId).toBe('sarah');
    });

    it('should create shot node with attrs', () => {
      const node = screenplaySchema.nodes.shot.create({
        shotType: 'CLOSE_UP',
        subject: 'JOHN',
      });
      expect(node.type.name).toBe('shot');
      expect(node.attrs.shotType).toBe('CLOSE_UP');
      expect(node.attrs.subject).toBe('JOHN');
    });

    it('should create action node', () => {
      const node = screenplaySchema.nodes.action.create();
      expect(node.type.name).toBe('action');
    });

    it('should create transition node', () => {
      const node = screenplaySchema.nodes.transition.create();
      expect(node.type.name).toBe('transition');
    });

    it('should create parenthetical node', () => {
      const node = screenplaySchema.nodes.parenthetical.create();
      expect(node.type.name).toBe('parenthetical');
    });
  });

  describe('document structure', () => {
    it('should create valid doc with action', () => {
      const doc = screenplaySchema.nodeFromJSON({
        type: 'doc',
        content: [{ type: 'action' }],
      });
      expect(doc.type.name).toBe('doc');
      expect(doc.childCount).toBe(1);
    });

    it('should create valid doc with title_page and content', () => {
      const doc = screenplaySchema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'title_page',
            content: [
              { type: 'title_page_title' },
              { type: 'title_page_author' },
            ],
          },
          { type: 'scene_heading' },
        ],
      });
      expect(doc.type.name).toBe('doc');
      expect(doc.firstChild?.type.name).toBe('title_page');
    });

    it('should create valid scene_heading with text', () => {
      const doc = screenplaySchema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'scene_heading',
            content: [{ type: 'text', text: 'INT. KITCHEN - DAY' }],
          },
        ],
      });
      expect(doc.firstChild?.textContent).toBe('INT. KITCHEN - DAY');
    });

    it('should create valid character with text', () => {
      const doc = screenplaySchema.nodeFromJSON({
        type: 'doc',
        content: [
          {
            type: 'character',
            content: [{ type: 'text', text: 'JOHN' }],
          },
        ],
      });
      expect(doc.firstChild?.textContent).toBe('JOHN');
    });
  });
});

describe('getNextElementType', () => {
  it('should return action after scene_heading', () => {
    expect(getNextElementType('scene_heading')).toBe('action');
  });

  it('should return shot after action', () => {
    expect(getNextElementType('action')).toBe('shot');
  });

  it('should return character after shot', () => {
    expect(getNextElementType('shot')).toBe('character');
  });

  it('should return dialogue after character', () => {
    expect(getNextElementType('character')).toBe('dialogue');
  });

  it('should return parenthetical after dialogue', () => {
    expect(getNextElementType('dialogue')).toBe('parenthetical');
  });

  it('should return transition after parenthetical', () => {
    expect(getNextElementType('parenthetical')).toBe('transition');
  });

  it('should cycle back to scene_heading from last element', () => {
    const lastElement = ELEMENT_CYCLE_ORDER[ELEMENT_CYCLE_ORDER.length - 1];
    expect(getNextElementType(lastElement)).toBe('scene_heading');
  });

  it('should return action for unknown element type', () => {
    expect(getNextElementType('unknown' as ElementType)).toBe('action');
  });
});

describe('getPreviousElementType', () => {
  it('should return scene_heading before action', () => {
    expect(getPreviousElementType('action')).toBe('scene_heading');
  });

  it('should return action before shot', () => {
    expect(getPreviousElementType('shot')).toBe('action');
  });

  it('should return shot before character', () => {
    expect(getPreviousElementType('character')).toBe('shot');
  });

  it('should return character before dialogue', () => {
    expect(getPreviousElementType('dialogue')).toBe('character');
  });

  it('should return dialogue before parenthetical', () => {
    expect(getPreviousElementType('parenthetical')).toBe('dialogue');
  });

  it('should cycle to last element from scene_heading', () => {
    const lastElement = ELEMENT_CYCLE_ORDER[ELEMENT_CYCLE_ORDER.length - 1];
    expect(getPreviousElementType('scene_heading')).toBe(lastElement);
  });

  it('should return action for unknown element type', () => {
    expect(getPreviousElementType('unknown' as ElementType)).toBe('action');
  });
});

describe('ELEMENT_CYCLE_ORDER', () => {
  it('should have scene_heading as first element', () => {
    expect(ELEMENT_CYCLE_ORDER[0]).toBe('scene_heading');
  });

  it('should contain action', () => {
    expect(ELEMENT_CYCLE_ORDER).toContain('action');
  });

  it('should contain character', () => {
    expect(ELEMENT_CYCLE_ORDER).toContain('character');
  });

  it('should contain dialogue', () => {
    expect(ELEMENT_CYCLE_ORDER).toContain('dialogue');
  });

  it('should contain parenthetical', () => {
    expect(ELEMENT_CYCLE_ORDER).toContain('parenthetical');
  });

  it('should contain transition', () => {
    expect(ELEMENT_CYCLE_ORDER).toContain('transition');
  });

  it('should have at least 5 elements', () => {
    expect(ELEMENT_CYCLE_ORDER.length).toBeGreaterThanOrEqual(5);
  });
});

describe('ELEMENT_DISPLAY_NAMES', () => {
  it('should have display name for scene_heading', () => {
    expect(ELEMENT_DISPLAY_NAMES.scene_heading).toBe('Scene Heading');
  });

  it('should have display name for action', () => {
    expect(ELEMENT_DISPLAY_NAMES.action).toBe('Action');
  });

  it('should have display name for character', () => {
    expect(ELEMENT_DISPLAY_NAMES.character).toBe('Character');
  });

  it('should have display name for dialogue', () => {
    expect(ELEMENT_DISPLAY_NAMES.dialogue).toBe('Dialogue');
  });

  it('should have display name for parenthetical', () => {
    expect(ELEMENT_DISPLAY_NAMES.parenthetical).toBe('Parenthetical');
  });

  it('should have display name for transition', () => {
    expect(ELEMENT_DISPLAY_NAMES.transition).toBe('Transition');
  });

  it('should have display name for ending', () => {
    expect(ELEMENT_DISPLAY_NAMES.ending).toBe('The End');
  });

  it('should have display name for title_page', () => {
    expect(ELEMENT_DISPLAY_NAMES.title_page).toBe('Title Page');
  });
});

describe('ELEMENT_SHORTCUTS', () => {
  it('should have shortcut for scene_heading', () => {
    expect(ELEMENT_SHORTCUTS['Mod-1']).toBe('scene_heading');
  });

  it('should have shortcut for action', () => {
    expect(ELEMENT_SHORTCUTS['Mod-2']).toBe('action');
  });

  it('should have shortcut for character', () => {
    expect(ELEMENT_SHORTCUTS['Mod-3']).toBe('character');
  });

  it('should have shortcut for dialogue', () => {
    expect(ELEMENT_SHORTCUTS['Mod-4']).toBe('dialogue');
  });

  it('should have shortcut for parenthetical', () => {
    expect(ELEMENT_SHORTCUTS['Mod-5']).toBe('parenthetical');
  });

  it('should have shortcut for transition', () => {
    expect(ELEMENT_SHORTCUTS['Mod-6']).toBe('transition');
  });
});

describe('ELEMENT_PLACEHOLDERS', () => {
  it('should have placeholder for scene_heading', () => {
    expect(ELEMENT_PLACEHOLDERS.scene_heading).toBe('INT. LOCATION - DAY');
  });

  it('should have placeholder for transition', () => {
    expect(ELEMENT_PLACEHOLDERS.transition).toBe('CUT TO:');
  });

  it('should have placeholder for ending', () => {
    expect(ELEMENT_PLACEHOLDERS.ending).toBe('THE END');
  });

  it('should have empty placeholder for action', () => {
    expect(ELEMENT_PLACEHOLDERS.action).toBe('');
  });

  it('should have empty placeholder for dialogue', () => {
    expect(ELEMENT_PLACEHOLDERS.dialogue).toBe('');
  });
});
