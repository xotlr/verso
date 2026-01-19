"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"

// Plan type matching the database
type Plan = "FREE" | "PLUS" | "PRO" | "MAX"

// Session user type - compatible with what components expect
interface SessionUser {
  id: string
  email: string | null
  name: string | null
  image: string | null
  plan: Plan
  username: string | null
}

// Session type
interface AppSession {
  user: SessionUser
  expires: string
}

// Context value type - matches NextAuth's useSession return type
interface AuthContextValue {
  data: AppSession | null
  status: "loading" | "authenticated" | "unauthenticated"
  update: (data?: Partial<SessionUser>) => Promise<AppSession | null>
}

const AuthContext = createContext<AuthContextValue>({
  data: null,
  status: "loading",
  update: async () => null,
})

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AppSession | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")
  const supabase = createClient()

  // Fetch user profile data from the User table
  const fetchUserProfile = useCallback(async (authUser: User): Promise<SessionUser | null> => {
    interface UserProfile {
      id: string
      email: string | null
      name: string | null
      image: string | null
      plan: string | null
      username: string | null
    }
    const result = await supabase
      .from("User")
      .select("id, email, name, image, plan, username")
      .eq("auth_id", authUser.id)
      .single()
    const userProfile = result.data as UserProfile | null

    if (userProfile) {
      return {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        image: userProfile.image,
        plan: (userProfile.plan as Plan) || "FREE",
        username: userProfile.username,
      }
    }

    // Fallback: user exists in auth but not in User table yet
    // This can happen right after OAuth signup before the trigger creates the record
    return {
      id: authUser.id,
      email: authUser.email || null,
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
      image: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      plan: "FREE",
      username: null,
    }
  }, [supabase])

  // Build session from Supabase session
  const buildSession = useCallback(async (supabaseSession: Session | null): Promise<AppSession | null> => {
    if (!supabaseSession?.user) {
      return null
    }

    const user = await fetchUserProfile(supabaseSession.user)
    if (!user) return null

    return {
      user,
      expires: new Date(supabaseSession.expires_at! * 1000).toISOString(),
    }
  }, [fetchUserProfile])

  // Update session (for profile changes)
  const update = useCallback(async (data?: Partial<SessionUser>): Promise<AppSession | null> => {
    const { data: { session: supabaseSession } } = await supabase.auth.getSession()

    if (!supabaseSession) {
      setSession(null)
      setStatus("unauthenticated")
      return null
    }

    // If data provided, update local session optimistically
    if (data && session) {
      const updatedSession: AppSession = {
        ...session,
        user: { ...session.user, ...data },
      }
      setSession(updatedSession)
      return updatedSession
    }

    // Otherwise refresh from database
    const newSession = await buildSession(supabaseSession)
    setSession(newSession)
    setStatus(newSession ? "authenticated" : "unauthenticated")
    return newSession
  }, [supabase, session, buildSession])

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const appSession = await buildSession(supabaseSession)
      setSession(appSession)
      setStatus(appSession ? "authenticated" : "unauthenticated")
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      console.log("[AuthProvider] Auth state change:", event)

      if (event === "SIGNED_OUT") {
        setSession(null)
        setStatus("unauthenticated")
      } else if (supabaseSession) {
        const appSession = await buildSession(supabaseSession)
        setSession(appSession)
        setStatus(appSession ? "authenticated" : "unauthenticated")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, buildSession])

  return (
    <AuthContext.Provider value={{ data: session, status, update }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access the current session.
 * Drop-in replacement for NextAuth's useSession.
 *
 * @example
 * ```tsx
 * const { data: session, status } = useSession()
 * if (status === "loading") return <Loading />
 * if (!session) return <SignIn />
 * return <div>Hello {session.user.name}</div>
 * ```
 */
export function useSession() {
  return useContext(AuthContext)
}

/**
 * Hook that requires authentication.
 * Throws if not authenticated.
 */
export function useRequiredSession() {
  const { data, status } = useSession()

  if (status === "loading") {
    return { data: null, status }
  }

  if (!data) {
    throw new Error("useRequiredSession must be used within an authenticated context")
  }

  return { data, status }
}

/**
 * Sign out the current user.
 * Drop-in replacement for NextAuth's signOut.
 */
export async function signOut(options?: { callbackUrl?: string }) {
  const supabase = createClient()
  await supabase.auth.signOut()

  // Redirect to callback URL or home
  if (typeof window !== "undefined") {
    window.location.href = options?.callbackUrl || "/"
  }
}
