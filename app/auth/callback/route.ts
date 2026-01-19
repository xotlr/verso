/**
 * Supabase Auth Callback Route
 *
 * Handles OAuth callback from Supabase Auth providers (Google).
 * Exchanges the code for a session and redirects to the app.
 */

import { createServerActionClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/home"
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  // Handle OAuth errors
  if (error) {
    console.error("[Auth Callback] OAuth error:", error, errorDescription)
    const loginUrl = new URL("/login", requestUrl.origin)
    loginUrl.searchParams.set("error", error)
    if (errorDescription) {
      loginUrl.searchParams.set("error_description", errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }

  // No code means something went wrong
  if (!code) {
    console.error("[Auth Callback] No code provided")
    return NextResponse.redirect(new URL("/login?error=no_code", requestUrl.origin))
  }

  try {
    const supabase = await createServerActionClient()

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[Auth Callback] Code exchange failed:", exchangeError)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      )
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
    console.error("[Auth Callback] Unexpected error:", error)
    return NextResponse.redirect(new URL("/login?error=unexpected", requestUrl.origin))
  }
}
