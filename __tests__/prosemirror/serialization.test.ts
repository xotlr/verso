import { describe, it, expect } from 'vitest';
import {
  isProseMirrorContent,
  plainTextToProseMirror,
  proseMirrorToPlainText,
  serializeForStorage,
  deserializeFromStorage,
  createEmptyDocument,
  createStarterDocument,
} from '@/lib/prosemirror/serialization';

describe('isProseMirrorContent', () => {
  it('should return true for valid ProseMirror JSON', () => {
    const content = JSON.stringify({
      version: 1,
      type: 'prosemirror',
      content: { type: 'doc', content: [] },
    });
    expect(isProseMirrorContent(content)).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(isProseMirrorContent('INT. ROOM - DAY')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isProseMirrorContent('')).toBe(false);
  });

  it('should return false for whitespace only', () => {
    expect(isProseMirrorContent('   \n  ')).toBe(false);
  });

  it('should return false for invalid JSON', () => {
    expect(isProseMirrorContent('{ invalid json')).toBe(false);
  });

  it('should return false for JSON without prosemirror type', () => {
    const content = JSON.stringify({ type: 'other', content: {} });
    expect(isProseMirrorContent(content)).toBe(false);
  });

  it('should return false for JSON without doc content', () => {
    const content = JSON.stringify({
      type: 'prosemirror',
      content: { type: 'notdoc' },
    });
    expect(isProseMirrorContent(content)).toBe(false);
  });
});

