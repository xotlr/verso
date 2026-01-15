/**
 * Error Message Types
 * Categories for contextual error messaging
 */

/**
 * Error context categories
 */
export type ErrorContext =
  | 'GENERIC' // Fallback for unknown errors
  | 'NETWORK' // Connection issues, offline
  | 'AUTH' // Login, signup, session expired
  | 'PERMISSION' // Access denied, forbidden
  | 'NOT_FOUND' // Resource doesn't exist
  | 'VALIDATION' // Input validation failures
  | 'RATE_LIMIT' // Too many requests
  | 'FILE_UPLOAD' // Upload/import failures
  | 'FILE_EXPORT' // Export/download failures
  | 'SAVE' // Failed to save changes
  | 'LOAD' // Failed to load data
  | 'DELETE' // Failed to delete
  | 'CREATE' // Failed to create
  | 'UPDATE' // Failed to update
  | 'CONFLICT' // Resource conflict (duplicate, etc.)
  | 'TIMEOUT' // Operation timed out
  | 'SERVER' // Internal server error
  | 'PARSE' // File parsing errors
  | 'PAYMENT'; // Billing/subscription issues

/**
 * Error result with optional action suggestion
 */
export interface VoicedError {
  message: string;
  action?: string;
}

/**
 * Domain-specific error contexts
 */
export type ErrorDomain =
  | 'screenplay'
  | 'project'
  | 'stack'
  | 'team'
  | 'profile'
  | 'export'
  | 'import'
  | 'shotlist'
  | 'feedback'
  | 'invite'
  | 'share'
  | 'general';
