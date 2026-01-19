/**
 * Supabase Auth Utilities
 *
 * Server-side authentication utilities that replace NextAuth.
 * Provides a compatible API for auth checking in API routes and Server Components.
 */

import { createServerComponentClient, createServerActionClient, createServiceRoleClient } from "@/lib/supabase/server"
import type { User as SupabaseUser } from "@supabase/supabase-js"

// Plan type (matches Prisma enum)
export type Plan = "FREE" | "PLUS" | "PRO" | "MAX"

/**
 * Session user type - compatible with NextAuth session.user
 */
export interface SessionUser {
  id: string
  email: string | null
  name: string | null
  image: string | null
  plan: Plan
  username: string | null
}

/**
 * Session type - compatible with NextAuth Session
 */
export interface Session {
  user: SessionUser
  expires: string
}

/**
 * Get the current session from Supabase Auth.
 * Returns null if not authenticated.
 *
 * @example
 * ```ts
 * const session = await getSession()
 * if (!session) {
 *   redirect('/login')
 * }
 * ```
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createServerComponentClient()

  const { data: { session: supabaseSession }, error } = await supabase.auth.getSession()

  if (error || !supabaseSession) {
    return null
  }

  // Get app user data (plan, username, etc.)
  const { data: user } = await supabase
    .from("User")
    .select("id, email, name, image, plan, username")
    .eq("auth_id", supabaseSession.user.id)
    .single()

  if (!user) {
    return null
  }

  // Type assertion for the user data from Supabase
  const userData = user as {
    id: string
    email: string | null
    name: string | null
    image: string | null
    plan: string
    username: string | null
  }

  return {
    user: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      image: userData.image,
      plan: userData.plan as Plan,
      username: userData.username,
    },
    expires: new Date(supabaseSession.expires_at! * 1000).toISOString(),
  }
}

/**
 * Get the current authenticated user.
 * Returns null if not authenticated.
 * This is a lighter-weight alternative to getSession() when you only need the user.
 */
export async function getUser(): Promise<SessionUser | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Require authentication. Returns the session or throws.
 * Use in Server Actions and API routes where auth is mandatory.
 *
 * @example
 * ```ts
 * export async function createScreenplay(data: ScreenplayInput) {
 *   const session = await requireAuth()
 *   // session.user.id is guaranteed to exist
 * }
 * ```
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession()

  if (!session) {
    throw new AuthenticationError("Not authenticated")
  }

  return session
}

/**
 * Get the current user ID. Returns null if not authenticated.
 * Lightweight helper for common use case.
 */
export async function getUserId(): Promise<string | null> {
  const user = await getUser()
  return user?.id ?? null
}

/**
 * Require authentication and return just the user ID.
 */
export async function requireUserId(): Promise<string> {
  const session = await requireAuth()
  return session.user.id
}

/**
 * Check if user has a specific plan or higher.
 */
const PLAN_HIERARCHY: Plan[] = ["FREE", "PLUS", "PRO", "MAX"]

export function hasMinPlan(userPlan: Plan, minPlan: Plan): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(minPlan)
}

/**
 * Require a minimum plan level.
 */
export async function requirePlan(minPlan: Plan): Promise<Session> {
  const session = await requireAuth()

  if (!hasMinPlan(session.user.plan, minPlan)) {
    throw new PlanRequiredError(minPlan, session.user.plan)
  }

  return session
}

/**
 * Custom error for authentication failures.
 */
export class AuthenticationError extends Error {
  constructor(message: string = "Not authenticated") {
    super(message)
    this.name = "AuthenticationError"
  }
}

/**
 * Custom error for plan requirement failures.
 */
export class PlanRequiredError extends Error {
  constructor(
    public required: Plan,
    public current: Plan
  ) {
    super(`Plan ${required} required. Current plan: ${current}`)
    this.name = "PlanRequiredError"
  }
}

// =============================================================================
// Sign In / Sign Out Functions
// =============================================================================

/**
 * Sign in with email and password.
 * For use in Server Actions.
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = await createServerActionClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new AuthenticationError(error.message)
  }

  return data
}

/**
 * Sign in with OAuth provider (Google).
 * Returns the URL to redirect the user to.
 */
export async function getOAuthSignInUrl(provider: "google", redirectTo?: string) {
  const supabase = await createServerActionClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    throw new AuthenticationError(error.message)
  }

  return data.url
}

/**
 * Sign up with email and password.
 */
export async function signUp(email: string, password: string, metadata?: { name?: string }) {
  const supabase = await createServerActionClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    throw new AuthenticationError(error.message)
  }

  return data
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const supabase = await createServerActionClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new AuthenticationError(error.message)
  }
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(email: string) {
  const supabase = await createServerActionClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    throw new AuthenticationError(error.message)
  }
}

/**
 * Update the user's password (after reset).
 */
export async function updatePassword(newPassword: string) {
  const supabase = await createServerActionClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new AuthenticationError(error.message)
  }
}

// =============================================================================
// Session Refresh
// =============================================================================

/**
 * Refresh the current session.
 * Call this to extend the session before it expires.
 */
export async function refreshSession() {
  const supabase = await createServerActionClient()

  const { data, error } = await supabase.auth.refreshSession()

  if (error) {
    throw new AuthenticationError(error.message)
  }

  return data
}

// =============================================================================
// User Update Functions
// =============================================================================

/**
 * Update the current user's profile in the database.
 */
export async function updateUserProfile(updates: {
  name?: string
  image?: string
  username?: string
}) {
  const session = await requireAuth()
  const supabase = await createServerActionClient()

  // Build update object with proper typing
  const updateData: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  }
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.image !== undefined) updateData.image = updates.image
  if (updates.username !== undefined) updateData.username = updates.username

  // Use type assertion since Database types may not be fully defined
  const { error } = await (supabase
    .from("User") as ReturnType<typeof supabase.from>)
    .update(updateData as Record<string, unknown>)
    .eq("id", session.user.id)

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }
}

// =============================================================================
// Session Token Access (for session tracking)
// =============================================================================

/**
 * Get the current Supabase session's access token.
 * Used for session tracking to identify the current session.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createServerComponentClient()

  const { data: { session } } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

// =============================================================================
// Edge-Compatible Auth Check
// =============================================================================

/**
 * Verify JWT from request headers (for proxy/middleware).
 * This is edge-compatible and doesn't require database access.
 */
export async function verifyJwtFromRequest(request: Request): Promise<SupabaseUser | null> {
  const authHeader = request.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)

  // Import jose for edge-compatible JWT verification
  const { jwtVerify } = await import("jose")

  try {
    const jwtSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
    const { payload } = await jwtVerify(token, jwtSecret)

    // Extract user from JWT payload
    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      app_metadata: payload.app_metadata as Record<string, unknown>,
      user_metadata: payload.user_metadata as Record<string, unknown>,
      aud: payload.aud as string,
      created_at: "",
    } as SupabaseUser
  } catch {
    return null
  }
}
