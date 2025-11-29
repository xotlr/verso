import { authEdge } from "@/lib/auth.edge"
import { NextResponse } from "next/server"

// Security headers to add to all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
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

export default authEdge((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const host = req.headers.get("host") || ""
  // Use x-forwarded-proto header (set by Vercel) or default to https in production
  const forwardedProto = req.headers.get("x-forwarded-proto")
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https")

  // Handle legacy route redirects (before auth checks)
  if (pathname in legacyRedirects) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL(legacyRedirects[pathname], req.nextUrl.origin))
    )
  }

  // Handle /editor/[id] -> /screenplay/[id] redirect
  const editorRedirect = getEditorRedirect(pathname)
  if (editorRedirect) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL(editorRedirect, req.nextUrl.origin))
    )
  }

  // Determine if we're on app subdomain (only in production)
  const onAppSubdomain = isAppSubdomain(host)

  // If on app subdomain, all routes require auth
  if (onAppSubdomain) {
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
      return addSecurityHeaders(NextResponse.redirect(loginUrl))
    }

    // User is authenticated, allow access to app subdomain
    return addSecurityHeaders(NextResponse.next())
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
    return addSecurityHeaders(NextResponse.redirect(appUrl))
  }

  // Redirect to app subdomain if already logged in and trying to access login/signup (production only)
  if (useSubdomainRouting && isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    const appUrl = getAppUrl(host, "/home", protocol)
    return addSecurityHeaders(NextResponse.redirect(appUrl))
  }

  // In development OR production fallback: protect app routes
  if (isAppRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  // Redirect logged-in users from login/signup to workspace (in development)
  if (!useSubdomainRouting && isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/home", req.nextUrl.origin)))
  }

  return addSecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
}
