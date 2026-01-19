/**
 * Supabase Client for Client-Side Operations
 *
 * Browser-side Supabase client with cookie-based auth.
 * Used for real-time collaboration, data fetching, and auth operations.
 */

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Create a Supabase client for browser use.
 * This client handles auth cookies automatically.
 *
 * Singleton pattern ensures only one client instance exists.
 */
export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  interface CookieToSet {
    name: string
    value: string
    options?: { maxAge?: number; sameSite?: string; secure?: boolean }
  }

  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return []
        return document.cookie.split("; ").map((cookie) => {
          const [name, ...rest] = cookie.split("=")
          return { name, value: rest.join("=") }
        })
      },
      setAll(cookies: CookieToSet[]) {
        if (typeof document === "undefined") return
        for (const cookie of cookies) {
          document.cookie = `${cookie.name}=${cookie.value}; path=/; ${cookie.options?.maxAge ? `max-age=${cookie.options.maxAge};` : ""} ${cookie.options?.sameSite ? `samesite=${cookie.options.sameSite};` : ""} ${cookie.options?.secure ? "secure;" : ""}`
        }
      },
    },
    auth: {
      // Persist session in cookies (handled by @supabase/ssr)
      persistSession: true,
      // Auto refresh tokens before they expire
      autoRefreshToken: true,
      // Detect session from URL (for OAuth callbacks)
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Throttle events for performance
      },
    },
  })

  return supabaseClient
}

/**
 * Get the Supabase client instance.
 * Alias for createClient() for semantic clarity.
 */
export function getClient() {
  return createClient()
}

/**
 * Reset the client instance.
 * Useful for testing or after sign out.
 */
export function resetClient() {
  supabaseClient = null
}