describe('plainTextToProseMirror', () => {
  describe('scene headings', () => {
    it('should parse INT. scene heading', () => {
      const doc = plainTextToProseMirror('INT. KITCHEN - DAY');
      const node = doc.firstChild;
      expect(node?.type.name).toBe('scene_heading');
      expect(node?.attrs.type).toBe('INT');
      expect(node?.attrs.location).toBe('KITCHEN');
      expect(node?.attrs.timeOfDay).toBe('DAY');
    });

    it('should parse EXT. scene heading', () => {
      const doc = plainTextToProseMirror('EXT. PARK - NIGHT');
      const node = doc.firstChild;
      expect(node?.type.name).toBe('scene_heading');
      expect(node?.attrs.type).toBe('EXT');
      expect(node?.attrs.location).toBe('PARK');
      expect(node?.attrs.timeOfDay).toBe('NIGHT');
    });

    it('should parse INT/EXT. scene heading', () => {
      const doc = plainTextToProseMirror('INT/EXT. CAR - DAY');
      const node = doc.firstChild;
      expect(node?.type.name).toBe('scene_heading');
      expect(node?.attrs.type).toBe('INT/EXT');
    });

    it('should parse I/E. scene heading', () => {
      const doc = plainTextToProseMirror('I/E. DOORWAY - DUSK');
      const node = doc.firstChild;
      expect(node?.type.name).toBe('scene_heading');
      expect(node?.attrs.type).toBe('INT/EXT');
    });

    it('should handle numbered scene headings', () => {
      const doc = plainTextToProseMirror('1.  INT. OFFICE - DAY');
      const node = doc.firstChild;
      expect(node?.type.name).toBe('scene_heading');
      expect(node?.textContent).toBe('1.  INT. OFFICE - DAY');
    });

    it('should default timeOfDay to DAY when not specified', () => {
      const doc = plainTextToProseMirror('INT. WAREHOUSE');
      const node = doc.firstChild;
      expect(node?.attrs.timeOfDay).toBe('DAY');
    });
  });

  describe('cover page extraction', () => {
    it('should extract title from first line before scene', () => {
      const text = `MY SCREENPLAY

INT. ROOM - DAY`;
      const doc = plainTextToProseMirror(text);
      const titlePage = doc.firstChild;
      expect(titlePage?.type.name).toBe('title_page');
    });

    it('should extract explicit Title: field', () => {
      const text = `Title: The Great Script

INT. ROOM - DAY`;
      const doc = plainTextToProseMirror(text);
      const titlePage = doc.firstChild;
      expect(titlePage?.type.name).toBe('title_page');
      const titleNode = titlePage?.firstChild;
      expect(titleNode?.textContent).toBe('The Great Script');
    });

    it('should extract author from Written by line', () => {
      const text = `My Title
Written by John Doe

INT. ROOM - DAY`;
      const doc = plainTextToProseMirror(text);
      const titlePage = doc.firstChild;
      const authorNode = titlePage?.child(1);
      expect(authorNode?.textContent).toBe('John Doe');
    });

    it('should extract Author: field', () => {
      const text = `Title: Test
Author: Jane Smith

INT. ROOM - DAY`;
      const doc = plainTextToProseMirror(text);
      const titlePage = doc.firstChild;
      const authorNode = titlePage?.child(1);
      expect(authorNode?.textContent).toBe('Jane Smith');
    });

    it('should extract logline', () => {
      const text = `My Title
Logline: A story about testing.

INT. ROOM - DAY`;
      const doc = plainTextToProseMirror(text);
      const titlePage = doc.firstChild;
      const loglineNode = titlePage?.child(2);
      expect(loglineNode?.textContent).toBe('A story about testing.');
    });
  });

  describe('character and dialogue', () => {
    it('should parse character name followed by dialogue', () => {
      const text = `INT. ROOM - DAY

JOHN
Hello there.`;
      const doc = plainTextToProseMirror(text);
      const nodes: string[] = [];
      doc.forEach((n) => nodes.push(n.type.name));
      expect(nodes).toContain('character');
      expect(nodes).toContain('dialogue');
    });

    it('should set characterId on character node', () => {
      const text = `INT. ROOM - DAY

SARAH CONNOR
I'll be back.`;
      const doc = plainTextToProseMirror(text);
      let characterNode = null;
      doc.forEach((n) => {
        if (n.type.name === 'character') characterNode = n;
      });
      expect(characterNode?.attrs.characterId).toBe('sarah-connor');
    });

    it('should handle multi-line dialogue', () => {
      const text = `INT. ROOM - DAY

JOHN
This is line one.
This is line two.
This is line three.`;
      const doc = plainTextToProseMirror(text);
      let dialogueNode = null;
      doc.forEach((n) => {
        if (n.type.name === 'dialogue') dialogueNode = n;
      });
      expect(dialogueNode?.textContent).toContain('line one');
      expect(dialogueNode?.textContent).toContain('line two');
      expect(dialogueNode?.textContent).toContain('line three');
    });
  });

  describe('parentheticals', () => {
    it('should parse parenthetical', () => {
      const text = `INT. ROOM - DAY

JOHN
(whispering)
Can you hear me?`;
      const doc = plainTextToProseMirror(text);
      let parenthetical = null;
      doc.forEach((n) => {
        if (n.type.name === 'parenthetical') parenthetical = n;
      });
      expect(parenthetical).toBeDefined();
      expect(parenthetical?.textContent).toBe('(whispering)');
    });
  });

  describe('transitions', () => {
    it('should parse CUT TO:', () => {
      const text = `INT. ROOM - DAY

Action here.

CUT TO:`;
      const doc = plainTextToProseMirror(text);
      let transition = null;
      doc.forEach((n) => {
        if (n.type.name === 'transition') transition = n;
      });
      expect(transition).toBeDefined();
      expect(transition?.textContent).toBe('CUT TO:');
    });

    it('should parse FADE TO:', () => {
      const text = `INT. ROOM - DAY

FADE TO:`;
      const doc = plainTextToProseMirror(text);
      let transition = null;
      doc.forEach((n) => {
        if (n.type.name === 'transition') transition = n;
      });
      expect(transition?.textContent).toBe('FADE TO:');
    });
  });

  describe('action lines', () => {
    it('should parse action as default', () => {
      const text = `INT. ROOM - DAY

The door opens slowly.`;
      const doc = plainTextToProseMirror(text);
      let action = null;
      doc.forEach((n) => {
        if (n.type.name === 'action') action = n;
      });
      expect(action).toBeDefined();
      expect(action?.textContent).toBe('The door opens slowly.');
    });
  });

  describe('empty documents', () => {
    it('should create at least one node for empty input', () => {
      const doc = plainTextToProseMirror('');
      expect(doc.childCount).toBeGreaterThan(0);
    });

    it('should create action node for whitespace only', () => {
      const doc = plainTextToProseMirror('   \n\n   ');
      expect(doc.firstChild?.type.name).toBe('action');
    });
  });
});

describe('proseMirrorToPlainText', () => {
  it('should convert scene heading to text', () => {
    const doc = plainTextToProseMirror('INT. KITCHEN - DAY');
    const text = proseMirrorToPlainText(doc);
    expect(text).toContain('INT. KITCHEN - DAY');
  });

  it('should convert action to text', () => {
    const doc = plainTextToProseMirror('INT. ROOM - DAY\n\nThe door opens.');
    const text = proseMirrorToPlainText(doc);
    expect(text).toContain('The door opens.');
  });

  it('should convert character and dialogue', () => {
    const doc = plainTextToProseMirror(`INT. ROOM - DAY

JOHN
Hello world.`);
    const text = proseMirrorToPlainText(doc);
    expect(text).toContain('JOHN');
    expect(text).toContain('Hello world.');
  });

  it('should handle title page conversion', () => {
    const doc = plainTextToProseMirror(`Title: My Script
Author: Test Author

INT. ROOM - DAY`);
    const text = proseMirrorToPlainText(doc);
    expect(text).toContain('MY SCRIPT');
    expect(text).toContain('Written by');
    expect(text).toContain('Test Author');
  });

  it('should limit consecutive blank lines', () => {
    const doc = plainTextToProseMirror('INT. ROOM - DAY\n\n\n\n\nAction.');
    const text = proseMirrorToPlainText(doc);
    // Should not have more than 2 consecutive newlines
    expect(text).not.toMatch(/\n{3,}/);
  });
});

