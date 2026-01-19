/**
 * Edge-Compatible Supabase Auth for Proxy/Middleware
 *
 * This module provides edge-compatible authentication for the proxy.
 * It validates Supabase JWT tokens without requiring database access.
 *
 * Feature flag: USE_SUPABASE_AUTH controls whether this is active.
 */

import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

// Session type for the proxy
export interface ProxySession {
  user: {
    id: string // Supabase auth.users.id
    email?: string
    name?: string
    picture?: string
  }
}

// Request with auth property
export interface AuthenticatedRequest extends NextRequest {
  auth?: ProxySession
}

type ProxyHandler = (
  req: AuthenticatedRequest
) => NextResponse | Promise<NextResponse>

interface CookieToSet {
  name: string
  value: string
  options?: Record<string, unknown>
}

/**
 * Create Supabase client for edge/proxy use.
 * This client reads cookies from the request for auth state.
 */
function createEdgeClient(req: NextRequest) {
  const reqCookies = req.cookies

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return reqCookies.getAll()
        },
        setAll(_cookiesToSet: CookieToSet[]) {
          // Can't set cookies in edge - handled by response
        },
      },
    }
  )
}

/**
 * Supabase auth wrapper for proxy.
 * Drop-in replacement for NextAuth's authEdge.
 *
 * @example
 * ```ts
 * export const proxy = authSupabase((req) => {
 *   const isLoggedIn = !!req.auth
 *   // ... route protection logic
 * })
 * ```
 */
export function authSupabase(handler: ProxyHandler): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const supabase = createEdgeClient(req)

    // Get session from Supabase (reads from cookies)
    const { data: { session }, error } = await supabase.auth.getSession()

    // Attach auth to request
    const authReq = req as AuthenticatedRequest

    if (session?.user) {
      authReq.auth = {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
          picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        },
      }
    } else {
      authReq.auth = undefined
    }

    return handler(authReq)
  }
}

/**
 * Verify JWT directly from Authorization header.
 * Use this for API routes that receive Bearer tokens.
 */
export async function verifyJwt(token: string): Promise<ProxySession | null> {
  try {
    // Use jose for edge-compatible JWT verification
    const { jwtVerify, createRemoteJWKSet } = await import("jose")

    // Supabase uses RS256 with JWKS
    const jwksUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`

    // For performance, we could cache the JWKS
    const JWKS = createRemoteJWKSet(new URL(jwksUrl))

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    })

    // Extract user_metadata from JWT payload
    const userMetadata = (payload.user_metadata || {}) as Record<string, unknown>

    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        name: (userMetadata.name || userMetadata.full_name) as string | undefined,
        picture: (userMetadata.avatar_url || userMetadata.picture) as string | undefined,
      },
    }
  } catch {
    return null
  }
}

// Export types
export type { ProxyHandler }
