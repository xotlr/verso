/**
 * Centralized API route handler factory.
 * Provides consistent auth, validation, rate limiting, and error handling.
 *
 * @example
 * // Simple authenticated endpoint
 * export const GET = createApiHandler({
 *   auth: 'required',
 *   handler: async ({ user }) => {
 *     const items = await prisma.item.findMany({ where: { userId: user.id } });
 *     return { items };
 *   },
 * });
 *
 * @example
 * // Endpoint with validation and rate limiting
 * export const POST = createApiHandler({
 *   auth: 'required',
 *   schema: z.object({ name: z.string().min(1) }),
 *   rateLimit: RATE_LIMITS.PROJECT_CREATE,
 *   handler: async ({ user, data }) => {
 *     const item = await prisma.item.create({ data: { ...data, userId: user.id } });
 *     return { item };
 *   },
 * });
 *
 * @example
 * // Dynamic route with params
 * export const GET = createApiHandler({
 *   auth: 'required',
 *   handler: async ({ user, params }) => {
 *     const { id } = params;
 *     const item = await prisma.item.findUnique({ where: { id } });
 *     if (!item) throw new NotFoundError('Item');
 *     return { item };
 *   },
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIp, type RATE_LIMITS } from '@/lib/rate-limit';
import {
  ApiError,
  UnauthorizedError,
  ValidationError,
  RateLimitError,
  InternalError,
  CsrfError,
} from './errors';
import {
  logger,
  withLogContextAsync,
  generateCorrelationId,
  type LogContext,
} from '@/lib/logger';

// Correlation ID header name (matches proxy.ts)
const CORRELATION_ID_HEADER = 'x-correlation-id';

type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

/**
 * Session user type from auth.
 */
interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

/**
 * Context passed to API handlers.
 */
interface HandlerContext<TData = unknown, TParams = Record<string, string>> {
  /** Authenticated user (only present if auth is 'required' or 'optional' with valid session) */
  user: SessionUser;
  /** Validated request body (only present if schema provided) */
  data: TData;
  /** URL route params (e.g., { id: '123' } for /api/items/[id]) */
  params: TParams;
  /** URL search params */
  searchParams: URLSearchParams;
  /** Original Next.js request */
  request: NextRequest;
}

/**
 * Context for optional auth - user may be undefined.
 */
interface OptionalAuthContext<TData = unknown, TParams = Record<string, string>> {
  user: SessionUser | undefined;
  data: TData;
  params: TParams;
  searchParams: URLSearchParams;
  request: NextRequest;
}

/**
 * Context for no auth - user is never present.
 */
interface NoAuthContext<TData = unknown, TParams = Record<string, string>> {
  user: undefined;
  data: TData;
  params: TParams;
  searchParams: URLSearchParams;
  request: NextRequest;
}

/**
 * Handler function type based on auth mode.
 */
type HandlerFn<TData, TParams, TAuth extends 'required' | 'optional' | 'none'> =
  TAuth extends 'required'
    ? (ctx: HandlerContext<TData, TParams>) => Promise<unknown>
    : TAuth extends 'optional'
      ? (ctx: OptionalAuthContext<TData, TParams>) => Promise<unknown>
      : (ctx: NoAuthContext<TData, TParams>) => Promise<unknown>;

/**
 * Configuration for createApiHandler.
 */
interface ApiHandlerConfig<
  TData = unknown,
  TParams = Record<string, string>,
  TAuth extends 'required' | 'optional' | 'none' = 'required',
> {
  /**
   * Authentication mode:
   * - 'required': Returns 401 if not authenticated (default)
   * - 'optional': Continues without user if not authenticated
   * - 'none': Skips auth check entirely
   */
  auth?: TAuth;

  /**
   * Zod schema for request body validation.
   * Body is parsed and validated before handler is called.
   */
  schema?: ZodSchema<TData>;

  /**
   * Rate limiting configuration.
   * Uses user ID for authenticated requests, IP for anonymous.
   */
  rateLimit?: RateLimitConfig;

  /**
   * The actual handler function.
   * Return value is automatically wrapped in NextResponse.json().
   * Throw ApiError subclasses for error responses.
   */
  handler: HandlerFn<TData, TParams, TAuth>;
}

/**
 * Next.js route context type (App Router style).
 */
type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Creates a standardized API route handler.
 * Handles auth, validation, rate limiting, and error responses.
 */
export function createApiHandler<
  TData = unknown,
  TParams extends Record<string, string> = Record<string, string>,
  TAuth extends 'required' | 'optional' | 'none' = 'required',