describe('serializeForStorage', () => {
  it('should create valid JSON string', () => {
    const doc = createEmptyDocument();
    const serialized = serializeForStorage(doc);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('should include version number', () => {
    const doc = createEmptyDocument();
    const serialized = serializeForStorage(doc);
    const parsed = JSON.parse(serialized);
    expect(parsed.version).toBe(1);
  });

  it('should include prosemirror type', () => {
    const doc = createEmptyDocument();
    const serialized = serializeForStorage(doc);
    const parsed = JSON.parse(serialized);
    expect(parsed.type).toBe('prosemirror');
  });

  it('should include doc content', () => {
    const doc = createEmptyDocument();
    const serialized = serializeForStorage(doc);
    const parsed = JSON.parse(serialized);
    expect(parsed.content.type).toBe('doc');
  });
});

describe('deserializeFromStorage', () => {
  it('should return starter document for null', () => {
    const doc = deserializeFromStorage(null);
    expect(doc.type.name).toBe('doc');
    expect(doc.firstChild?.type.name).toBe('title_page');
  });

  it('should return starter document for undefined', () => {
    const doc = deserializeFromStorage(undefined);
    expect(doc.type.name).toBe('doc');
  });

  it('should return starter document for empty string', () => {
    const doc = deserializeFromStorage('');
    expect(doc.type.name).toBe('doc');
  });

  it('should parse valid ProseMirror JSON', () => {
    const original = createEmptyDocument();
    const serialized = serializeForStorage(original);
    const restored = deserializeFromStorage(serialized);
    expect(restored.type.name).toBe('doc');
  });

  it('should convert plain text to ProseMirror', () => {
    const plainText = 'INT. ROOM - DAY\n\nAction here.';
    const doc = deserializeFromStorage(plainText);
    expect(doc.type.name).toBe('doc');
    expect(doc.firstChild?.type.name).toBe('scene_heading');
  });

  it('should preserve document structure through round-trip', () => {
    const original = plainTextToProseMirror(`INT. KITCHEN - DAY

JOHN
Hello.`);
    const serialized = serializeForStorage(original);
    const restored = deserializeFromStorage(serialized);

    const originalNodes: string[] = [];
    const restoredNodes: string[] = [];
    original.forEach((n) => originalNodes.push(n.type.name));
    restored.forEach((n) => restoredNodes.push(n.type.name));

    expect(restoredNodes).toEqual(originalNodes);
  });
});

describe('createEmptyDocument', () => {
  it('should create a doc node', () => {
    const doc = createEmptyDocument();
    expect(doc.type.name).toBe('doc');
  });

  it('should have at least one child', () => {
    const doc = createEmptyDocument();
    expect(doc.childCount).toBeGreaterThan(0);
  });

  it('should have action as first child', () => {
    const doc = createEmptyDocument();
    expect(doc.firstChild?.type.name).toBe('action');
  });
});

describe('createStarterDocument', () => {
  it('should create a doc node', () => {
    const doc = createStarterDocument();
    expect(doc.type.name).toBe('doc');
  });

  it('should have title_page as first node', () => {
    const doc = createStarterDocument();
    expect(doc.firstChild?.type.name).toBe('title_page');
  });

  it('should have scene_heading after title_page', () => {
    const doc = createStarterDocument();
    expect(doc.child(1)?.type.name).toBe('scene_heading');
  });

  it('should have action after scene_heading', () => {
    const doc = createStarterDocument();
    expect(doc.child(2)?.type.name).toBe('action');
  });

  it('should have title_page with three children', () => {
    const doc = createStarterDocument();
    const titlePage = doc.firstChild;
    expect(titlePage?.childCount).toBe(3);
    expect(titlePage?.child(0)?.type.name).toBe('title_page_title');
    expect(titlePage?.child(1)?.type.name).toBe('title_page_author');
    expect(titlePage?.child(2)?.type.name).toBe('title_page_logline');
  });

  it('should have default scene_heading attributes', () => {
    const doc = createStarterDocument();
    const sceneHeading = doc.child(1);
    expect(sceneHeading?.attrs.type).toBe('INT');
    expect(sceneHeading?.attrs.timeOfDay).toBe('DAY');
  });
});
