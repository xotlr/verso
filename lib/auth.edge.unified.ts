/**
 * Unified Edge Auth for Proxy
 *
 * This module provides authentication for the proxy using Supabase Auth.
 *
 * Interface:
 * - req.auth: { user: { id, email, name, picture } } | undefined
 */

import { NextRequest, NextResponse } from "next/server"
import { authSupabase, type AuthenticatedRequest } from "@/lib/auth.edge.supabase"

// Export the same interface as the auth system
export type { AuthenticatedRequest }

type ProxyHandler = (req: AuthenticatedRequest) => NextResponse | Promise<NextResponse>

/**
 * Auth wrapper for proxy using Supabase Auth.
 */
export function authUnified(handler: ProxyHandler): (req: NextRequest) => Promise<NextResponse> {
  return authSupabase(handler)
}

export { authUnified as auth }
