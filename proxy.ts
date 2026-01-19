import { authUnified } from "@/lib/auth.edge.unified"
import { NextRequest, NextResponse } from "next/server"

// Correlation ID header name (standard)
const CORRELATION_ID_HEADER = 'x-correlation-id'

/**
 * Generate a unique correlation ID.
 * Format: timestamp-random for sortability and uniqueness.
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

// CSRF protection for API routes
function checkCsrf(request: NextRequest, host: string): NextResponse | null {
  const method = request.method
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (!isMutating) return null

  const origin = request.headers.get('origin')

  // No origin header handling:
  // - Same-origin requests from some browsers may omit Origin
  // - Non-browser clients (curl, Postman, server-to-server) won't have Origin
  // - We rely on auth layer as secondary protection
  //
  // For extra security, check if request looks like it's from a browser
  // Browsers always send these headers, CLI tools often don't
  if (!origin) {
    const secFetchMode = request.headers.get('sec-fetch-mode')
    const secFetchSite = request.headers.get('sec-fetch-site')

    // If Sec-Fetch headers present, this is a modern browser
    // same-origin and same-site requests are safe, others are suspicious
    if (secFetchMode || secFetchSite) {
      // same-origin: request from same origin (safe)
      // same-site: request from same site but different origin (safe for our subdomain setup)
      // cors/navigate with no origin is suspicious
      if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site') {
        console.warn('[CSRF] Browser request without Origin header', {
          path: request.nextUrl.pathname,
          method,
          secFetchMode,
          secFetchSite,
          userAgent: request.headers.get('user-agent')?.slice(0, 100),
        })
        // Block cross-site browser requests without Origin
        return NextResponse.json(
          { error: 'Missing origin header' },
          { status: 403 }
        )
      }
    }

    // No Sec-Fetch headers = likely non-browser client, allow (auth required anyway)
    return null
  }

  try {
    const originUrl = new URL(origin)
    const originHost = originUrl.host

    // Get the base domain for comparison (handle subdomains)
    const getBaseDomain = (h: string) => {
      // Remove app. or www. prefix for comparison
      let domain = h
      if (domain.startsWith('app.')) domain = domain.slice(4)
      if (domain.startsWith('www.')) domain = domain.slice(4)
      return domain
    }

    const requestBaseDomain = getBaseDomain(host)
    const originBaseDomain = getBaseDomain(originHost)

    // Allow if same base domain (handles app.verso.ac -> verso.ac)
    if (requestBaseDomain === originBaseDomain) return null

    // Block cross-origin mutations
    return NextResponse.json(
      { error: 'Cross-origin request blocked' },
      { status: 403 }
    )
  } catch {
    // Invalid origin URL - block
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    )
  }
}

// Security headers to add to all responses
function addSecurityHeaders(response: NextResponse, host: string, correlationId: string): NextResponse {
  // Add correlation ID for request tracing
  response.headers.set(CORRELATION_ID_HEADER, correlationId)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

  // HSTS - only in production (not localhost)
  const isProduction = !host.includes("localhost") && !host.includes("127.0.0.1") && !host.includes("lvh.me")
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }

  // Content Security Policy
  // Note: 'unsafe-inline' needed for Next.js and ProseMirror styles
  // 'unsafe-eval' needed for some Next.js features in development
  const isDev = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("lvh.me")
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: self + inline (Next.js requires this) + eval in dev only
    // 'wasm-unsafe-eval' needed for WASM pagination engine (more secure than 'unsafe-eval' - only allows WASM)
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://challenges.cloudflare.com`,
    // Styles: self + inline (required for ProseMirror and Tailwind)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: allow all HTTPS (standard for user-generated content - images can't execute code)
    "img-src 'self' data: blob: https:",
    // Fonts: self + Google Fonts + jsdelivr (OpenDyslexic)
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    // Connect: API calls to self + Supabase + Stripe + Anthropic
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com",
    // Frames: Stripe for payments
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
    // Objects: none
    "object-src 'none'",
    // Base URI: self only
    "base-uri 'self'",
    // Form actions: self only
    "form-action 'self'",
    // Frame ancestors: none (prevent clickjacking, reinforces X-Frame-Options)
    "frame-ancestors 'none'",
    // Upgrade insecure requests in production
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ]

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "))

  return response
}

// App routes that require authentication
const appRoutes = [
  "/home",
  "/screenplays",
  "/projects",
  "/screenplay",
  "/board",
  "/cards",
  "/graph",
  "/visualization",
  "/settings",
  "/help",
  "/connections",
]

// Legacy route redirects (simple path-to-path mappings)
const legacyRedirects: Record<string, string> = {
  "/recent": "/screenplays?recent=true",
  "/favorites": "/screenplays?favorites=true",
}

// Check if path matches /editor/[id] pattern and extract the ID
function getEditorRedirect(pathname: string): string | null {
  if (pathname.startsWith("/editor/")) {
    const id = pathname.slice("/editor/".length)
    if (id) {
      return `/screenplay/${id}`
    }
  }
  return null
}

// Check if a path is an app route
function isAppRoute(pathname: string): boolean {
  return appRoutes.some((route) => pathname.startsWith(route))
}

// Check if we're on the app subdomain (app.verso.ac or app.lvh.me)
function isAppSubdomain(host: string): boolean {
  // Plain localhost doesn't support subdomain cookies
  // But lvh.me resolves to localhost AND supports subdomain cookies
  if (host.includes("localhost") && !host.includes("lvh.me")) {
    return false
  }
  if (host.includes("127.0.0.1")) {
    return false
  }
  return host.startsWith("app.")
}

// Check if we're on the status subdomain (status.verso.ac or status.lvh.me)
function isStatusSubdomain(host: string): boolean {
  if (host.includes("localhost") && !host.includes("lvh.me")) {
    return false
  }
  if (host.includes("127.0.0.1")) {
    return false
  }
  return host.startsWith("status.")
}

// Get the main domain from host (app.verso.ac -> verso.ac, www.verso.ac -> verso.ac)
function getMainDomain(host: string): string {
  let domain = host
  if (domain.startsWith("app.")) {
    domain = domain.slice(4)
  }
  if (domain.startsWith("www.")) {
    domain = domain.slice(4)
  }
  return domain
}

// Get the app subdomain URL
function getAppUrl(host: string, pathname: string, protocol: string): string {
  const mainDomain = getMainDomain(host)
  if (host.startsWith("app.")) {
    return `${protocol}://${host}${pathname}`
  }
  return `${protocol}://app.${mainDomain}${pathname}`
}

export const proxy = authUnified((req) => {
  const { pathname, searchParams } = req.nextUrl
  const isLoggedIn = !!req.auth
  const host = req.headers.get("host") || ""
  // Use x-forwarded-proto header (set by Vercel) or default to https in production
  const forwardedProto = req.headers.get("x-forwarded-proto")
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https")

  // Generate or propagate correlation ID for request tracing
  const existingCorrelationId = req.headers.get(CORRELATION_ID_HEADER)
  const correlationId = existingCorrelationId || generateCorrelationId()

  // Handle OAuth callback code on root URL (Supabase sometimes redirects here instead of /auth/callback)
  // Forward to the proper callback handler to exchange the code for a session
  const authCode = searchParams.get("code")
  if (authCode && pathname === "/") {
    const callbackUrl = new URL("/auth/callback", req.nextUrl.origin)
    callbackUrl.searchParams.set("code", authCode)
    // Preserve any other params (like error, error_description)
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    if (error) callbackUrl.searchParams.set("error", error)
    if (errorDescription) callbackUrl.searchParams.set("error_description", errorDescription)
    return NextResponse.redirect(callbackUrl)
  }

  // CSRF protection for API routes (except webhooks which have their own verification)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/stripe/webhook")) {
    const csrfError = checkCsrf(req, host)
    if (csrfError) {
      return csrfError
    }
  }

  // Handle status subdomain - rewrite to /status routes
  if (isStatusSubdomain(host)) {
    // API routes pass through for health checks (e.g., /api/health)
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.next(), host, correlationId)
    }

    // status.verso.ac/ → /status
    // status.verso.ac/incidents → /status/incidents (if exists)
    // status.verso.ac/foo → /status/foo
    const statusPath = pathname === "/" ? "/status" : pathname.startsWith("/status") ? pathname : `/status${pathname}`

    return addSecurityHeaders(
      NextResponse.rewrite(new URL(statusPath, req.nextUrl.origin)),
      host,
      correlationId
    )
  }

  // Handle legacy route redirects (before auth checks)
  if (pathname in legacyRedirects) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL(legacyRedirects[pathname], req.nextUrl.origin)),
      host,
      correlationId
    )
  }

  // Handle /editor/[id] -> /screenplay/[id] redirect
  const editorRedirect = getEditorRedirect(pathname)
  if (editorRedirect) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL(editorRedirect, req.nextUrl.origin)),
      host,
      correlationId
    )
  }

  // Determine if we're on app subdomain (only in production)
  const onAppSubdomain = isAppSubdomain(host)

  // If on app subdomain, all routes require auth (except auth callback)
  if (onAppSubdomain) {
    // Allow auth callback route without authentication (it exchanges the code for a session)
    if (pathname === "/auth/callback" || pathname.startsWith("/auth/callback")) {
      return addSecurityHeaders(NextResponse.next(), host, correlationId)
    }

    // Redirect to main domain login if not authenticated
    if (!isLoggedIn) {
      const mainDomain = getMainDomain(host)
      const loginUrl = new URL("/login", `${protocol}://${mainDomain}`)

      // Don't set callbackUrl to auth pages (would cause redirect loop)
      if (pathname !== "/login" && pathname !== "/signup") {
        loginUrl.searchParams.set("callbackUrl", `${protocol}://${host}${pathname}`)
      } else {
        // User went directly to app.*/login - redirect to workspace after login
        loginUrl.searchParams.set("callbackUrl", `${protocol}://${host}/home`)
      }
      return addSecurityHeaders(NextResponse.redirect(loginUrl), host, correlationId)
    }

    // User is authenticated - redirect root to /home
    if (pathname === "/") {
      return addSecurityHeaders(NextResponse.redirect(new URL("/home", req.nextUrl.origin)), host, correlationId)
    }

    // User is authenticated, allow access to app subdomain
    return addSecurityHeaders(NextResponse.next(), host, correlationId)
  }

  // On main domain (or development without subdomain routing)

  // Check if we should use subdomain routing
  // Enable for: production (verso.ac) and lvh.me (local dev with subdomain support)
  // Disable for: plain localhost (no cookie sharing)
  const useSubdomainRouting = host.includes("lvh.me") ||
    (!host.includes("localhost") && !host.includes("127.0.0.1"))

  // If trying to access app routes on main domain, redirect to app subdomain (production only)
  if (useSubdomainRouting && isAppRoute(pathname)) {
    const appUrl = getAppUrl(host, pathname, protocol)
    return addSecurityHeaders(NextResponse.redirect(appUrl), host, correlationId)
  }

  // Redirect to app subdomain if already logged in and trying to access login/signup (production only)
  if (useSubdomainRouting && isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    const appUrl = getAppUrl(host, "/home", protocol)
    return addSecurityHeaders(NextResponse.redirect(appUrl), host, correlationId)
  }

  // Redirect logged-in users from main domain root to app subdomain (production only)
  if (useSubdomainRouting && isLoggedIn && pathname === "/") {
    const appUrl = getAppUrl(host, "/home", protocol)
    return addSecurityHeaders(NextResponse.redirect(appUrl), host, correlationId)
  }

  // In development OR production fallback: protect app routes
  if (isAppRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl), host, correlationId)
  }

  // Redirect logged-in users from login/signup to workspace (in development)
  if (!useSubdomainRouting && isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/home", req.nextUrl.origin)), host, correlationId)
  }

  // Redirect logged-in users from root to /home (in development)
  if (!useSubdomainRouting && isLoggedIn && pathname === "/") {
    return addSecurityHeaders(NextResponse.redirect(new URL("/home", req.nextUrl.origin)), host, correlationId)
  }

  return addSecurityHeaders(NextResponse.next(), host, correlationId)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (images, etc.)
     *
     * API routes are now included for CSRF protection
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
