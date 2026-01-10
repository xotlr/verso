import { describe, it, expect } from 'vitest';
import { Schema, Node as ProseMirrorNode } from 'prosemirror-model';
import {
  calculateWordCount,
  calculatePageCount,
  extractScenes,
  extractCharacters,
  extractShots,
  extractDetectedShotsFromDocument,
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
    shot: {
      content: 'text*',
      group: 'block',
      attrs: {
        shotType: { default: null },
        subject: { default: null },
        linkedShotId: { default: null },
      },
      toDOM: () => ['div', { class: 'shot' }, 0],
      parseDOM: [{ tag: 'div.shot' }],
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

function createShot(
  text: string,
  attrs: { shotType?: string; subject?: string; linkedShotId?: string } = {}
): ProseMirrorNode {
  return testSchema.node(
    'shot',
    {
      shotType: attrs.shotType || null,
      subject: attrs.subject || null,
      linkedShotId: attrs.linkedShotId || null,
    },
    text ? [testSchema.text(text)] : []
  );
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
  it('should extract scenes from text content', () => {
    // extractScenes parses text content as the source of truth
    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY', { id: 'scene-1' }),
      createAction('Some action.'),
      createSceneHeading('EXT. BEACH - NIGHT', { id: 'scene-2' })
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

describe('extractScenes - edge cases', () => {
  it('should handle scene heading without INT/EXT pattern', () => {
    const doc = createDoc(
      createSceneHeading('LATER THAT NIGHT')
    );

    const scenes = extractScenes(doc);
    expect(scenes).toHaveLength(1);
    // Should fall back to INT as default type when pattern doesn't match
    expect(scenes[0].type).toBe('INT');
    expect(scenes[0].location).toBe('LATER THAT NIGHT');
  });

  it('should handle empty scene heading', () => {
    const doc = createDoc(
      createSceneHeading('')
    );

    const scenes = extractScenes(doc);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].type).toBe('INT');
    // Empty scene heading results in empty location (attrs.location is empty)
    expect(scenes[0].location).toBe('');
  });
});

describe('extractShots', () => {
  it('should extract shots with attributes', () => {
    const scenes = [
      { id: 'scene-1', type: 'INT', location: 'OFFICE', position: 0 },
    ];

    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY'),
      createShot('Close-up of document', { shotType: 'CLOSE-UP', subject: 'document' })
    );

    const shots = extractShots(doc, scenes as any);

    expect(shots).toHaveLength(1);
    expect(shots[0].shotType).toBe('CLOSE-UP');
    expect(shots[0].subject).toBe('document');
    expect(shots[0].sceneId).toBe('scene-1');
  });

  it('should associate shots with correct scenes', () => {
    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY', { id: 'scene-1' }),
      createShot('First shot'),
      createSceneHeading('EXT. STREET - NIGHT', { id: 'scene-2' }),
      createShot('Second shot')
    );

    const scenes = extractScenes(doc);
    const shots = extractShots(doc, scenes);

    expect(shots).toHaveLength(2);
    expect(shots[0].sceneId).toBe('scene-1');
    expect(shots[1].sceneId).toBe('scene-2');
  });

  it('should return empty array when no shots exist', () => {
    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY'),
      createAction('No shots here.')
    );

    const scenes = extractScenes(doc);
    const shots = extractShots(doc, scenes);

    expect(shots).toHaveLength(0);
  });

  it('should handle shots before any scene', () => {
    const doc = createDoc(
      createShot('Orphan shot'),
      createSceneHeading('INT. OFFICE - DAY')
    );

    const scenes = extractScenes(doc);
    const shots = extractShots(doc, scenes);

    expect(shots).toHaveLength(1);
    expect(shots[0].sceneId).toBeNull();
  });

  it('should generate deterministic IDs', () => {
    const doc = createDoc(
      createShot('Test shot')
    );

    const shots1 = extractShots(doc, []);
    const shots2 = extractShots(doc, []);

    expect(shots1[0].id).toBe(shots2[0].id);
    expect(shots1[0].id).toMatch(/^shot-\d+-\d+-\w+$/);
  });

  it('should handle linked shots', () => {
    const doc = createDoc(
      createShot('First shot', { linkedShotId: 'linked-123' })
    );

    const shots = extractShots(doc, []);

    expect(shots[0].linkedShotId).toBe('linked-123');
  });
});

describe('extractDetectedShotsFromDocument', () => {
  it('should detect shot patterns in action text', () => {
    const doc = createDoc(
      createSceneHeading('INT. OFFICE - DAY', { id: 'scene-1' }),
      createAction('CLOSE-UP: A hand reaches for the phone.')
    );

    const scenes = extractScenes(doc);
    const detected = extractDetectedShotsFromDocument(doc, scenes);

    expect(detected).toHaveLength(1);
    expect(detected[0].shotType).toBe('CLOSE_UP');
    expect(detected[0].sceneId).toBe('scene-1');
  });

  it('should detect wide shot patterns', () => {
    const doc = createDoc(
      createSceneHeading('EXT. BEACH - DAY', { id: 'scene-1' }),
      createAction('WIDE SHOT: The beach stretches to the horizon.')
    );

    const scenes = extractScenes(doc);
    const detected = extractDetectedShotsFromDocument(doc, scenes);

    expect(detected).toHaveLength(1);
    expect(detected[0].shotType).toBe('WIDE');
  });

  it('should skip empty lines', () => {
    const doc = createDoc(
      createAction(''),
      createAction('Normal action text.')
    );

    const detected = extractDetectedShotsFromDocument(doc, []);

    expect(detected).toHaveLength(0);
  });

  it('should not detect non-shot text', () => {
    const doc = createDoc(
      createAction('John walks into the room.'),
      createDialogue('Hello everyone.')
    );

    const detected = extractDetectedShotsFromDocument(doc, []);

    expect(detected).toHaveLength(0);
  });

  it('should generate unique IDs for detected shots', () => {
    const doc = createDoc(
      createAction('CLOSE-UP: First shot'),
      createAction('CLOSE-UP: Second shot')
    );

    const detected = extractDetectedShotsFromDocument(doc, []);

    expect(detected).toHaveLength(2);
    expect(detected[0].id).not.toBe(detected[1].id);
  });

  it('should track line numbers', () => {
    const doc = createDoc(
      createAction('Normal line'),
      createAction('POV: Looking through the window')
    );

    const detected = extractDetectedShotsFromDocument(doc, []);

    expect(detected).toHaveLength(1);
    expect(detected[0].lineNumber).toBe(2);
  });

  it('should handle shots before any scene', () => {
    const doc = createDoc(
      createAction('ESTABLISHING SHOT: City skyline'),
      createSceneHeading('INT. OFFICE - DAY')
    );

    const scenes = extractScenes(doc);
    const detected = extractDetectedShotsFromDocument(doc, scenes);

    expect(detected).toHaveLength(1);
    expect(detected[0].sceneId).toBeNull();
  });
});
