import { describe, it, expect } from 'vitest'
import {
  validateUsername,
  normalizeUsername,
  generateUsernameSuggestions,
  RESERVED_USERNAMES,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '@/lib/username'

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('should accept a simple lowercase username', () => {
      expect(validateUsername('johnsmith')).toEqual({ valid: true })
    })

    it('should accept username with numbers', () => {
      expect(validateUsername('john123')).toEqual({ valid: true })
    })

    it('should accept username with underscore between words', () => {
      expect(validateUsername('john_smith')).toEqual({ valid: true })
    })

    it('should accept username with multiple underscores (not consecutive)', () => {
      expect(validateUsername('john_doe_writer')).toEqual({ valid: true })
    })

    it('should accept minimum length username', () => {
      expect(validateUsername('abc')).toEqual({ valid: true })
    })

    it('should accept maximum length username', () => {
      const maxUsername = 'a'.repeat(USERNAME_MAX_LENGTH)
      expect(validateUsername(maxUsername)).toEqual({ valid: true })
    })

    it('should normalize uppercase to lowercase', () => {
      expect(validateUsername('JohnSmith')).toEqual({ valid: true })
    })

    it('should trim whitespace', () => {
      expect(validateUsername('  johnsmith  ')).toEqual({ valid: true })
    })
  })

  describe('length validation', () => {
    it('should reject username shorter than minimum length', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least')
      expect(result.error).toContain(String(USERNAME_MIN_LENGTH))
    })

    it('should reject empty username', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least')
    })

    it('should reject username longer than maximum length', () => {
      const longUsername = 'a'.repeat(USERNAME_MAX_LENGTH + 1)
      const result = validateUsername(longUsername)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at most')
      expect(result.error).toContain(String(USERNAME_MAX_LENGTH))
    })
  })

  describe('underscore rules', () => {
    it('should reject username starting with underscore', () => {
      const result = validateUsername('_johnsmith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username cannot start with an underscore')
    })

    it('should reject username ending with underscore', () => {
      const result = validateUsername('johnsmith_')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username cannot end with an underscore')
    })

    it('should reject username with consecutive underscores', () => {
      const result = validateUsername('john__smith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username cannot have consecutive underscores')
    })

    it('should reject username with multiple consecutive underscores', () => {
      const result = validateUsername('john___smith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username cannot have consecutive underscores')
    })
  })

  describe('character restrictions', () => {
    it('should reject username with special characters', () => {
      const result = validateUsername('john@smith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username with hyphen', () => {
      const result = validateUsername('john-smith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username with period', () => {
      const result = validateUsername('john.smith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username with spaces', () => {
      const result = validateUsername('john smith')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username starting with number', () => {
      const result = validateUsername('123john')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username must start with a letter')
    })

    it('should reject username with unicode characters', () => {
      const result = validateUsername('jöhn')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username with emoji', () => {
      const result = validateUsername('john🎬')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Username can only contain letters, numbers, and underscores')
    })
  })

  describe('reserved usernames', () => {
    it('should reject app route names', () => {
      expect(validateUsername('home').valid).toBe(false)
      expect(validateUsername('home').error).toBe('This username is not available')
      expect(validateUsername('explore').valid).toBe(false)
      expect(validateUsername('settings').valid).toBe(false)
      expect(validateUsername('profile').valid).toBe(false)
      expect(validateUsername('api').valid).toBe(false)
    })

    it('should reject admin-related names', () => {
      expect(validateUsername('admin').valid).toBe(false)
      expect(validateUsername('administrator').valid).toBe(false)
      expect(validateUsername('moderator').valid).toBe(false)
      expect(validateUsername('support').valid).toBe(false)
    })

    it('should reject brand-related names', () => {
      expect(validateUsername('verso').valid).toBe(false)
      expect(validateUsername('versoapp').valid).toBe(false)
      expect(validateUsername('official').valid).toBe(false)
      expect(validateUsername('team').valid).toBe(false)
    })

    it('should reject auth-related names', () => {
      expect(validateUsername('login').valid).toBe(false)
      expect(validateUsername('logout').valid).toBe(false)
      expect(validateUsername('signup').valid).toBe(false)
      expect(validateUsername('register').valid).toBe(false)
    })

    it('should reject reserved words case-insensitively', () => {
      expect(validateUsername('ADMIN').valid).toBe(false)
      expect(validateUsername('Admin').valid).toBe(false)
      expect(validateUsername('aDmIn').valid).toBe(false)
    })

    it('should have all expected reserved words', () => {
      expect(RESERVED_USERNAMES.has('null')).toBe(true)
      expect(RESERVED_USERNAMES.has('undefined')).toBe(true)
      expect(RESERVED_USERNAMES.has('anonymous')).toBe(true)
      expect(RESERVED_USERNAMES.has('test')).toBe(true)
    })
  })
})

describe('normalizeUsername', () => {
  it('should convert to lowercase', () => {
    expect(normalizeUsername('JohnSmith')).toBe('johnsmith')
  })

  it('should trim whitespace', () => {
    expect(normalizeUsername('  johnsmith  ')).toBe('johnsmith')
  })

  it('should handle mixed case and whitespace', () => {
    expect(normalizeUsername('  JoHn_SmItH  ')).toBe('john_smith')
  })

  it('should handle empty string', () => {
    expect(normalizeUsername('')).toBe('')
  })

  it('should handle already normalized username', () => {
    expect(normalizeUsername('johnsmith')).toBe('johnsmith')
  })
})

describe('generateUsernameSuggestions', () => {
  describe('basic suggestions', () => {
    it('should generate suggestions from full name', () => {
      const suggestions = generateUsernameSuggestions('John Doe')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions).toContain('john_doe')
      expect(suggestions).toContain('johndoe')
    })

    it('should generate suggestions with numbers', () => {
      const suggestions = generateUsernameSuggestions('John Doe')
      const hasNumbered = suggestions.some((s) => /\d$/.test(s))
      expect(hasNumbered).toBe(true)
    })

    it('should include firstname-only suggestion when valid', () => {
      const suggestions = generateUsernameSuggestions('Jonathan Doe')
      expect(suggestions).toContain('jonathan')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const suggestions = generateUsernameSuggestions('')
      expect(suggestions).toEqual([])
    })

    it('should handle whitespace-only string', () => {
      const suggestions = generateUsernameSuggestions('   ')
      expect(suggestions).toEqual([])
    })

    it('should handle name with special characters', () => {
      const suggestions = generateUsernameSuggestions("O'Connor Smith")
      expect(suggestions.length).toBeGreaterThan(0)
      // Special chars should be stripped
      suggestions.forEach((s) => {
        expect(s).toMatch(/^[a-z][a-z0-9_]*$/)
      })
    })

    it('should handle single short name', () => {
      const suggestions = generateUsernameSuggestions('Jo')
      // "jo" is too short for firstname, but jo_1 etc might work
      suggestions.forEach((s) => {
        expect(validateUsername(s).valid).toBe(true)
      })
    })

    it('should handle names with numbers', () => {
      const suggestions = generateUsernameSuggestions('John 3rd Doe')
      suggestions.forEach((s) => {
        expect(validateUsername(s).valid).toBe(true)
      })
    })
  })

  describe('suggestion validity', () => {
    it('should only return valid usernames', () => {
      const suggestions = generateUsernameSuggestions('Test User')
      // "test" is reserved, should not appear alone
      suggestions.forEach((s) => {
        expect(validateUsername(s).valid).toBe(true)
      })
    })

    it('should return maximum 5 suggestions', () => {
      const suggestions = generateUsernameSuggestions('John Alexander Smith Jr')
      expect(suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should not return duplicate suggestions', () => {
      const suggestions = generateUsernameSuggestions('John Doe')
      const unique = new Set(suggestions)
      expect(unique.size).toBe(suggestions.length)
    })
  })

  describe('name normalization', () => {
    it('should handle uppercase names', () => {
      const suggestions = generateUsernameSuggestions('JOHN DOE')
      expect(suggestions).toContain('john_doe')
    })

    it('should handle mixed case', () => {
      const suggestions = generateUsernameSuggestions('jOhN dOe')
      expect(suggestions).toContain('john_doe')
    })

    it('should handle extra whitespace', () => {
      const suggestions = generateUsernameSuggestions('John   Doe')
      expect(suggestions).toContain('john_doe')
    })
  })
})
