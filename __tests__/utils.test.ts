import { describe, it, expect } from 'vitest'
import { cn, getInitials } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (classNames merger)', () => {
    it('should merge class names', () => {
      const result = cn('px-4', 'py-2')
      expect(result).toBe('px-4 py-2')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base', isActive && 'active')
      expect(result).toBe('base active')
    })

    it('should merge tailwind classes correctly', () => {
      // Later classes should override earlier ones
      const result = cn('px-4', 'px-8')
      expect(result).toBe('px-8')
    })

    it('should handle undefined and false values', () => {
      const result = cn('base', undefined, false, 'end')
      expect(result).toBe('base end')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['px-4', 'py-2'], 'mt-2')
      expect(result).toBe('px-4 py-2 mt-2')
    })
  })

  describe('getInitials', () => {
    it('should extract initials from two-word name', () => {
      expect(getInitials('John Doe')).toBe('JD')
    })

    it('should extract initials from single-word name', () => {
      expect(getInitials('Alice')).toBe('A')
    })

    it('should handle three or more words (default max 2)', () => {
      expect(getInitials('John Jacob Smith')).toBe('JJ')
    })

    it('should respect maxChars parameter', () => {
      expect(getInitials('John Jacob Smith', 3)).toBe('JJS')
    })

    it('should return ? for null input', () => {
      expect(getInitials(null)).toBe('?')
    })

    it('should return ? for undefined input', () => {
      expect(getInitials(undefined)).toBe('?')
    })

    it('should return ? for empty string', () => {
      expect(getInitials('')).toBe('?')
    })

    it('should handle consecutive spaces', () => {
      expect(getInitials('John    Doe')).toBe('JD')
    })

    it('should uppercase the result', () => {
      expect(getInitials('jane doe')).toBe('JD')
    })

    it('should handle single character names', () => {
      expect(getInitials('X')).toBe('X')
    })

    it('should handle whitespace-only input', () => {
      expect(getInitials('   ')).toBe('?')
    })
  })
})
