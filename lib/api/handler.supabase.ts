/**
 * Centralized API route handler factory with Supabase Auth.
 *
 * This is the Supabase Auth version of handler.ts.
 * It uses Supabase for authentication and the Supabase client for database queries.
 *
 * @example
 * // Simple authenticated endpoint
 * export const GET = createApiHandler({
 *   auth: 'required',
 *   handler: async ({ user, supabase }) => {
 *     const { data: items } = await supabase
 *       .from('Item')
 *       .select('*');
 *     return { items };
 *   },
 * });
 */

import { NextRequest, NextResponse } from "next/server"
import { ZodSchema, ZodError } from "zod"
import { getSession, type SessionUser, type Session } from "@/lib/supabase-auth"
import { createServerActionClient } from "@/lib/supabase/server"
import { rateLimit, getClientIp, type RATE_LIMITS } from "@/lib/rate-limit"
import {
  ApiError,
  UnauthorizedError,
  ValidationError,
  RateLimitError,
  InternalError,
  CsrfError,
} from "./errors"
import {
  logger,
  withLogContextAsync,
  generateCorrelationId,
  type LogContext,
} from "@/lib/logger"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Correlation ID header name (matches proxy.ts)
const CORRELATION_ID_HEADER = "x-correlation-id"

type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]

/**
 * Context passed to API handlers.
 */
interface HandlerContext<TData = unknown, TParams = Record<string, string>> {
  /** Authenticated user (only present if auth is 'required' or 'optional' with valid session) */
  user: SessionUser
  /** Supabase client (authenticated with user's session) */
  supabase: SupabaseClient<Database>
  /** Validated request body (only present if schema provided) */
  data: TData
  /** URL route params (e.g., { id: '123' } for /api/items/[id]) */
  params: TParams
  /** URL search params */
  searchParams: URLSearchParams
  /** Original Next.js request */
  request: NextRequest
}

/**
 * Context for optional auth - user may be undefined.
 */
interface OptionalAuthContext<TData = unknown, TParams = Record<string, string>> {
  user: SessionUser | undefined
  supabase: SupabaseClient<Database>
  data: TData
  params: TParams
  searchParams: URLSearchParams
  request: NextRequest
}

/**
 * Context for no auth - user is never present.
 */
interface NoAuthContext<TData = unknown, TParams = Record<string, string>> {
  user: undefined
  supabase: SupabaseClient<Database>
  data: TData
  params: TParams
  searchParams: URLSearchParams
  request: NextRequest
}

/**
 * Handler function type based on auth mode.
 */
type HandlerFn<TData, TParams, TAuth extends "required" | "optional" | "none"> =
  TAuth extends "required"
    ? (ctx: HandlerContext<TData, TParams>) => Promise<unknown>
    : TAuth extends "optional"
      ? (ctx: OptionalAuthContext<TData, TParams>) => Promise<unknown>
      : (ctx: NoAuthContext<TData, TParams>) => Promise<unknown>

/**
 * Configuration for createApiHandler.
 */
interface ApiHandlerConfig<
  TData = unknown,
  TParams = Record<string, string>,
  TAuth extends "required" | "optional" | "none" = "required",
> {
  /**
   * Authentication mode:
   * - 'required': Returns 401 if not authenticated (default)
   * - 'optional': Continues without user if not authenticated
   * - 'none': Skips auth check entirely
   */
  auth?: TAuth

  /**
   * Zod schema for request body validation.
   * Body is parsed and validated before handler is called.
   */
  schema?: ZodSchema<TData>

  /**
   * Rate limiting configuration.
   * Uses user ID for authenticated requests, IP for anonymous.
   */
  rateLimit?: RateLimitConfig

  /**
   * The actual handler function.
   * Return value is automatically wrapped in NextResponse.json().
   * Throw ApiError subclasses for error responses.
   */
  handler: HandlerFn<TData, TParams, TAuth>
}

/**
 * Next.js route context type (App Router style).
 */
type RouteContext = { params: Promise<Record<string, string>> }

/**
 * Creates a standardized API route handler with Supabase Auth.
 * Handles auth, validation, rate limiting, and error responses.
 */
export function createApiHandler<
  TData = unknown,
  TParams extends Record<string, string> = Record<string, string>,
  TAuth extends "required" | "optional" | "none" = "required",
