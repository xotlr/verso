// Username validation and reserved words

// Reserved words that cannot be used as usernames
// Includes app routes, system terms, and admin-related words
export const RESERVED_USERNAMES = new Set([
  // App routes
  'home',
  'explore',
  'screenplays',
  'projects',
  'settings',
  'profile',
  'connections',
  'help',
  'editor',
  'u', // username route prefix
  'api',
  'auth',

  // System / Admin
  'admin',
  'administrator',
  'system',
  'support',
  'help',
  'info',
  'contact',
  'root',
  'superuser',
  'moderator',
  'mod',

  // Brand related
  'verso',
  'versoapp',
  'verso_app',
  'official',
  'team',
  'staff',

  // Generic reserved
  'null',
  'undefined',
  'anonymous',
  'guest',
  'user',
  'users',
  'account',
  'accounts',
  'login',
  'logout',
  'signin',
  'signout',
  'signup',
  'register',
  'password',
  'reset',
  'verify',
  'verification',
  'email',
  'username',

  // Common offensive / problematic
  'test',
  'demo',
  'example',
  'sample',
  'delete',
  'deleted',
  'removed',
  'banned',
  'suspended',
])

// Username validation rules
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20

// Regex: lowercase letters, numbers, underscores only
// Cannot start or end with underscore
// No consecutive underscores
const USERNAME_REGEX = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/

export interface UsernameValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a username against all rules
 */
export function validateUsername(username: string): UsernameValidationResult {
  // Normalize to lowercase
  const normalized = username.toLowerCase().trim()

  // Length check
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    }
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
    }
  }

  // Check for invalid characters / format
  if (!USERNAME_REGEX.test(normalized)) {
    // Give more specific error messages
    if (normalized.startsWith('_')) {
      return {
        valid: false,
        error: 'Username cannot start with an underscore',
      }
    }
    if (normalized.endsWith('_')) {
      return {
        valid: false,
        error: 'Username cannot end with an underscore',
      }
    }
    if (normalized.includes('__')) {
      return {
        valid: false,
        error: 'Username cannot have consecutive underscores',
      }
    }
    if (/[^a-z0-9_]/.test(normalized)) {
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, and underscores',
      }
    }
    if (/^[0-9]/.test(normalized)) {
      return {
        valid: false,
        error: 'Username must start with a letter',
      }
    }
    return {
      valid: false,
      error: 'Invalid username format',
    }
  }

  // Check reserved words
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      error: 'This username is not available',
    }
  }

  return { valid: true }
}

/**
 * Normalize username for storage (lowercase, trimmed)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim()
}

/**
 * Generate username suggestions based on a name
 */
export function generateUsernameSuggestions(name: string): string[] {
  const suggestions: string[] = []

  // Normalize and clean the name
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()

  if (!cleaned) return suggestions

  const parts = cleaned.split(/\s+/)

  // john_doe style
  if (parts.length >= 2) {
    const joined = parts.slice(0, 2).join('_')
    if (validateUsername(joined).valid) {
      suggestions.push(joined)
    }
  }

  // johndoe style
  if (parts.length >= 2) {
    const joined = parts.slice(0, 2).join('')
    if (validateUsername(joined).valid) {
      suggestions.push(joined)
    }
  }

  // firstname only
  if (parts[0] && parts[0].length >= USERNAME_MIN_LENGTH) {
    if (validateUsername(parts[0]).valid) {
      suggestions.push(parts[0])
    }
  }

  // Add some number variations
  const base = parts.slice(0, 2).join('_')
  if (base.length >= USERNAME_MIN_LENGTH - 1) {
    for (const suffix of ['1', '2', '99', String(new Date().getFullYear()).slice(2)]) {
      const withSuffix = `${base}${suffix}`
      if (validateUsername(withSuffix).valid && !suggestions.includes(withSuffix)) {
        suggestions.push(withSuffix)
      }
    }
  }

  return suggestions.slice(0, 5)
}
