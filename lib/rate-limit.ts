// Simple in-memory rate limiter
// For production, use Redis/Upstash for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
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

// Predefined rate limit configs
export const RATE_LIMITS = {
  // General API calls: 100 requests per minute
  API: { maxRequests: 100, windowMs: 60 * 1000 },
  // Authentication: 10 attempts per 15 minutes
  AUTH: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  // AI/Claude calls: 20 per minute
  AI: { maxRequests: 20, windowMs: 60 * 1000 },
  // Project creation: 10 per hour
  PROJECT_CREATE: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
} as const;

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
