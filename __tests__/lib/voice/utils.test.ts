import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  randomPick,
  getDailySeed,
  getSessionSeed,
  combineSeed,
  createSmartPicker,
  pickSmart,
  getTimePeriod,
  isWeekend,
  daysSince,
  shouldAppendName,
} from '@/lib/voice/utils'

describe('randomPick', () => {
  it('should return an item from the array', () => {
    const arr = ['a', 'b', 'c', 'd', 'e']
    const result = randomPick(arr)
    expect(arr).toContain(result)
  })

  it('should handle single item array', () => {
    const arr = ['only']
    expect(randomPick(arr)).toBe('only')
  })

  it('should return different items over multiple calls (statistical)', () => {
    const arr = ['a', 'b', 'c', 'd', 'e']
    const results = new Set(Array(100).fill(null).map(() => randomPick(arr)))
    // With 100 picks from 5 items, we should get multiple different results
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('getDailySeed', () => {
  it('should return 0 when not mounted', () => {
    expect(getDailySeed(false)).toBe(0)
  })

  it('should return positive number when mounted', () => {
    expect(getDailySeed(true)).toBeGreaterThan(0)
  })

  it('should return same value for calls on same day', () => {
    const seed1 = getDailySeed(true)
    const seed2 = getDailySeed(true)
    expect(seed1).toBe(seed2)
  })

  it('should be based on days since epoch', () => {
    const seed = getDailySeed(true)
    const expectedMin = Math.floor(Date.now() / 86400000) - 1
    const expectedMax = Math.floor(Date.now() / 86400000) + 1
    expect(seed).toBeGreaterThanOrEqual(expectedMin)
    expect(seed).toBeLessThanOrEqual(expectedMax)
  })
})

describe('getSessionSeed', () => {
  const mockSessionStorage: Record<string, string> = {}

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage[key] = value
      }),
    })
    // Clear storage
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return existing seed if set', () => {
    mockSessionStorage['voice-session-seed'] = '1234'
    expect(getSessionSeed()).toBe(1234)
  })

  it('should create and store new seed if not set', () => {
    const seed = getSessionSeed()
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(10000)
    expect(mockSessionStorage['voice-session-seed']).toBe(seed.toString())
  })

  it('should use custom key', () => {
    mockSessionStorage['custom-key'] = '5678'
    expect(getSessionSeed('custom-key')).toBe(5678)
  })

  it('should return 0 when window is undefined', () => {
    vi.stubGlobal('window', undefined)
    expect(getSessionSeed()).toBe(0)
  })
})

describe('combineSeed', () => {
  it('should combine two seeds by addition', () => {
    expect(combineSeed(100, 50)).toBe(150)
  })

  it('should handle zero values', () => {
    expect(combineSeed(0, 0)).toBe(0)
    expect(combineSeed(100, 0)).toBe(100)
    expect(combineSeed(0, 100)).toBe(100)
  })

  it('should be commutative', () => {
    expect(combineSeed(10, 20)).toBe(combineSeed(20, 10))
  })
})

