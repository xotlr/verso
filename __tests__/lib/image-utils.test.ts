import { describe, it, expect } from 'vitest'
import {
  generatePlaceholder,
  generateAvatarPlaceholder,
  DEFAULT_AVATAR_PLACEHOLDER,
  AVATAR_SIZE_MAP,
} from '@/lib/image-utils'

describe('generatePlaceholder', () => {
  describe('basic functionality', () => {
    it('should return a base64 data URL', () => {
      const result = generatePlaceholder(100, 100)
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should generate valid base64', () => {
      const result = generatePlaceholder(100, 100)
      const base64Part = result.replace('data:image/svg+xml;base64,', '')
      // Base64 should only contain valid characters
      expect(base64Part).toMatch(/^[A-Za-z0-9+/=]+$/)
    })

    it('should include width in SVG', () => {
      const result = generatePlaceholder(200, 100)
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('width="200"')
    })

    it('should include height in SVG', () => {
      const result = generatePlaceholder(100, 300)
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('height="300"')
    })

    it('should create a filled rectangle', () => {
      const result = generatePlaceholder(100, 100)
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('rect')
      expect(decoded).toContain('fill=')
    })
  })

  describe('dimensions', () => {
    it('should handle square dimensions', () => {
      const result = generatePlaceholder(100, 100)
      expect(result).toBeTruthy()
    })

    it('should handle landscape dimensions', () => {
      const result = generatePlaceholder(200, 100)
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('width="200"')
      expect(decoded).toContain('height="100"')
    })

    it('should handle portrait dimensions', () => {
      const result = generatePlaceholder(100, 200)
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('width="100"')
      expect(decoded).toContain('height="200"')
    })

    it('should handle small dimensions', () => {
      const result = generatePlaceholder(1, 1)
      expect(result).toBeTruthy()
    })

    it('should handle large dimensions', () => {
      const result = generatePlaceholder(1920, 1080)
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('width="1920"')
      expect(decoded).toContain('height="1080"')
    })
  })
})

describe('generateAvatarPlaceholder', () => {
  describe('basic functionality', () => {
    it('should return a base64 data URL', () => {
      const result = generateAvatarPlaceholder('user-123')
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should generate valid SVG', () => {
      const result = generateAvatarPlaceholder('user-123')
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('<svg')
      expect(decoded).toContain('</svg>')
    })

    it('should include gradient definition', () => {
      const result = generateAvatarPlaceholder('user-123')
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('linearGradient')
      expect(decoded).toContain('stop')
    })

    it('should create a 100x100 square', () => {
      const result = generateAvatarPlaceholder('user-123')
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toContain('width="100"')
      expect(decoded).toContain('height="100"')
    })
  })

  describe('consistency', () => {
    it('should return same result for same userId', () => {
      const result1 = generateAvatarPlaceholder('user-abc')
      const result2 = generateAvatarPlaceholder('user-abc')
      expect(result1).toBe(result2)
    })

    it('should be consistent across multiple calls', () => {
      const userId = 'consistent-user'
      const results = Array(10)
        .fill(null)
        .map(() => generateAvatarPlaceholder(userId))
      expect(new Set(results).size).toBe(1)
    })

    it('should return different results for different userIds', () => {
      const result1 = generateAvatarPlaceholder('user-1')
      const result2 = generateAvatarPlaceholder('user-2')
      expect(result1).not.toBe(result2)
    })
  })

  describe('color generation', () => {
    it('should use HSL color format', () => {
      const result = generateAvatarPlaceholder('user-123')
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      expect(decoded).toMatch(/hsl\(\d+,\d+%,\d+%\)/)
    })

    it('should have two gradient stops', () => {
      const result = generateAvatarPlaceholder('user-123')
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''))
      const stopMatches = decoded.match(/<stop/g)
      expect(stopMatches?.length).toBe(2)
    })

    it('should generate different hues for different users', () => {
      const decoded1 = atob(
        generateAvatarPlaceholder('aaa').replace('data:image/svg+xml;base64,', '')
      )
      const decoded2 = atob(
        generateAvatarPlaceholder('zzz').replace('data:image/svg+xml;base64,', '')
      )

      // Extract hue values
      const hue1Match = decoded1.match(/hsl\((\d+),/)
      const hue2Match = decoded2.match(/hsl\((\d+),/)

      expect(hue1Match).toBeTruthy()
      expect(hue2Match).toBeTruthy()
      // Different userIds should (very likely) produce different hues
      expect(hue1Match![1]).not.toBe(hue2Match![1])
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = generateAvatarPlaceholder('')
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should handle special characters', () => {
      const result = generateAvatarPlaceholder('user@example.com')
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should handle unicode characters', () => {
      const result = generateAvatarPlaceholder('用户名')
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should handle UUID-style ids', () => {
      const result = generateAvatarPlaceholder('550e8400-e29b-41d4-a716-446655440000')
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should handle numeric string ids', () => {
      const result = generateAvatarPlaceholder('12345')
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should handle very long ids', () => {
      const longId = 'x'.repeat(1000)
      const result = generateAvatarPlaceholder(longId)
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/)
    })
  })
})

describe('DEFAULT_AVATAR_PLACEHOLDER', () => {
  it('should be a valid base64 data URL', () => {
    expect(DEFAULT_AVATAR_PLACEHOLDER).toMatch(/^data:image\/svg\+xml;base64,/)
  })

  it('should decode to valid SVG', () => {
    const decoded = atob(DEFAULT_AVATAR_PLACEHOLDER.replace('data:image/svg+xml;base64,', ''))
    expect(decoded).toContain('<svg')
    expect(decoded).toContain('</svg>')
  })

  it('should have a neutral fill color', () => {
    const decoded = atob(DEFAULT_AVATAR_PLACEHOLDER.replace('data:image/svg+xml;base64,', ''))
    expect(decoded).toContain('fill=')
    // Should use gray/slate color
    expect(decoded).toMatch(/#[a-f0-9]{6}/i)
  })
})

describe('AVATAR_SIZE_MAP', () => {
  it('should have xs size', () => {
    expect(AVATAR_SIZE_MAP.xs).toBe(20)
  })

  it('should have sm size', () => {
    expect(AVATAR_SIZE_MAP.sm).toBe(40)
  })

  it('should have md size', () => {
    expect(AVATAR_SIZE_MAP.md).toBe(96)
  })

  it('should have lg size', () => {
    expect(AVATAR_SIZE_MAP.lg).toBe(128)
  })

  it('should have xl size', () => {
    expect(AVATAR_SIZE_MAP.xl).toBe(192)
  })

  it('should have sizes in increasing order', () => {
    const sizes = Object.values(AVATAR_SIZE_MAP)
    const sorted = [...sizes].sort((a, b) => a - b)
    expect(sizes).toEqual(sorted)
  })

  it('should have all positive values', () => {
    Object.values(AVATAR_SIZE_MAP).forEach((size) => {
      expect(size).toBeGreaterThan(0)
    })
  })
})