>(config: ApiHandlerConfig<TData, TParams, TAuth>) {
  const {
    auth: authMode = "required",
    schema,
    rateLimit: rateLimitConfig,
    handler,
  } = config

  async function routeHandler(request: NextRequest): Promise<NextResponse>
  async function routeHandler(
    request: NextRequest,
    routeContext: RouteContext
  ): Promise<NextResponse>
  async function routeHandler(
    request: NextRequest,
    routeContext?: RouteContext
  ): Promise<NextResponse> {
    const startTime = performance.now()

    // Get or generate correlation ID
    const correlationId =
      request.headers.get(CORRELATION_ID_HEADER) || generateCorrelationId()

    // Build initial log context
    const logContext: LogContext = {
      correlationId,
      path: new URL(request.url).pathname,
      method: request.method,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    }

    return withLogContextAsync(logContext, async () => {
      let statusCode = 200

      try {
        // 1. CSRF Protection for state-changing methods
        const method = request.method.toUpperCase()
        if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
          const origin = request.headers.get("origin")
          const host = request.headers.get("host")

          if (origin && host) {
            let originHost: string
            try {
              originHost = new URL(origin).host
            } catch {
              logger.security("CSRF: Invalid origin header", {
                origin,
                host,
                method,
              })
              throw new CsrfError("Invalid origin")
            }

            const hostBase = host.split(":")[0]
            const originBase = originHost.split(":")[0]

            const isValidOrigin =
              originBase === hostBase ||
              originBase.endsWith(`.${hostBase}`) ||
              hostBase.endsWith(`.${originBase}`)

            if (!isValidOrigin) {
              logger.security("CSRF: Origin mismatch", {
                origin: originBase,
                host: hostBase,
                method,
              })
              throw new CsrfError("Origin mismatch")
            }
          }
        }

        // 2. Create Supabase client (authenticated based on cookies)
        const supabase = await createServerActionClient()

        // 3. Authentication
        let user: SessionUser | undefined
        let session: Session | null = null

        if (authMode !== "none") {
          session = await getSession()

          if (authMode === "required" && !session?.user?.id) {
            throw new UnauthorizedError()
          }

          if (session?.user?.id) {
            user = session.user
            logContext.userId = user.id

            // Set current user in Supabase context for RLS optimization
            // This is optional - the RLS policies will work without it but this improves performance
            try {
              // Type cast needed since Database types may not define this function
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.rpc as any)("set_current_user", { p_user_id: user.id })
            } catch {
              // Function may not exist during migration - that's OK
            }
          }
        }

        // 4. Rate Limiting
        if (rateLimitConfig) {
          const identifier = user?.id || getClientIp(request)
          const result = await rateLimit(identifier, rateLimitConfig)

          if (!result.success) {
            logger.security("Rate limit exceeded", {
              identifier: user?.id ? "user" : "ip",
              limit: rateLimitConfig.maxRequests,
              windowMs: rateLimitConfig.windowMs,
            })
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
            throw new RateLimitError("Rate limit exceeded", retryAfter)
          }
        }

        // 5. Parse route params
        const params = routeContext?.params
          ? ((await routeContext.params) as TParams)
          : ({} as TParams)

        // 6. Parse and validate request body
        let data: TData = undefined as TData

        if (schema) {
          try {
            const body = await request.json()
            data = schema.parse(body)
          } catch (error) {
            if (error instanceof ZodError) {
              throw new ValidationError("Validation failed", {
                errors: error.issues.map((issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                })),
              })
            }
            if (error instanceof SyntaxError) {
              throw new ValidationError("Invalid JSON body")
            }
            throw error
          }
        }

        // 7. Parse search params
        const searchParams = new URL(request.url).searchParams

        // 8. Call handler
        const context = {
          user,
          supabase,
          data,
          params,
          searchParams,
          request,
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (handler as any)(context)

        // 9. Return response
        const durationMs = Math.round(performance.now() - startTime)
        let response: NextResponse

        if (result instanceof NextResponse) {
          response = result
          statusCode = response.status
        } else {
          response = NextResponse.json(result)
        }

        response.headers.set(CORRELATION_ID_HEADER, correlationId)

        logger.request({
          message: "Request completed",
          statusCode,
          durationMs,
        })

        return response
      } catch (error) {
        const durationMs = Math.round(performance.now() - startTime)

        if (error instanceof ApiError) {
          statusCode = error.status

          if (statusCode >= 500) {
            logger.error("Request failed", error as Error)
          } else if (statusCode >= 400) {
            logger.request({
              message: "Request rejected",
              statusCode,
              durationMs,
              meta: { code: error.code },
            })
          }

          const response = NextResponse.json(error.toJSON(), {
            status: error.status,
          })
          response.headers.set(CORRELATION_ID_HEADER, correlationId)
          if (error instanceof RateLimitError && error.retryAfter) {
            response.headers.set("Retry-After", String(error.retryAfter))
          }
          return response
        }

        statusCode = 500
        logger.error("Unexpected error", error as Error)

        const internalError = new InternalError()
        const response = NextResponse.json(internalError.toJSON(), {
          status: 500,
        })
        response.headers.set(CORRELATION_ID_HEADER, correlationId)
        return response
      }
    })
  }

  return routeHandler
}

export type ApiRouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>
