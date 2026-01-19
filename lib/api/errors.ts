/**
 * Standardized API error classes for consistent error responses.
 * Use these in API handlers to throw errors with proper status codes.
 */

/**
 * Base API error class.
 * Extends Error with HTTP status code and optional details.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 Bad Request - Invalid input or malformed request.
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized - Authentication required.
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden - User lacks permission.
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found - Resource doesn't exist.
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict.
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * 410 Gone - Resource no longer available (expired, revoked, etc).
 */
export class GoneError extends ApiError {
  constructor(message = 'Resource no longer available') {
    super(message, 410, 'GONE');
    this.name = 'GoneError';
  }
}

/**
 * 422 Unprocessable Entity - Validation failed.
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded.
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', retryAfter ? { retryAfter } : undefined);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 403 CSRF Validation Failed - Origin doesn't match host.
 */
export class CsrfError extends ApiError {
  constructor(message = 'CSRF validation failed') {
    super(message, 403, 'CSRF_ERROR');
    this.name = 'CsrfError';
  }
}

/**
 * 500 Internal Server Error - Unexpected server error.
 */
export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalError';
  }
}

/**
 * Check if an error is an ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Supabase/Postgrest error shape
 */
interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Convert a Supabase/Postgrest error to an appropriate ApiError.
 * SECURITY: This prevents raw database errors from leaking to clients.
 *
 * This function handles common PostgreSQL/PostgREST error codes:
 * - PGRST116: Row not found (throws NotFoundError)
 * - PGRST301: RLS policy violation (throws ForbiddenError)
 * - 23505: Unique constraint violation (throws ConflictError)
 * - 23503: Foreign key violation (throws BadRequestError)
 *
 * PREFERRED PATTERN:
 * ```typescript
 * const { data, error } = await supabase.from("Table").select().single()
 * if (error) handleSupabaseError(error, "Resource")  // Handles PGRST116 automatically
 * if (!data) throw new NotFoundError("Resource")     // Fallback if data is null
 * ```
 *
 * AVOID (redundant):
 * ```typescript
 * if (error?.code === "PGRST116" || !data) throw new NotFoundError("Resource")
 * if (error) handleSupabaseError(error, "Resource")  // PGRST116 already thrown above
 * ```
 *
 * @param error - The Supabase error object
 * @param resourceName - Optional name for 404 errors (e.g., "Project", "Screenplay")
 * @returns Never returns - always throws an ApiError subclass
 */
export function handleSupabaseError(
  error: SupabaseError | null | undefined,
  resourceName = "Resource"
): never {
  if (!error) {
    throw new InternalError();
  }

  const code = error.code || "";
  const message = error.message || "";

  // PGRST116: Row not found (single() returned no rows)
  if (code === "PGRST116") {
    throw new NotFoundError(resourceName);
  }

  // PGRST301: Row-level security violation (RLS policy blocked access)
  if (code === "PGRST301" || message.includes("policy")) {
    throw new ForbiddenError(`You don't have access to this ${resourceName.toLowerCase()}`);
  }

  // 23505: Unique constraint violation
  if (code === "23505") {
    throw new ConflictError(`${resourceName} already exists`);
  }

  // 23503: Foreign key constraint violation
  if (code === "23503") {
    throw new BadRequestError("Referenced resource does not exist");
  }

  // 23502: Not null constraint violation
  if (code === "23502") {
    throw new BadRequestError("Required field is missing");
  }

  // 22P02: Invalid text representation (e.g., invalid UUID)
  if (code === "22P02") {
    throw new BadRequestError("Invalid identifier format");
  }

  // 42501: Insufficient privilege
  if (code === "42501") {
    throw new ForbiddenError();
  }

  // 42P01: Undefined table (should never happen in production)
  if (code === "42P01") {
    throw new InternalError();
  }

  // Default: Internal error (don't expose database details)
  throw new InternalError();
}

/**
 * Safely handle a Supabase query result.
 * Throws an appropriate ApiError if there's an error.
 *
 * @param result - The Supabase query result { data, error }
 * @param resourceName - Optional name for 404 errors
 * @returns The data if successful
 */
export function unwrapSupabaseResult<T>(
  result: { data: T | null; error: SupabaseError | null },
  resourceName = "Resource"
): T {
  if (result.error) {
    handleSupabaseError(result.error, resourceName);
  }

  if (result.data === null) {
    throw new NotFoundError(resourceName);
  }

  return result.data;
}