>(config: ApiHandlerConfig<TData, TParams, TAuth>) {
  const { auth: authMode = 'required', schema, rateLimit: rateLimitConfig, handler } = config;

  // Use overloads for proper Next.js type checking
  async function routeHandler(request: NextRequest): Promise<NextResponse>;
  async function routeHandler(
    request: NextRequest,
    routeContext: RouteContext
  ): Promise<NextResponse>;
  async function routeHandler(
    request: NextRequest,
    routeContext?: RouteContext
  ): Promise<NextResponse> {
    const startTime = performance.now();

    // Get or generate correlation ID (should be set by proxy, fallback for direct calls)
    const correlationId =
      request.headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();

    // Build initial log context
    const logContext: LogContext = {
      correlationId,
      path: new URL(request.url).pathname,
      method: request.method,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    // Wrap entire handler in log context for correlation ID propagation
    return withLogContextAsync(logContext, async () => {
      let statusCode = 200;

      try {
        // 1. CSRF Protection for state-changing methods
        const method = request.method.toUpperCase();
        if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
          const origin = request.headers.get('origin');
          const host = request.headers.get('host');

          if (origin && host) {
            // Parse origin to get hostname
            let originHost: string;
            try {
              originHost = new URL(origin).host;
            } catch {
              logger.security('CSRF: Invalid origin header', {
                origin,
                host,
                method,
              });
              throw new CsrfError('Invalid origin');
            }

            // Validate origin matches host (allow subdomains)
            const hostBase = host.split(':')[0]; // Remove port
            const originBase = originHost.split(':')[0];

            // Check exact match or subdomain match (e.g., app.example.com vs example.com)
            const isValidOrigin =
              originBase === hostBase ||
              originBase.endsWith(`.${hostBase}`) ||
              hostBase.endsWith(`.${originBase}`);

            if (!isValidOrigin) {
              logger.security('CSRF: Origin mismatch', {
                origin: originBase,
                host: hostBase,
                method,
              });
              throw new CsrfError('Origin mismatch');
            }
          }
          // Note: If no origin header, browser might be same-origin or non-browser client
          // We allow this but rely on auth for protection. Consider stricter policy if needed.
        }

        // 2. Authentication
        let user: SessionUser | undefined;

        if (authMode !== 'none') {
          const session = await auth();

          if (authMode === 'required' && !session?.user?.id) {
            throw new UnauthorizedError();
          }

          if (session?.user?.id) {
            user = session.user as SessionUser;
            // Update log context with user ID
            logContext.userId = user.id;
          }
        }

        // 3. Rate Limiting
        if (rateLimitConfig) {
          const identifier = user?.id || getClientIp(request);
          const result = await rateLimit(identifier, rateLimitConfig);

          if (!result.success) {
            logger.security('Rate limit exceeded', {
              identifier: user?.id ? 'user' : 'ip',
              limit: rateLimitConfig.maxRequests,
              windowMs: rateLimitConfig.windowMs,
            });
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            throw new RateLimitError('Rate limit exceeded', retryAfter);
          }
        }

        // 4. Parse route params
        const params = routeContext?.params
          ? ((await routeContext.params) as TParams)
          : ({} as TParams);

        // 5. Parse and validate request body
        let data: TData = undefined as TData;

        if (schema) {
          try {
            const body = await request.json();
            data = schema.parse(body);
          } catch (error) {
            if (error instanceof ZodError) {
              throw new ValidationError('Validation failed', {
                errors: error.issues.map((issue) => ({
                  path: issue.path.join('.'),
                  message: issue.message,
                })),
              });
            }
            // JSON parse error
            if (error instanceof SyntaxError) {
              throw new ValidationError('Invalid JSON body');
            }
            throw error;
          }
        }

        // 6. Parse search params
        const searchParams = new URL(request.url).searchParams;

        // 7. Call handler
        const context = {
          user,
          data,
          params,
          searchParams,
          request,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (handler as any)(context);

        // 8. Return response
        const durationMs = Math.round(performance.now() - startTime);
        let response: NextResponse;

        if (result instanceof NextResponse) {
          response = result;
          statusCode = response.status;
        } else {
          response = NextResponse.json(result);
        }

        // Add correlation ID to response
        response.headers.set(CORRELATION_ID_HEADER, correlationId);

        // Log successful request
        logger.request({
          message: 'Request completed',
          statusCode,
          durationMs,
        });

        return response;
      } catch (error) {
        const durationMs = Math.round(performance.now() - startTime);

        // Handle known API errors
        if (error instanceof ApiError) {
          statusCode = error.status;

          // Log client errors at info level, server errors at error level
          if (statusCode >= 500) {
            logger.error('Request failed', error as Error);
          } else if (statusCode >= 400) {
            logger.request({
              message: 'Request rejected',
              statusCode,
              durationMs,
              meta: { code: error.code },
            });
          }

          const response = NextResponse.json(error.toJSON(), { status: error.status });
          response.headers.set(CORRELATION_ID_HEADER, correlationId);
          if (error instanceof RateLimitError && error.retryAfter) {
            response.headers.set('Retry-After', String(error.retryAfter));
          }
          return response;
        }

        // Log unexpected errors
        statusCode = 500;
        logger.error('Unexpected error', error as Error);

        // Return generic error for unexpected issues
        const internalError = new InternalError();
        const response = NextResponse.json(internalError.toJSON(), { status: 500 });
        response.headers.set(CORRELATION_ID_HEADER, correlationId);
        return response;
      }
    });
  }

  return routeHandler;
}

/**
 * Type for Next.js API route handler function.
 */
export type ApiRouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;
