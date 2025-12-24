import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset the rate limit store between tests by using unique identifiers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rateLimit', () => {
    it('should allow requests under the limit', async () => {
      const identifier = `test-user-${Date.now()}`
      const config = { maxRequests: 5, windowMs: 60000 }

      const result1 = await rateLimit(identifier, config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4)

      const result2 = await rateLimit(identifier, config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests over the limit', async () => {
      const identifier = `test-user-block-${Date.now()}`
      const config = { maxRequests: 2, windowMs: 60000 }

      // Use up the limit
      await rateLimit(identifier, config)
      await rateLimit(identifier, config)

      // This should be blocked
      const result = await rateLimit(identifier, config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after window expires', async () => {
      const identifier = `test-user-reset-${Date.now()}`
      const config = { maxRequests: 1, windowMs: 1000 }

      // Use up the limit
      const first = await rateLimit(identifier, config)
      expect(first.success).toBe(true)

      const blocked = await rateLimit(identifier, config)
      expect(blocked.success).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(1100)

      // Should be allowed again
      const afterReset = await rateLimit(identifier, config)
      expect(afterReset.success).toBe(true)
      expect(afterReset.remaining).toBe(0)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('should have sensible defaults', () => {
      expect(RATE_LIMITS.API.maxRequests).toBe(100)
      expect(RATE_LIMITS.AUTH.maxRequests).toBe(10)
      expect(RATE_LIMITS.AI.maxRequests).toBe(20)
      expect(RATE_LIMITS.PROJECT_CREATE.maxRequests).toBe(10)
    })
  })

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })
      expect(getClientIp(request)).toBe('192.168.1.1')
    })

    it('should return unknown when no IP header present', () => {
      const request = new Request('http://localhost')
      expect(getClientIp(request)).toBe('unknown')
    })
  })
})
