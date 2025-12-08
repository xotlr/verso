import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

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
})
