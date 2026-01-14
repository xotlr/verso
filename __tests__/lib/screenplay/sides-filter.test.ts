import { describe, it, expect } from 'vitest'
import {
  filterByCharacter,
  filterByScenes,
  extractCharactersFromJson,
  extractScenesFromJson,
} from '@/lib/screenplay/sides-filter'

// Helper to create mock ProseMirror document structure
function createMockDoc(content: object[]) {
  return {
    type: 'doc',
    content,
  }
}

function createSceneHeading(text: string, attrs: object = {}) {
  return {
    type: 'scene_heading',
    content: [{ type: 'text', text }],
    attrs,
  }
}

function createCharacter(name: string) {
  return {
    type: 'character',
    content: [{ type: 'text', text: name }],
  }
}

function createDialogue(text: string) {
  return {
    type: 'dialogue',
    content: [{ type: 'text', text }],
  }
}

function createAction(text: string) {
  return {
    type: 'action',
    content: [{ type: 'text', text }],
  }
}

describe('filterByCharacter', () => {
  it('should include scenes containing the target character', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('JOHN'),
      createDialogue('Hello'),
      createSceneHeading('EXT. PARK - NIGHT'),
      createCharacter('MARY'),
      createDialogue('Goodbye'),
    ])

    const result = filterByCharacter(doc, 'JOHN') as { content: object[] }

    // Should only include the first scene
    expect(result.content).toHaveLength(3) // heading + character + dialogue
    expect(result.content[0]).toEqual(createSceneHeading('INT. ROOM - DAY'))
  })

  it('should be case-insensitive for character names', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('JOHN'),
      createDialogue('Hello'),
    ])

    const result = filterByCharacter(doc, 'john') as { content: object[] }
    expect(result.content).toHaveLength(3)
  })

  it('should handle character names with extensions (V.O.)', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('JOHN (V.O.)'),
      createDialogue('Voiceover'),
    ])

    const result = filterByCharacter(doc, 'JOHN') as { content: object[] }
    expect(result.content).toHaveLength(3)
  })

  it('should handle character names with extensions (O.S.)', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('SARAH (O.S.)'),
      createDialogue('Off screen'),
    ])

    const result = filterByCharacter(doc, 'SARAH') as { content: object[] }
    expect(result.content).toHaveLength(3)
  })

  it('should include all content within a scene containing the character', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createAction('The room is dark.'),
      createCharacter('JOHN'),
      createDialogue('Hello'),
      createAction('He stands up.'),
      createCharacter('MARY'),
      createDialogue('Hi there'),
    ])

    const result = filterByCharacter(doc, 'JOHN') as { content: object[] }
    // Should include entire scene: heading + all 6 elements
    expect(result.content).toHaveLength(7)
  })

  it('should exclude scenes without the target character', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('MARY'),
      createDialogue('Hello'),
      createSceneHeading('EXT. PARK - NIGHT'),
      createCharacter('BOB'),
      createDialogue('Goodbye'),
    ])

    const result = filterByCharacter(doc, 'JOHN') as { content: object[] }
    expect(result.content).toHaveLength(0)
  })

  it('should handle null/undefined document', () => {
    const result1 = filterByCharacter(null, 'JOHN')
    const result2 = filterByCharacter(undefined, 'JOHN')

    expect(result1).toBeNull()
    expect(result2).toBeUndefined()
  })

  it('should handle document with no content', () => {
    const doc = { type: 'doc' }
    const result = filterByCharacter(doc, 'JOHN')
    expect(result).toEqual(doc)
  })

  it('should handle multiple scenes with same character', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('JOHN'),
      createDialogue('Scene 1'),
      createSceneHeading('EXT. PARK - NIGHT'),
      createCharacter('MARY'),
      createDialogue('Scene 2'),
      createSceneHeading('INT. OFFICE - DAY'),
      createCharacter('JOHN'),
      createDialogue('Scene 3'),
    ])

    const result = filterByCharacter(doc, 'JOHN') as { content: object[] }
    // Should include scenes 1 and 3
    const sceneHeadings = result.content.filter((n: { type: string }) => n.type === 'scene_heading')
    expect(sceneHeadings).toHaveLength(2)
  })
})

describe('filterByScenes', () => {
  it('should include scenes by ID', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { id: 'scene-1' }),
      createAction('Action 1'),
      createSceneHeading('EXT. PARK - NIGHT', { id: 'scene-2' }),
      createAction('Action 2'),
    ])

    const result = filterByScenes(doc, ['scene-1']) as { content: object[] }
    expect(result.content).toHaveLength(2) // heading + action
  })

  it('should include scenes by scene number', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { sceneNumber: '1' }),
      createAction('Action 1'),
      createSceneHeading('EXT. PARK - NIGHT', { sceneNumber: '2' }),
      createAction('Action 2'),
    ])

    const result = filterByScenes(doc, ['2']) as { content: object[] }
    expect(result.content).toHaveLength(2)
  })

  it('should include scenes by index', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createAction('Action 1'),
      createSceneHeading('EXT. PARK - NIGHT'),
      createAction('Action 2'),
      createSceneHeading('INT. OFFICE - DAY'),
      createAction('Action 3'),
    ])

    const result = filterByScenes(doc, ['2']) as { content: object[] }
    // Second scene: heading + action
    expect(result.content).toHaveLength(2)
  })

  it('should handle multiple scene IDs', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { id: 'scene-1' }),
      createAction('Action 1'),
      createSceneHeading('EXT. PARK - NIGHT', { id: 'scene-2' }),
      createAction('Action 2'),
      createSceneHeading('INT. OFFICE - DAY', { id: 'scene-3' }),
      createAction('Action 3'),
    ])

    const result = filterByScenes(doc, ['scene-1', 'scene-3']) as { content: object[] }
    expect(result.content).toHaveLength(4) // 2 scenes x 2 elements each
  })

  it('should be case-insensitive for IDs', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { id: 'Scene-1' }),
      createAction('Action'),
    ])

    const result = filterByScenes(doc, ['scene-1']) as { content: object[] }
    expect(result.content).toHaveLength(2)
  })

  it('should handle null/undefined document', () => {
    expect(filterByScenes(null, ['1'])).toBeNull()
    expect(filterByScenes(undefined, ['1'])).toBeUndefined()
  })

  it('should handle document with no content', () => {
    const doc = { type: 'doc' }
    const result = filterByScenes(doc, ['1'])
    expect(result).toEqual(doc)
  })

  it('should return empty content when no scenes match', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { id: 'scene-1' }),
      createAction('Action'),
    ])

    const result = filterByScenes(doc, ['scene-99']) as { content: object[] }
    expect(result.content).toHaveLength(0)
  })

  it('should handle empty scene IDs array', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createAction('Action'),
    ])

    const result = filterByScenes(doc, []) as { content: object[] }
    expect(result.content).toHaveLength(0)
  })
})

