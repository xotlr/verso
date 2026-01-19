import { createApiHandler } from "@/lib/api"

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email

  const visibleChars = Math.min(3, local.length)
  const masked = local.slice(0, visibleChars) + "***"
  return `${masked}@${domain}`
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return []
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    // Supabase uses ilike for case-insensitive matching
    const { data: users, error } = await supabase
      .from("User")
      .select("id, name, email, image, username")
      .neq("id", user.id)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
      .order("name", { ascending: true })
      .limit(limit)

    if (error) throw error

    type UserResult = { id: string; name: string | null; email: string | null; image: string | null; username: string | null }
    return (users || []).map((u: UserResult) => ({
      ...u,
      email: u.email ? maskEmail(u.email) : null,
    }))
  },
})
