import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-auth';
import { rateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

interface ApiHandlerOptions {
  /** Require authenticated user */
  requireAuth?: boolean;
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig | keyof typeof RATE_LIMITS;
  /** CSRF protection - validate origin header */
  csrfProtection?: boolean;
}

type RouteContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Promise<any>;
};

type ApiHandler = (
  request: NextRequest,
  context: RouteContext & { userId?: string }
) => Promise<NextResponse>;

/**
 * Wraps an API handler with common middleware:
 * - Authentication check
 * - Rate limiting
 * - CSRF protection (enabled by default for mutations)
 */
export function withApiMiddleware(handler: ApiHandler, options: ApiHandlerOptions = {}) {
  const wrappedHandler = async (request: NextRequest, context: RouteContext) => {
    // CSRF Protection - enabled by default for state-changing requests
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const csrfEnabled = options.csrfProtection ?? isMutating;

    if (csrfEnabled && isMutating) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');

      if (origin && host) {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: 'Invalid request origin' },
            { status: 403 }
          );
        }
      }
    }

    // Rate Limiting
    if (options.rateLimit) {
      const config = typeof options.rateLimit === 'string'
        ? RATE_LIMITS[options.rateLimit]
        : options.rateLimit;

      const identifier = getClientIp(request);
      const rateLimitResult = await rateLimit(`${request.nextUrl.pathname}:${identifier}`, config);

      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
              'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            }
          }
        );
      }
    }

    // Authentication
    let userId: string | undefined;
    if (options.requireAuth) {
      const session = await getSession();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    // Call the actual handler
    return handler(request, { params: context.params, userId });
  };
  return wrappedHandler;
}

/**
 * Helper to create JSON error response
 */
export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Helper to create JSON success response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}
