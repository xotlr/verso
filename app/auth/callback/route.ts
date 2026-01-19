/**
 * Supabase Auth Callback Route
 *
 * Handles OAuth callback from Supabase Auth providers (Google).
 * Exchanges the code for a session and redirects to the app.
 *
 * SECURITY: Uses structured logger (never console), generic error codes to users
 */

import { createServerActionClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { logLoginSuccess } from "@/lib/security-events"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/home"
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  // Handle OAuth errors - log details server-side, generic code to user
  if (error) {
    logger.security("OAuth callback error", {
      error,
      errorDescription,
      // Don't log full URL to avoid leaking state tokens
    })
    // Return generic error code - don't expose OAuth provider error details
    return NextResponse.redirect(new URL("/login?error=oauth_failed", requestUrl.origin))
  }

  // No code means something went wrong
  if (!code) {
    logger.security("OAuth callback missing code")
    return NextResponse.redirect(new URL("/login?error=oauth_failed", requestUrl.origin))
  }

  try {
    const supabase = await createServerActionClient()

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logger.error("OAuth code exchange failed", exchangeError)
      // Return generic error - don't expose Supabase error details to client
      return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin))
    }

    // Log successful OAuth login (fire-and-forget)
    if (data?.user?.id) {
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined
      const userAgent = request.headers.get("user-agent") || undefined
      const provider = data.user.app_metadata?.provider || "oauth"

      // Get internal user ID from auth ID
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("authId", data.user.id)
        .single() as { data: { id: string } | null }

      if (userData?.id) {
        void logLoginSuccess(userData.id, "oauth", ipAddress, userAgent, provider)
      }
    }

    // Determine redirect URL
    // In production, redirect to app subdomain
    const host = request.headers.get("host") || ""
    const isProduction = !host.includes("localhost") && !host.includes("127.0.0.1")

    let redirectUrl: URL
    if (isProduction && !host.startsWith("app.")) {
      // Redirect to app subdomain
      const appHost = `app.${host.replace(/^www\./, "")}`
      redirectUrl = new URL(next, `https://${appHost}`)
    } else {
      redirectUrl = new URL(next, requestUrl.origin)
    }

    // Create response with redirect
    const response = NextResponse.redirect(redirectUrl)

    return response
  } catch (error) {
    logger.error("OAuth callback unexpected error", error instanceof Error ? error : undefined)
    return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin))
  }
}
