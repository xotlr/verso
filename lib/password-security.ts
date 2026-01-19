/**
 * Password Security Utilities
 *
 * Provides password strength validation and breach checking via HaveIBeenPwned.
 * Uses k-Anonymity model - only first 5 chars of SHA-1 hash are sent to API.
 *
 * SECURITY: Check passwords against known breached password lists
 */

import { createHash } from "crypto"

export interface PasswordCheckResult {
  isBreached: boolean
  breachCount?: number
  error?: string
}

export interface PasswordStrengthResult {
  isStrong: boolean
  score: number // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[]
}

/**
 * Check if a password has been exposed in known data breaches.
 * Uses HaveIBeenPwned's k-Anonymity API - safe and privacy-preserving.
 *
 * @param password - The password to check (plaintext)
 * @returns Promise with breach status and count
 */
export async function checkPasswordBreach(password: string): Promise<PasswordCheckResult> {
  try {
    // Create SHA-1 hash of the password
    const sha1Hash = createHash("sha1").update(password).digest("hex").toUpperCase()

    // Split hash into prefix (first 5 chars) and suffix (rest)
    const prefix = sha1Hash.slice(0, 5)
    const suffix = sha1Hash.slice(5)

    // Query HaveIBeenPwned API with prefix only (k-Anonymity)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "User-Agent": "Verso-Security-Check",
        "Add-Padding": "true", // Adds random padding to prevent response size analysis
      },
    })

    if (!response.ok) {
      // API error - don't block user, just log
      return { isBreached: false, error: "Unable to check password breach status" }
    }

    const text = await response.text()

    // Parse response - each line is "SUFFIX:COUNT"
    const lines = text.split("\n")
    for (const line of lines) {
      const [hashSuffix, count] = line.split(":")
      if (hashSuffix?.trim() === suffix) {
        return {
          isBreached: true,
          breachCount: parseInt(count?.trim() || "0", 10),
        }
      }
    }

    return { isBreached: false }
  } catch (error) {
    // Network error - don't block user
    return { isBreached: false, error: "Unable to check password breach status" }
  }
}

/**
 * Evaluate password strength based on multiple criteria.
 *
 * @param password - The password to evaluate
 * @returns Strength score and feedback
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = []
  let score = 0

  // Length checks
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (password.length < 8) {
    feedback.push("Password should be at least 8 characters")
  }

  // Character variety checks
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  if (hasLower && hasUpper) score += 0.5
  if (hasNumber) score += 0.5
  if (hasSpecial) score += 0.5

  if (!hasLower) feedback.push("Add lowercase letters")
  if (!hasUpper) feedback.push("Add uppercase letters")
  if (!hasNumber) feedback.push("Add numbers")
  if (!hasSpecial) feedback.push("Add special characters for extra security")

  // Common pattern checks
  const commonPatterns = [
    /^123/, /321$/, /abc/i, /qwerty/i, /password/i,
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /^[a-z]+$/i, // Only letters
    /^[0-9]+$/, // Only numbers
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 0.5
      break
    }
  }

  // Normalize score to 0-4 range
  const normalizedScore = Math.max(0, Math.min(4, Math.round(score)))

  return {
    isStrong: normalizedScore >= 3,
    score: normalizedScore,
    feedback,
  }
}

/**
 * Combined password validation for signup/password change.
 * Checks both strength and breach status.
 *
 * @param password - The password to validate
 * @returns Combined validation result
 */
export async function validatePassword(password: string): Promise<{
  isValid: boolean
  strength: PasswordStrengthResult
  breach: PasswordCheckResult
  errors: string[]
}> {
  const strength = evaluatePasswordStrength(password)
  const breach = await checkPasswordBreach(password)
  const errors: string[] = []

  // Collect errors
  if (!strength.isStrong) {
    errors.push("Password is too weak. " + strength.feedback.join(". "))
  }

  if (breach.isBreached) {
    errors.push(
      `This password has been exposed in ${breach.breachCount?.toLocaleString() || "multiple"} data breaches. Please choose a different password.`
    )
  }

  return {
    isValid: strength.isStrong && !breach.isBreached,
    strength,
    breach,
    errors,
  }
}

/**
 * Quick check for minimum password requirements (for real-time validation).
 * Does NOT check breach status - use validatePassword for full check.
 */
export function quickPasswordCheck(password: string): {
  meetsMinimum: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("At least 8 characters required")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter required")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter required")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("At least one number required")
  }

  return {
    meetsMinimum: errors.length === 0,
    errors,
  }
}
