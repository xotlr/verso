/**
 * Centralized API utilities.
 *
 * @example
 * import { createApiHandler, NotFoundError, RATE_LIMITS } from '@/lib/api';
 *
 * export const GET = createApiHandler({
 *   auth: 'required',
 *   rateLimit: RATE_LIMITS.API,
 *   handler: async ({ user, params }) => {
 *     const item = await prisma.item.findUnique({ where: { id: params.id } });
 *     if (!item) throw new NotFoundError('Item');
 *     return { item };
 *   },
 * });
 */

// Handler factory
export { createApiHandler, type ApiRouteHandler } from './handler';

// Error classes
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
  isApiError,
} from './errors';

// Re-export rate limit configs for convenience
export { RATE_LIMITS, rateLimit, getClientIp } from '@/lib/rate-limit';