describe('extractCharactersFromJson', () => {
  it('should extract characters and count dialogue', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createCharacter('JOHN'),
      createDialogue('Line 1'),
      createCharacter('JOHN'),
      createDialogue('Line 2'),
      createCharacter('MARY'),
      createDialogue('Line 3'),
    ])

    const characters = extractCharactersFromJson(doc)

    expect(characters).toHaveLength(2)
    expect(characters[0].name).toBe('JOHN')
    expect(characters[0].dialogueCount).toBe(2)
    expect(characters[1].name).toBe('MARY')
    expect(characters[1].dialogueCount).toBe(1)
  })

  it('should sort by dialogue count descending', () => {
    const doc = createMockDoc([
      createCharacter('ALICE'),
      createCharacter('BOB'),
      createCharacter('BOB'),
      createCharacter('BOB'),
      createCharacter('ALICE'),
    ])

    const characters = extractCharactersFromJson(doc)

    expect(characters[0].name).toBe('BOB')
    expect(characters[0].dialogueCount).toBe(3)
    expect(characters[1].name).toBe('ALICE')
    expect(characters[1].dialogueCount).toBe(2)
  })

  it('should normalize character names with extensions', () => {
    const doc = createMockDoc([
      createCharacter('JOHN'),
      createCharacter('JOHN (V.O.)'),
      createCharacter('JOHN (O.S.)'),
    ])

    const characters = extractCharactersFromJson(doc)

    expect(characters).toHaveLength(1)
    expect(characters[0].name).toBe('JOHN')
    expect(characters[0].dialogueCount).toBe(3)
  })

  it('should handle null/undefined document', () => {
    expect(extractCharactersFromJson(null)).toEqual([])
    expect(extractCharactersFromJson(undefined)).toEqual([])
  })

  it('should handle document with no characters', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createAction('Just action'),
    ])

    const characters = extractCharactersFromJson(doc)
    expect(characters).toHaveLength(0)
  })

  it('should handle nested content structures', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'wrapper',
          content: [createCharacter('NESTED')],
        },
      ],
    }

    const characters = extractCharactersFromJson(doc)
    expect(characters).toHaveLength(1)
    expect(characters[0].name).toBe('NESTED')
  })
})

describe('extractScenesFromJson', () => {
  it('should extract scenes with headings', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createAction('Action'),
      createSceneHeading('EXT. PARK - NIGHT'),
      createAction('More action'),
    ])

    const scenes = extractScenesFromJson(doc)

    expect(scenes).toHaveLength(2)
    expect(scenes[0].heading).toBe('INT. ROOM - DAY')
    expect(scenes[1].heading).toBe('EXT. PARK - NIGHT')
  })

  it('should generate deterministic IDs', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY'),
      createSceneHeading('EXT. PARK - NIGHT'),
    ])

    const scenes = extractScenesFromJson(doc)

    expect(scenes[0].id).toMatch(/^scene-1-/)
    expect(scenes[1].id).toMatch(/^scene-2-/)
  })

  it('should use scene number from attrs', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { sceneNumber: '1A' }),
    ])

    const scenes = extractScenesFromJson(doc)
    expect(scenes[0].number).toBe('1A')
  })

  it('should use id from attrs if available', () => {
    const doc = createMockDoc([
      createSceneHeading('INT. ROOM - DAY', { id: 'custom-id' }),
    ])

    const scenes = extractScenesFromJson(doc)
    expect(scenes[0].id).toBe('custom-id')
  })

  it('should handle null/undefined document', () => {
    expect(extractScenesFromJson(null)).toEqual([])
    expect(extractScenesFromJson(undefined)).toEqual([])
  })

  it('should handle document with no scenes', () => {
    const doc = createMockDoc([createAction('Just action')])

    const scenes = extractScenesFromJson(doc)
    expect(scenes).toHaveLength(0)
  })

  it('should provide default heading for empty scene', () => {
    const doc = createMockDoc([
      { type: 'scene_heading', content: [] },
    ])

    const scenes = extractScenesFromJson(doc)
    expect(scenes[0].heading).toMatch(/Scene \d+/)
  })

  it('should handle scene heading with text directly', () => {
    const doc = createMockDoc([
      { type: 'scene_heading', text: 'INT. DIRECT TEXT - DAY' },
    ])

    const scenes = extractScenesFromJson(doc)
    expect(scenes[0].heading).toBe('INT. DIRECT TEXT - DAY')
  })
})
