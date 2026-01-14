import { describe, it, expect } from 'vitest'
import {
  parseScreenplayText,
  getCharacterScenePresence,
  getSceneConnections,
  generateCharacterColor,
  generateLocationColor,
  CHARACTER_COLORS,
  LOCATION_COLORS,
} from '@/lib/screenplay/utils'
import type { Screenplay, Scene } from '@/types/screenplay'

describe('generateCharacterColor', () => {
  it('should return a color from the palette', () => {
    const color = generateCharacterColor(0)
    expect(CHARACTER_COLORS).toContain(color)
  })

  it('should cycle through colors', () => {
    const colors = Array(CHARACTER_COLORS.length + 2)
      .fill(null)
      .map((_, i) => generateCharacterColor(i))

    // Should wrap around
    expect(colors[0]).toBe(colors[CHARACTER_COLORS.length])
  })

  it('should handle large indices', () => {
    const color = generateCharacterColor(1000)
    expect(CHARACTER_COLORS).toContain(color)
  })
})

describe('generateLocationColor', () => {
  it('should return a color from the palette', () => {
    const color = generateLocationColor(0)
    expect(LOCATION_COLORS).toContain(color)
  })

  it('should cycle through colors', () => {
    const colors = Array(LOCATION_COLORS.length + 2)
      .fill(null)
      .map((_, i) => generateLocationColor(i))

    expect(colors[0]).toBe(colors[LOCATION_COLORS.length])
  })
})

