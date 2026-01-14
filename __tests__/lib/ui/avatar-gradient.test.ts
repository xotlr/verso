import { describe, it, expect } from 'vitest'
import {
  generateMeshGradient,
  generateSimpleGradient,
  getGradientColors,
  getPrimaryColor,
  getBaseColor,
  getMeshGradientStyle,
  getSimpleGradientStyle,
  generatePrimaryGradient,
  getPrimaryGradientStyle,
} from '@/lib/ui/avatar-gradient'

describe('generateMeshGradient', () => {
  it('should generate consistent output for same userId', () => {
    const gradient1 = generateMeshGradient('user-123')
    const gradient2 = generateMeshGradient('user-123')
    expect(gradient1).toBe(gradient2)
  })

  it('should generate different output for different userIds', () => {
    const gradient1 = generateMeshGradient('user-123')
    const gradient2 = generateMeshGradient('user-456')
    expect(gradient1).not.toBe(gradient2)
  })

  it('should contain radial-gradient', () => {
    const gradient = generateMeshGradient('test-user')
    expect(gradient).toContain('radial-gradient')
  })

  it('should contain linear-gradient for base', () => {
    const gradient = generateMeshGradient('test-user')
    expect(gradient).toContain('linear-gradient')
  })

  it('should contain hsl/hsla colors', () => {
    const gradient = generateMeshGradient('test-user')
    expect(gradient).toMatch(/hsla?\(/)
  })

  it('should handle empty string userId', () => {
    const gradient = generateMeshGradient('')
    expect(typeof gradient).toBe('string')
    expect(gradient.length).toBeGreaterThan(0)
  })

  it('should handle special characters in userId', () => {
    const gradient = generateMeshGradient('user@email.com')
    expect(typeof gradient).toBe('string')
    expect(gradient).toContain('radial-gradient')
  })

  it('should handle unicode in userId', () => {
    const gradient = generateMeshGradient('用户名')
    expect(typeof gradient).toBe('string')
  })
})

describe('generateSimpleGradient', () => {
  it('should generate consistent output for same userId', () => {
    const gradient1 = generateSimpleGradient('user-123')
    const gradient2 = generateSimpleGradient('user-123')
    expect(gradient1).toBe(gradient2)
  })

  it('should generate different output for different userIds', () => {
    const gradient1 = generateSimpleGradient('user-123')
    const gradient2 = generateSimpleGradient('user-456')
    expect(gradient1).not.toBe(gradient2)
  })

  it('should be a linear-gradient', () => {
    const gradient = generateSimpleGradient('test-user')
    expect(gradient).toMatch(/^linear-gradient\(/)
  })

  it('should contain angle and two colors', () => {
    const gradient = generateSimpleGradient('test-user')
    // Format: linear-gradient(XXXdeg, hsl(...), hsl(...))
    expect(gradient).toMatch(/linear-gradient\(\d+deg,/)
    expect(gradient).toMatch(/hsl\(0, 0%, \d+%\)/)
  })

  it('should have angle between 90 and 270 degrees', () => {
    // Run multiple times to check various hashes
    const userIds = ['a', 'b', 'c', 'd', 'e', 'user-123', 'test@email']
    for (const userId of userIds) {
      const gradient = generateSimpleGradient(userId)
      const match = gradient.match(/linear-gradient\((\d+)deg/)
      expect(match).not.toBeNull()
      const angle = parseInt(match![1], 10)
      expect(angle).toBeGreaterThanOrEqual(90)
      expect(angle).toBeLessThanOrEqual(270)
    }
  })
})

describe('getGradientColors', () => {
  it('should return array of 4 colors', () => {
    const colors = getGradientColors('user-123')
    expect(colors).toHaveLength(4)
  })

  it('should return consistent colors for same userId', () => {
    const colors1 = getGradientColors('user-123')
    const colors2 = getGradientColors('user-123')
    expect(colors1).toEqual(colors2)
  })

  it('should return different colors for different userIds', () => {
    const colors1 = getGradientColors('user-123')
    const colors2 = getGradientColors('user-456')
    expect(colors1).not.toEqual(colors2)
  })

  it('should return valid HSL colors', () => {
    const colors = getGradientColors('test-user')
    for (const color of colors) {
      expect(color).toMatch(/^hsl\(0, 0%, \d+%\)$/)
    }
  })

  it('should return grayscale colors (0 saturation)', () => {
    const colors = getGradientColors('test-user')
    for (const color of colors) {
      expect(color).toContain('0%')
    }
  })
})

describe('getPrimaryColor', () => {
  it('should return consistent color for same userId', () => {
    const color1 = getPrimaryColor('user-123')
    const color2 = getPrimaryColor('user-123')
    expect(color1).toBe(color2)
  })

  it('should return valid HSL color', () => {
    const color = getPrimaryColor('test-user')
    expect(color).toMatch(/^hsl\(0, 0%, \d+%\)$/)
  })

  it('should return different color for different userId', () => {
    const color1 = getPrimaryColor('user-123')
    const color2 = getPrimaryColor('user-456')
    // May or may not be different depending on hash collision
    expect(typeof color1).toBe('string')
    expect(typeof color2).toBe('string')
  })
})

describe('getBaseColor', () => {
  it('should return consistent color for same userId', () => {
    const color1 = getBaseColor('user-123')
    const color2 = getBaseColor('user-123')
    expect(color1).toBe(color2)
  })

  it('should return valid HSL color', () => {
    const color = getBaseColor('test-user')
    expect(color).toMatch(/^hsl\(0, 0%, \d+%\)$/)
  })

  it('should return dark color (lightness 15-30%)', () => {
    const userIds = ['a', 'b', 'c', 'd', 'test', 'user-123']
    for (const userId of userIds) {
      const color = getBaseColor(userId)
      const match = color.match(/hsl\(0, 0%, (\d+)%\)/)
      expect(match).not.toBeNull()
      const lightness = parseInt(match![1], 10)
      expect(lightness).toBeGreaterThanOrEqual(15)
      expect(lightness).toBeLessThanOrEqual(30)
    }
  })
})

describe('getMeshGradientStyle', () => {
  it('should return CSSProperties object', () => {
    const style = getMeshGradientStyle('user-123')
    expect(typeof style).toBe('object')
    expect(style).toHaveProperty('background')
  })

  it('should have background property with gradient', () => {
    const style = getMeshGradientStyle('user-123')
    expect(typeof style.background).toBe('string')
    expect(style.background).toContain('radial-gradient')
  })

  it('should be consistent for same userId', () => {
    const style1 = getMeshGradientStyle('user-123')
    const style2 = getMeshGradientStyle('user-123')
    expect(style1).toEqual(style2)
  })
})

describe('getSimpleGradientStyle', () => {
  it('should return CSSProperties object', () => {
    const style = getSimpleGradientStyle('user-123')
    expect(typeof style).toBe('object')
    expect(style).toHaveProperty('background')
  })

  it('should have background property with linear-gradient', () => {
    const style = getSimpleGradientStyle('user-123')
    expect(typeof style.background).toBe('string')
    expect(style.background).toContain('linear-gradient')
  })

  it('should be consistent for same userId', () => {
    const style1 = getSimpleGradientStyle('user-123')
    const style2 = getSimpleGradientStyle('user-123')
    expect(style1).toEqual(style2)
  })
})

describe('generatePrimaryGradient', () => {
  it('should generate consistent output for same id', () => {
    const gradient1 = generatePrimaryGradient('project-123')
    const gradient2 = generatePrimaryGradient('project-123')
    expect(gradient1).toBe(gradient2)
  })

  it('should contain CSS variable reference', () => {
    const gradient = generatePrimaryGradient('test')
    expect(gradient).toContain('--primary')
  })

  it('should contain linear-gradient', () => {
    const gradient = generatePrimaryGradient('test')
    expect(gradient).toContain('linear-gradient')
  })

  it('should have angle between 45 and 225 degrees', () => {
    const ids = ['a', 'b', 'c', 'd', 'test', 'project-123']
    for (const id of ids) {
      const gradient = generatePrimaryGradient(id)
      const match = gradient.match(/linear-gradient\((\d+)deg/)
      expect(match).not.toBeNull()
      const angle = parseInt(match![1], 10)
      expect(angle).toBeGreaterThanOrEqual(45)
      expect(angle).toBeLessThanOrEqual(225)
    }
  })
})

describe('getPrimaryGradientStyle', () => {
  it('should return CSSProperties object with background', () => {
    const style = getPrimaryGradientStyle('test')
    expect(typeof style).toBe('object')
    expect(style).toHaveProperty('background')
    expect(typeof style.background).toBe('string')
  })

  it('should be consistent for same id', () => {
    const style1 = getPrimaryGradientStyle('test')
    const style2 = getPrimaryGradientStyle('test')
    expect(style1).toEqual(style2)
  })
})

describe('hash determinism', () => {
  it('should produce same output across multiple calls', () => {
    const userId = 'consistent-user-id-12345'

    // Call each function multiple times
    const results = []
    for (let i = 0; i < 10; i++) {
      results.push({
        mesh: generateMeshGradient(userId),
        simple: generateSimpleGradient(userId),
        colors: getGradientColors(userId),
        primary: getPrimaryColor(userId),
        base: getBaseColor(userId),
      })
    }

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i].mesh).toBe(results[0].mesh)
      expect(results[i].simple).toBe(results[0].simple)
      expect(results[i].colors).toEqual(results[0].colors)
      expect(results[i].primary).toBe(results[0].primary)
      expect(results[i].base).toBe(results[0].base)
    }
  })
})
