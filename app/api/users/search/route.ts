import { createApiHandler, handleSupabaseError, RATE_LIMITS } from "@/lib/api"

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email

  const visibleChars = Math.min(3, local.length)
  const masked = local.slice(0, visibleChars) + "***"
  return `${masked}@${domain}`
}

/**
 * Sanitize search input to prevent SQL injection in ILIKE patterns.
 * Escapes special PostgreSQL pattern characters: %, _, \
 */
function sanitizeSearchInput(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')     // Escape percent signs
    .replace(/_/g, '\\_')     // Escape underscores
}

export const GET = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, searchParams, supabase }) => {
    const rawQuery = searchParams.get("q")?.trim()

    if (!rawQuery || rawQuery.length < 2) {
      return []
    }

    // Sanitize search input to prevent pattern injection
    const query = sanitizeSearchInput(rawQuery)
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    // Use sanitized query in ILIKE patterns
    const { data: users, error } = await supabase
      .from("User")
      .select("id, name, email, image, username")
      .neq("id", user.id)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
      .order("name", { ascending: true })
      .limit(limit)

    if (error) handleSupabaseError(error, "User")

    type UserResult = { id: string; name: string | null; email: string | null; image: string | null; username: string | null }
    return (users || []).map((u: UserResult) => ({
      ...u,
      email: u.email ? maskEmail(u.email) : null,
    }))
  },
})