describe('createSmartPicker', () => {
  it('should return a function', () => {
    const picker = createSmartPicker({})
    expect(typeof picker).toBe('function')
  })

  it('should pick from variants', () => {
    const picker = createSmartPicker({ dailySeed: 0, sessionSeed: 0 })
    const variants = ['a', 'b', 'c']
    const result = picker(variants)
    expect(variants).toContain(result)
  })

  it('should exclude recent texts when possible', () => {
    const picker = createSmartPicker({
      dailySeed: 0,
      sessionSeed: 0,
      recentTexts: ['a', 'b'],
    })
    const variants = ['a', 'b', 'c']
    // Since a and b are excluded, should return c
    const result = picker(variants)
    expect(result).toBe('c')
  })

  it('should fallback to all variants when all are excluded', () => {
    const picker = createSmartPicker({
      dailySeed: 0,
      sessionSeed: 0,
      recentTexts: ['a', 'b', 'c'],
    })
    const variants = ['a', 'b', 'c']
    const result = picker(variants)
    expect(variants).toContain(result)
  })

  it('should return item from pool (non-deterministic for variety)', () => {
    const picker = createSmartPicker({ dailySeed: 123, sessionSeed: 456 })
    const variants = ['a', 'b', 'c', 'd', 'e']

    // Run multiple times to verify it picks from the pool
    for (let i = 0; i < 10; i++) {
      expect(variants).toContain(picker(variants))
    }
  })

  it('should provide variety over multiple calls', () => {
    const picker = createSmartPicker({ dailySeed: 1, sessionSeed: 0 })
    const variants = Array.from({ length: 20 }, (_, i) => `item-${i}`)

    // With 20 variants, running 50 times should produce some variety
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(picker(variants))
    }

    // Should pick more than just one item
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('pickSmart', () => {
  it('should pick from pool', () => {
    const pool = ['a', 'b', 'c']
    const result = pickSmart(pool, [], 0)
    expect(pool).toContain(result)
  })

  it('should avoid recently shown items', () => {
    const pool = ['a', 'b', 'c']
    const result = pickSmart(pool, ['a', 'b'], 0)
    expect(result).toBe('c')
  })

  it('should fallback to full pool when all excluded', () => {
    const pool = ['a', 'b', 'c']
    const result = pickSmart(pool, ['a', 'b', 'c'], 0)
    expect(pool).toContain(result)
  })

  it('should return item from pool (non-deterministic for variety)', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    // Run multiple times to verify it picks from the pool
    for (let i = 0; i < 10; i++) {
      const result = pickSmart(pool, [], 42)
      expect(pool).toContain(result)
    }
  })

  it('should provide variety over multiple calls', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const results = new Set<string>()

    // With 10 items, running 30 times should produce some variety
    for (let i = 0; i < 30; i++) {
      results.add(pickSmart(pool, [], i))
    }

    // Should pick more than just one item
    expect(results.size).toBeGreaterThan(1)
  })
})

describe('getTimePeriod', () => {
  it('should return morning for hours 5-11', () => {
    expect(getTimePeriod(5)).toBe('morning')
    expect(getTimePeriod(8)).toBe('morning')
    expect(getTimePeriod(11)).toBe('morning')
  })

  it('should return afternoon for hours 12-16', () => {
    expect(getTimePeriod(12)).toBe('afternoon')
    expect(getTimePeriod(14)).toBe('afternoon')
    expect(getTimePeriod(16)).toBe('afternoon')
  })

  it('should return evening for hours 17-20', () => {
    expect(getTimePeriod(17)).toBe('evening')
    expect(getTimePeriod(19)).toBe('evening')
    expect(getTimePeriod(20)).toBe('evening')
  })

  it('should return night for hours 21-4', () => {
    expect(getTimePeriod(21)).toBe('night')
    expect(getTimePeriod(23)).toBe('night')
    expect(getTimePeriod(0)).toBe('night')
    expect(getTimePeriod(3)).toBe('night')
    expect(getTimePeriod(4)).toBe('night')
  })

  it('should use current hour when not provided', () => {
    const result = getTimePeriod()
    expect(['morning', 'afternoon', 'evening', 'night']).toContain(result)
  })
})

describe('isWeekend', () => {
  it('should detect weekends', () => {
    // Mock different days
    const originalDate = Date

    // Saturday (6)
    vi.setSystemTime(new Date('2024-01-06T12:00:00'))
    expect(isWeekend()).toBe(true)

    // Sunday (0)
    vi.setSystemTime(new Date('2024-01-07T12:00:00'))
    expect(isWeekend()).toBe(true)

    // Monday (1)
    vi.setSystemTime(new Date('2024-01-08T12:00:00'))
    expect(isWeekend()).toBe(false)

    // Friday (5)
    vi.setSystemTime(new Date('2024-01-12T12:00:00'))
    expect(isWeekend()).toBe(false)

    vi.useRealTimers()
  })
})

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return null for null input', () => {
    expect(daysSince(null)).toBeNull()
  })

  it('should return 0 for today', () => {
    expect(daysSince('2024-06-15')).toBe(0)
  })

  it('should return positive days for past dates', () => {
    expect(daysSince('2024-06-14')).toBe(1)
    expect(daysSince('2024-06-10')).toBe(5)
    expect(daysSince('2024-01-01')).toBe(166) // approx, depends on year
  })

  it('should return negative days for future dates', () => {
    expect(daysSince('2024-06-16')).toBe(-1)
    expect(daysSince('2024-06-20')).toBe(-5)
  })

  it('should handle ISO date strings', () => {
    expect(daysSince('2024-06-14T00:00:00Z')).toBe(1)
  })
})

describe('shouldAppendName', () => {
  describe('should return true for direct address patterns', () => {
    it('should match greetings', () => {
      expect(shouldAppendName('Good morning')).toBe(true)
      expect(shouldAppendName('Good afternoon')).toBe(true)
      expect(shouldAppendName('Good evening')).toBe(true)
      expect(shouldAppendName('Good night')).toBe(true)
    })

    it('should match welcome', () => {
      expect(shouldAppendName('Welcome back')).toBe(true)
    })

    it('should match hello/hi/hey', () => {
      expect(shouldAppendName('Hello')).toBe(true)
      expect(shouldAppendName('Hi there')).toBe(true)
      expect(shouldAppendName('Hey')).toBe(true)
    })

    it('should match happy (birthday, etc)', () => {
      expect(shouldAppendName('Happy Friday')).toBe(true)
    })
  })

  describe('should return true for short phrases', () => {
    it('should accept 1-3 word phrases without punctuation', () => {
      expect(shouldAppendName('Ready')).toBe(true)
      expect(shouldAppendName("Let's go")).toBe(true)
      expect(shouldAppendName('Here we go')).toBe(true)
    })
  })

  describe('should return false for skip patterns', () => {
    it('should skip phrases with "you" or "your"', () => {
      expect(shouldAppendName('How are you')).toBe(false)
      expect(shouldAppendName('Your script')).toBe(false)
    })

    it('should skip phrases ending with punctuation', () => {
      expect(shouldAppendName('What a day.')).toBe(false)
      expect(shouldAppendName('Amazing!')).toBe(false)
      expect(shouldAppendName('Ready?')).toBe(false) // ends with ?
    })

    it('should skip specific action words', () => {
      expect(shouldAppendName('Script awaits')).toBe(false)
      expect(shouldAppendName('Session begins')).toBe(false)
      expect(shouldAppendName('Loading mode: active')).toBe(false)
      expect(shouldAppendName('The plot thickens')).toBe(false)
      expect(shouldAppendName('Creativity flows')).toBe(false)
    })
  })

  describe('should return false for longer phrases without direct address', () => {
    it('should skip phrases with more than 3 words', () => {
      expect(shouldAppendName('This is a longer phrase here')).toBe(false)
    })

    it('should skip phrases with colons', () => {
      expect(shouldAppendName('Status: ready')).toBe(false)
    })
  })
})
