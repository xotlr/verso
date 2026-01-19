/**
 * Account Lockout System
 *
 * Tracks failed login attempts per account and implements temporary lockout
 * after threshold is exceeded. Uses Redis for distributed state.
 *
 * SECURITY: Prevents brute-force attacks on specific accounts
 */

import { Redis } from "@upstash/redis"
import { logger } from "@/lib/logger"

// Configuration
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes (attempts reset after this)

// Redis client (reuse from rate-limit if available)
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    logger.warn("Redis not configured for account lockout - using in-memory fallback")
    return null
  }

  redis = new Redis({ url, token })
  return redis
}

// In-memory fallback for development
const memoryStore = new Map<string, { attempts: number; lockedUntil: number | null }>()

/**
 * Get the Redis key for tracking failed attempts
 */
function getAttemptsKey(email: string): string {
  return `lockout:attempts:${email.toLowerCase()}`
}

/**
 * Get the Redis key for lockout status
 */
function getLockoutKey(email: string): string {
  return `lockout:locked:${email.toLowerCase()}`
}

export interface LockoutStatus {
  isLocked: boolean
  remainingAttempts: number
  lockedUntil: Date | null
  retryAfterSeconds: number | null
}

/**
 * Check if an account is currently locked out.
 */
export async function checkLockoutStatus(email: string): Promise<LockoutStatus> {
  const normalizedEmail = email.toLowerCase()
  const client = getRedis()

  if (client) {
    // Redis-based check
    const [lockedUntil, attempts] = await Promise.all([
      client.get<number>(getLockoutKey(normalizedEmail)),
      client.get<number>(getAttemptsKey(normalizedEmail)),
    ])

    const now = Date.now()
    const currentAttempts = attempts || 0

    if (lockedUntil && lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((lockedUntil - now) / 1000)
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: new Date(lockedUntil),
        retryAfterSeconds,
      }
    }

    return {
      isLocked: false,
      remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts),
      lockedUntil: null,
      retryAfterSeconds: null,
    }
  }

  // In-memory fallback
  const record = memoryStore.get(normalizedEmail)
  const now = Date.now()

  if (record?.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockedUntil: new Date(record.lockedUntil),
      retryAfterSeconds,
    }
  }

  const currentAttempts = record?.attempts || 0
  return {
    isLocked: false,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts),
    lockedUntil: null,
    retryAfterSeconds: null,
  }
}

/**
 * Record a failed login attempt. Returns the new lockout status.
 * If threshold is exceeded, locks the account.
 */
export async function recordFailedAttempt(email: string): Promise<LockoutStatus> {
  const normalizedEmail = email.toLowerCase()
  const client = getRedis()
  const now = Date.now()

  if (client) {
    // Increment failed attempts
    const attemptsKey = getAttemptsKey(normalizedEmail)
    const newAttempts = await client.incr(attemptsKey)

    // Set expiry on first attempt
    if (newAttempts === 1) {
      await client.pexpire(attemptsKey, ATTEMPT_WINDOW_MS)
    }

    // Check if we should lock
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutKey = getLockoutKey(normalizedEmail)
      const lockedUntil = now + LOCKOUT_DURATION_MS

      await client.set(lockoutKey, lockedUntil, { px: LOCKOUT_DURATION_MS })

      logger.security("Account locked due to failed attempts", {
        email: normalizedEmail.substring(0, 3) + "***",
        attempts: newAttempts,
        lockedUntilMs: lockedUntil,
      })

      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: new Date(lockedUntil),
        retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      }
    }

    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS - newAttempts,
      lockedUntil: null,
      retryAfterSeconds: null,
    }
  }

  // In-memory fallback
  const record = memoryStore.get(normalizedEmail) || { attempts: 0, lockedUntil: null }
  record.attempts++

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS

    logger.security("Account locked due to failed attempts (in-memory)", {
      email: normalizedEmail.substring(0, 3) + "***",
      attempts: record.attempts,
    })

    memoryStore.set(normalizedEmail, record)

    return {
      isLocked: true,
      remainingAttempts: 0,
      lockedUntil: new Date(record.lockedUntil),
      retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    }
  }

  memoryStore.set(normalizedEmail, record)

  // Auto-cleanup after window expires
  setTimeout(() => {
    const current = memoryStore.get(normalizedEmail)
    if (current && !current.lockedUntil) {
      memoryStore.delete(normalizedEmail)
    }
  }, ATTEMPT_WINDOW_MS)

  return {
    isLocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.attempts,
    lockedUntil: null,
    retryAfterSeconds: null,
  }
}

/**
 * Clear failed attempts after successful login.
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase()
  const client = getRedis()

  if (client) {
    await Promise.all([
      client.del(getAttemptsKey(normalizedEmail)),
      client.del(getLockoutKey(normalizedEmail)),
    ])
  } else {
    memoryStore.delete(normalizedEmail)
  }
}

/**
 * Manually unlock an account (for admin use).
 */
export async function unlockAccount(email: string): Promise<void> {
  await clearFailedAttempts(email)
  logger.security("Account manually unlocked", {
    email: email.substring(0, 3) + "***",
  })
}
