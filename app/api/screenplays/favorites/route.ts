import { createApiHandler } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ searchParams, supabase }) => {
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    // RLS automatically filters to accessible screenplays
    const { data: favorites, error } = await supabase
      .from("Screenplay")
      .select(`
        id, title, updatedAt, isFavorite,
        project:Project(id, name)
      `)
      .eq("isFavorite", true)
      .order("updatedAt", { ascending: false })
      .limit(limit)

    if (error) throw error

    return favorites || []
  },
})
