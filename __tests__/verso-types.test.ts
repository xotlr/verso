import { describe, it, expect } from 'vitest'
import type {
  PageIdentifier,
  ElementType,
  PageConfig,
  Element,
} from '@/lib/verso/types'

describe('Verso Types', () => {
  describe('Type Definitions', () => {
    it('should allow creating valid Element objects', () => {
      const element: Element = {
        id: 'test-1',
        element_type: 'action',
        content: 'The hero walks into the room.',
      }
      expect(element.id).toBe('test-1')
      expect(element.element_type).toBe('action')
    })

    it('should allow creating Element with optional fields', () => {
      const dialogue: Element = {
        id: 'test-2',
        element_type: 'dialogue',
        content: 'Hello, world!',
        character_name: 'JOHN',
      }
      expect(dialogue.character_name).toBe('JOHN')
    })

    it('should allow creating PageIdentifier types', () => {
      const sequential: PageIdentifier = { type: 'Sequential', value: 1 }
      expect(sequential.type).toBe('Sequential')
      expect(sequential.value).toBe(1)

      const inserted: PageIdentifier = { type: 'Inserted', value: { base: 47, suffix: 'A' } }
      expect(inserted.type).toBe('Inserted')

      const omitted: PageIdentifier = { type: 'Omitted', value: 5 }
      expect(omitted.type).toBe('Omitted')
    })
  })

  describe('ElementType', () => {
    it('should include all screenplay element types', () => {
      const elementTypes: ElementType[] = [
        'scene_heading',
        'action',
        'character',
        'dialogue',
        'parenthetical',
        'transition',
        'shot',
        'dual_dialogue_left',
        'dual_dialogue_right',
        'act_break',
        'page_break',
        'blank_line',
      ]

      // TypeScript will error if any of these are invalid
      expect(elementTypes).toHaveLength(12)
    })
  })
})
