/**
 * Distributed Rate Limiting with Upstash Redis
 * Falls back to in-memory for local development
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if Upstash credentials are available
const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Create Redis client if credentials are available
const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// In-memory fallback for development (resets on cold start)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// Upstash rate limiters (cached to avoid recreation)
const rateLimiters = new Map<string, Ratelimit>();

function getUpstashRateLimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.maxRequests}:${config.windowMs}`;

  if (!rateLimiters.has(key)) {
    const windowSeconds = Math.ceil(config.windowMs / 1000);
    rateLimiters.set(
      key,
      new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
        analytics: true,
        prefix: 'verso-ratelimit',
      })
    );
  }

  return rateLimiters.get(key)!;
}

/**
 * Rate limit a request using Upstash Redis (production) or in-memory (development)
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Use Upstash in production
  if (redis) {
    try {
      const limiter = getUpstashRateLimiter(config);
      const result = await limiter.limit(identifier);

      return {
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch (error) {
      console.error('Upstash rate limit error, falling back to in-memory:', error);
      // Fall through to in-memory on error
    }
  }

  // In-memory fallback for development or on Upstash error
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    memoryStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Synchronous version for backwards compatibility (uses in-memory only)
export function rateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    const newEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    memoryStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  // General API calls: 100 requests per minute
  API: { maxRequests: 100, windowMs: 60 * 1000 },
  // Authentication: 10 attempts per 15 minutes
  AUTH: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  // AI/Verso calls: 20 per minute
  AI: { maxRequests: 20, windowMs: 60 * 1000 },
  // Project creation: 10 per hour
  PROJECT_CREATE: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
} as const;

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

