import { describe, it, expect } from 'vitest';
import { Schema, Node as ProseMirrorNode } from 'prosemirror-model';
import {
  calculateWordCount,
  calculatePageCount,
  extractScenes,
  extractCharacters,
} from '@/hooks/editor/document-extractors';

// Minimal schema for testing
const testSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    scene_heading: {
      content: 'text*',
      group: 'block',
      attrs: {
        id: { default: null },
        type: { default: null },
        location: { default: null },
        timeOfDay: { default: null },
        sceneNumber: { default: null },
      },
      toDOM: () => ['div', { class: 'scene-heading' }, 0],
      parseDOM: [{ tag: 'div.scene-heading' }],
    },
    character: {
      content: 'text*',
      group: 'block',
      attrs: {
        characterId: { default: null },
      },
      toDOM: () => ['div', { class: 'character' }, 0],
      parseDOM: [{ tag: 'div.character' }],
    },
    action: {
      content: 'text*',
      group: 'block',
      toDOM: () => ['p', 0],
      parseDOM: [{ tag: 'p' }],
    },
    dialogue: {
      content: 'text*',
      group: 'block',
      toDOM: () => ['div', { class: 'dialogue' }, 0],
      parseDOM: [{ tag: 'div.dialogue' }],
    },
    text: { group: 'inline' },
  },
});

// Helper to create test documents
function createDoc(...nodes: ProseMirrorNode[]): ProseMirrorNode {
  return testSchema.node('doc', null, nodes);
}

function createSceneHeading(
  text: string,
  attrs: {
    id?: string;
    type?: string;
    location?: string;
    timeOfDay?: string;
    sceneNumber?: number;
  } = {}
): ProseMirrorNode {
  return testSchema.node(
    'scene_heading',
    {
      id: attrs.id ?? null,
      type: attrs.type ?? null, // Allow null to test text parsing fallback
      location: attrs.location ?? null, // Allow null to test text parsing fallback
      timeOfDay: attrs.timeOfDay ?? null,
      sceneNumber: attrs.sceneNumber ?? null,
    },
    text ? [testSchema.text(text)] : []
  );
}

function createCharacter(name: string, characterId?: string): ProseMirrorNode {
  return testSchema.node(
    'character',
    { characterId: characterId || null },
    [testSchema.text(name)]
  );
}

function createAction(text: string): ProseMirrorNode {
  return testSchema.node('action', null, text ? [testSchema.text(text)] : []);
}

function createDialogue(text: string): ProseMirrorNode {
  return testSchema.node('dialogue', null, text ? [testSchema.text(text)] : []);
}

describe('calculateWordCount', () => {
  it('should count words in a simple document', () => {
    const doc = createDoc(
      createAction('Hello world this is a test.')
    );
    expect(calculateWordCount(doc)).toBe(6);
  });

  it('should count words across multiple nodes', () => {
    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY'),
      createAction('John walks in.'),
      createCharacter('JOHN'),
      createDialogue('Hello there.')
    );
    // INT. OFFICE - DAY (4) + John walks in. (3) + JOHN (1) + Hello there. (2) = 10
    expect(calculateWordCount(doc)).toBe(10);
  });

  it('should return 0 for empty document', () => {
    const doc = createDoc(createAction(''));
    expect(calculateWordCount(doc)).toBe(0);
  });

  it('should handle multiple spaces correctly', () => {
    const doc = createDoc(
      createAction('Hello    world')
    );
    expect(calculateWordCount(doc)).toBe(2);
  });
});

describe('calculatePageCount', () => {
  it('should return at least 1 for any document', () => {
    const doc = createDoc(createAction('Hello'));
    expect(calculatePageCount(doc)).toBeGreaterThanOrEqual(1);
  });

  it('should estimate higher page count for longer documents', () => {
    const shortDoc = createDoc(createAction('Short text.'));
    const longDoc = createDoc(
      ...Array(100).fill(null).map(() =>
        createAction('This is a longer line of text that takes up more space in the document.')
      )
    );

    expect(calculatePageCount(longDoc)).toBeGreaterThan(calculatePageCount(shortDoc));
  });
});

