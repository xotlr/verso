/**
 * Supabase Server Client
 *
 * Server-side Supabase client with cookie-based auth.
 * Used in Server Components, Server Actions, and API routes.
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

interface CookieToSet {
  name: string
  value: string
  options?: {
    domain?: string
    path?: string
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
    sameSite?: "strict" | "lax" | "none"
  }
}

/**
 * Create a Supabase client for Server Components.
 * This client has read-only cookie access (for reading auth state).
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(_cookiesToSet: CookieToSet[]) {
          // Server Components can't set cookies
          // This is expected - auth state changes happen in Server Actions
        },
      },
    }
  )
}

/**
 * Create a Supabase client for Server Actions and Route Handlers.
 * This client can both read and write cookies.
 */
export async function createServerActionClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                // Ensure cookies work across subdomains
                domain: process.env.NODE_ENV === "production" ? ".verso.ac" : undefined,
              })
            })
          } catch {
            // Called from Server Component - can't set cookies
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase admin client (service role).
 * ONLY use this for server-side operations that need to bypass RLS.
 * Never expose this client to the browser.
 */
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
