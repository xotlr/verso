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
  constructor(resetAt?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { resetAt });
    this.name = 'RateLimitError';
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
