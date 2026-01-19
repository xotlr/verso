import { createApiHandler } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10)

    // RLS automatically filters to accessible screenplays
    const { data: recentScreenplays, error } = await supabase
      .from("Screenplay")
      .select(`
        id, title, lastOpenedAt, isFavorite,
        project:Project(id, name)
      `)
      .not("lastOpenedAt", "is", null)
      .order("lastOpenedAt", { ascending: false })
      .limit(limit)

    if (error) throw error

    return recentScreenplays || []
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    // Clear lastOpenedAt for user's own screenplays only
    const { error } = await supabase
      .from("Screenplay")
      .update({ lastOpenedAt: null })
      .eq("userId", user.id)

    if (error) throw error

    return { success: true }
  },
})