describe('extractScenes', () => {
  it('should extract scenes with attributes', () => {
    const doc = createDoc(
      createSceneHeading('', {
        id: 'scene-1',
        type: 'INT',
        location: 'OFFICE',
        timeOfDay: 'DAY',
      }),
      createAction('Some action.'),
      createSceneHeading('', {
        id: 'scene-2',
        type: 'EXT',
        location: 'BEACH',
        timeOfDay: 'NIGHT',
      })
    );

    const scenes = extractScenes(doc);

    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toMatchObject({
      id: 'scene-1',
      type: 'INT',
      location: 'OFFICE',
      timeOfDay: 'DAY',
    });
    expect(scenes[1]).toMatchObject({
      id: 'scene-2',
      type: 'EXT',
      location: 'BEACH',
      timeOfDay: 'NIGHT',
    });
  });

  it('should parse scene heading text as fallback', () => {
    const doc = createDoc(
      createSceneHeading('INT. COFFEE SHOP - DAY'),
      createSceneHeading('EXT. BEACH - NIGHT')
    );

    const scenes = extractScenes(doc);

    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toMatchObject({
      type: 'INT',
      location: 'COFFEE SHOP',
      timeOfDay: 'DAY',
    });
    expect(scenes[1]).toMatchObject({
      type: 'EXT',
      location: 'BEACH',
      timeOfDay: 'NIGHT',
    });
  });

  it('should generate deterministic IDs when not provided', () => {
    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY')
    );

    const scenes1 = extractScenes(doc);
    const scenes2 = extractScenes(doc);

    expect(scenes1[0].id).toBe(scenes2[0].id);
    expect(scenes1[0].id).toMatch(/^scene-1-\d+-intofficeday$/);
  });

  it('should return empty array for document with no scenes', () => {
    const doc = createDoc(
      createAction('Just some action text.')
    );

    const scenes = extractScenes(doc);
    expect(scenes).toHaveLength(0);
  });

  it('should track scene positions', () => {
    const doc = createDoc(
      createAction('Some action.'),
      createSceneHeading('INT. OFFICE - DAY'),
      createAction('More action.')
    );

    const scenes = extractScenes(doc);
    expect(scenes[0].position).toBeGreaterThan(0);
  });
});

describe('extractCharacters', () => {
  it('should extract unique characters', () => {
    const doc = createDoc(
      createCharacter('JOHN'),
      createDialogue('Hello there.'),
      createCharacter('MARY'),
      createDialogue('Hi John.'),
      createCharacter('JOHN'),
      createDialogue('How are you?')
    );

    const characters = extractCharacters(doc);

    expect(characters).toHaveLength(2);
    expect(characters.find(c => c.name === 'JOHN')).toBeDefined();
    expect(characters.find(c => c.name === 'MARY')).toBeDefined();
  });

  it('should count dialogue occurrences', () => {
    const doc = createDoc(
      createCharacter('JOHN'),
      createDialogue('Line 1'),
      createCharacter('MARY'),
      createDialogue('Line 2'),
      createCharacter('JOHN'),
      createDialogue('Line 3'),
      createCharacter('JOHN'),
      createDialogue('Line 4')
    );

    const characters = extractCharacters(doc);
    const john = characters.find(c => c.name === 'JOHN');
    const mary = characters.find(c => c.name === 'MARY');

    expect(john?.dialogueCount).toBe(3);
    expect(mary?.dialogueCount).toBe(1);
  });

  it('should sort by dialogue count descending', () => {
    const doc = createDoc(
      createCharacter('JOHN'),
      createDialogue('1'),
      createCharacter('MARY'),
      createDialogue('2'),
      createCharacter('MARY'),
      createDialogue('3'),
      createCharacter('MARY'),
      createDialogue('4')
    );

    const characters = extractCharacters(doc);

    expect(characters[0].name).toBe('MARY');
    expect(characters[1].name).toBe('JOHN');
  });

  it('should strip parentheticals from character names', () => {
    const doc = createDoc(
      createCharacter('JOHN (V.O.)'),
      createDialogue('Voice over line.')
    );

    const characters = extractCharacters(doc);
    expect(characters[0].name).toBe('JOHN');
  });

  it('should return empty array for document with no characters', () => {
    const doc = createDoc(
      createAction('Just some action.')
    );

    const characters = extractCharacters(doc);
    expect(characters).toHaveLength(0);
  });

  it('should generate deterministic IDs', () => {
    const doc = createDoc(
      createCharacter('JOHN DOE')
    );

    const characters = extractCharacters(doc);
    expect(characters[0].id).toBe('john-doe');
  });
});