describe('parseScreenplayText', () => {
  describe('scene heading detection', () => {
    it('should detect INT. scene headings', () => {
      const result = parseScreenplayText('INT. COFFEE SHOP - DAY')
      expect(result.scenes).toHaveLength(1)
      expect(result.scenes![0].heading).toBe('INT. COFFEE SHOP - DAY')
    })

    it('should detect EXT. scene headings', () => {
      const result = parseScreenplayText('EXT. PARK - NIGHT')
      expect(result.scenes).toHaveLength(1)
      expect(result.scenes![0].heading).toBe('EXT. PARK - NIGHT')
    })

    it('should detect INT/EXT. scene headings', () => {
      const result = parseScreenplayText('INT/EXT. CAR - DAY')
      expect(result.scenes).toHaveLength(1)
      expect(result.locations).toHaveLength(1)
      expect(result.locations![0].type).toBe('INT/EXT')
    })

    it('should detect I/E. scene headings', () => {
      const result = parseScreenplayText('I/E. DOORWAY - NIGHT')
      expect(result.scenes).toHaveLength(1)
    })

    it('should handle multiple scenes', () => {
      const text = `INT. OFFICE - DAY

Some action here.

EXT. STREET - NIGHT

More action.`
      const result = parseScreenplayText(text)
      expect(result.scenes).toHaveLength(2)
    })

    it('should extract location name correctly', () => {
      const result = parseScreenplayText('INT. THE BIG HOUSE - DUSK')
      expect(result.locations![0].name).toBe('THE BIG HOUSE')
    })

    it('should default time of day to DAY when not specified', () => {
      const result = parseScreenplayText('INT. ROOM')
      expect(result.scenes![0].timeOfDay).toBe('DAY')
    })
  })

  describe('character detection', () => {
    it('should detect character names', () => {
      const text = `INT. ROOM - DAY

JOHN
Hello there.`
      const result = parseScreenplayText(text)
      expect(result.characters).toHaveLength(1)
      expect(result.characters![0].name).toBe('JOHN')
    })

    // Note: The parser excludes lines with periods from character detection
    // to avoid matching transitions like "CUT TO:". This means extensions
    // containing periods (V.O., O.S.) are not recognized as character names.
    // This is a known limitation of the simple parser.
    it('should handle character extensions without periods', () => {
      const text = `INT. ROOM - DAY

JANE (CONT'D)
Continuing my thought.`
      const result = parseScreenplayText(text)
      expect(result.characters).toHaveLength(1)
      expect(result.characters![0].name).toBe('JANE')
    })

    it('should recognize character names without extensions', () => {
      const text = `INT. ROOM - DAY

SARAH
This is dialogue.

MIKE
More dialogue.`
      const result = parseScreenplayText(text)
      expect(result.characters).toHaveLength(2)
      expect(result.characters!.map(c => c.name)).toContain('SARAH')
      expect(result.characters!.map(c => c.name)).toContain('MIKE')
    })

    it('should not confuse transitions with characters', () => {
      const text = `INT. ROOM - DAY

Action here.

CUT TO:

EXT. GARDEN - DAY`
      const result = parseScreenplayText(text)
      expect(result.characters).toHaveLength(0)
    })

    it('should track characters per scene', () => {
      const text = `INT. ROOM - DAY

JOHN
Hello.

MARY
Hi there.

EXT. STREET - NIGHT

BOB
Goodnight.`
      const result = parseScreenplayText(text)
      expect(result.scenes![0].characters).toContain('john')
      expect(result.scenes![0].characters).toContain('mary')
      expect(result.scenes![1].characters).toContain('bob')
      expect(result.scenes![1].characters).not.toContain('john')
    })
  })

  describe('element types', () => {
    it('should detect dialogue', () => {
      const text = `INT. ROOM - DAY

JOHN
This is dialogue.`
      const result = parseScreenplayText(text)
      const dialogueElements = result.scenes![0].elements.filter((e) => e.type === 'dialogue')
      expect(dialogueElements).toHaveLength(1)
      expect(dialogueElements[0].content).toBe('This is dialogue.')
    })

    it('should detect parentheticals', () => {
      const text = `INT. ROOM - DAY

JOHN
(whispering)
Hello.`
      const result = parseScreenplayText(text)
      const parentheticals = result.scenes![0].elements.filter((e) => e.type === 'parenthetical')
      expect(parentheticals).toHaveLength(1)
      expect(parentheticals[0].content).toBe('(whispering)')
    })

    it('should detect action lines', () => {
      const text = `INT. ROOM - DAY

John walks across the room.`
      const result = parseScreenplayText(text)
      const actions = result.scenes![0].elements.filter((e) => e.type === 'action')
      expect(actions).toHaveLength(1)
    })

    it('should detect transitions', () => {
      const text = `INT. ROOM - DAY

Action.

FADE OUT:`
      const result = parseScreenplayText(text)
      const transitions = result.scenes![0].elements.filter((e) => e.type === 'transition')
      expect(transitions).toHaveLength(1)
    })

    it('should detect various transition types', () => {
      const transitions = ['CUT TO:', 'DISSOLVE TO:', 'MATCH CUT TO:', 'SMASH CUT TO:', 'FREEZE FRAME:']
      for (const transition of transitions) {
        const text = `INT. ROOM - DAY

${transition}`
        const result = parseScreenplayText(text)
        const found = result.scenes![0].elements.filter((e) => e.type === 'transition')
        expect(found.length).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('location tracking', () => {
    it('should extract unique locations', () => {
      const text = `INT. OFFICE - DAY

Action.

EXT. PARK - NIGHT

Action.

INT. OFFICE - NIGHT`
      const result = parseScreenplayText(text)
      // OFFICE appears twice but should only be one location
      expect(result.locations).toHaveLength(2)
    })

    it('should assign location type correctly', () => {
      const text = `INT. HOUSE - DAY

EXT. GARDEN - DAY

INT/EXT. CAR - DAY`
      const result = parseScreenplayText(text)
      const types = result.locations!.map((l) => l.type)
      expect(types).toContain('INT')
      expect(types).toContain('EXT')
      expect(types).toContain('INT/EXT')
    })
  })

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = parseScreenplayText('')
      expect(result.scenes).toHaveLength(0)
      expect(result.characters).toHaveLength(0)
      expect(result.locations).toHaveLength(0)
    })

    it('should handle text with no scene headings', () => {
      const result = parseScreenplayText('Just some random text\nwith no screenplay elements.')
      expect(result.scenes).toHaveLength(0)
    })

    it('should preserve original formatting in action lines', () => {
      const text = `INT. ROOM - DAY

    Indented action line.`
      const result = parseScreenplayText(text)
      const action = result.scenes![0].elements.find((e) => e.type === 'action')
      expect(action?.content).toContain('Indented')
    })

    it('should handle lowercase scene headings', () => {
      const result = parseScreenplayText('int. room - day')
      expect(result.scenes).toHaveLength(1)
    })

    it('should handle scene headings with mixed case', () => {
      const result = parseScreenplayText('Int. Room - Day')
      expect(result.scenes).toHaveLength(1)
    })
  })
})

describe('getCharacterScenePresence', () => {
  it('should map characters to their scene numbers', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [
        { id: 's1', number: 1, heading: '', characters: ['john', 'mary'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
        { id: 's2', number: 2, heading: '', characters: ['john', 'bob'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
        { id: 's3', number: 3, heading: '', characters: ['mary'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
      ],
      characters: [],
      locations: [],
    }

    const presence = getCharacterScenePresence(screenplay)

    expect(presence.get('john')).toEqual(new Set([1, 2]))
    expect(presence.get('mary')).toEqual(new Set([1, 3]))
    expect(presence.get('bob')).toEqual(new Set([2]))
  })

  it('should handle empty scenes array', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [],
      characters: [],
      locations: [],
    }

    const presence = getCharacterScenePresence(screenplay)
    expect(presence.size).toBe(0)
  })

  it('should handle scenes with no characters', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [
        { id: 's1', number: 1, heading: '', characters: [], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
      ],
      characters: [],
      locations: [],
    }

    const presence = getCharacterScenePresence(screenplay)
    expect(presence.size).toBe(0)
  })
})

describe('getSceneConnections', () => {
  it('should find connections between consecutive scenes with shared characters', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [
        { id: 's1', number: 1, heading: '', characters: ['john', 'mary'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
        { id: 's2', number: 2, heading: '', characters: ['john', 'bob'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
        { id: 's3', number: 3, heading: '', characters: ['bob', 'alice'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
      ],
      characters: [],
      locations: [],
    }

    const connections = getSceneConnections(screenplay)

    expect(connections).toHaveLength(2)
    expect(connections[0]).toEqual({ from: 1, to: 2, characters: ['john'] })
    expect(connections[1]).toEqual({ from: 2, to: 3, characters: ['bob'] })
  })

  it('should return empty array when no shared characters', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [
        { id: 's1', number: 1, heading: '', characters: ['john'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
        { id: 's2', number: 2, heading: '', characters: ['mary'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
      ],
      characters: [],
      locations: [],
    }

    const connections = getSceneConnections(screenplay)
    expect(connections).toHaveLength(0)
  })

  it('should handle single scene', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [
        { id: 's1', number: 1, heading: '', characters: ['john'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
      ],
      characters: [],
      locations: [],
    }

    const connections = getSceneConnections(screenplay)
    expect(connections).toHaveLength(0)
  })

  it('should handle empty scenes', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [],
      characters: [],
      locations: [],
    }

    const connections = getSceneConnections(screenplay)
    expect(connections).toHaveLength(0)
  })

  it('should include multiple shared characters', () => {
    const screenplay: Screenplay = {
      id: 'test',
      title: 'Test',
      scenes: [
        { id: 's1', number: 1, heading: '', characters: ['john', 'mary', 'bob'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
        { id: 's2', number: 2, heading: '', characters: ['john', 'mary', 'alice'], elements: [], location: { id: 'l1', name: 'Room', type: 'INT', color: '#fff' }, timeOfDay: 'DAY' },
      ],
      characters: [],
      locations: [],
    }

    const connections = getSceneConnections(screenplay)
    expect(connections[0].characters).toContain('john')
    expect(connections[0].characters).toContain('mary')
    expect(connections[0].characters).toHaveLength(2)
  })
})
