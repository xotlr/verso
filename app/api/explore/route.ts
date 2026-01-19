import { z } from "zod"
import { createApiHandler, RATE_LIMITS } from "@/lib/api"

const exploreQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  genre: z.string().max(100).optional(),
  search: z.string().max(500).optional(),
  type: z.enum(["screenplays", "genres"]).default("screenplays"),
})

export const GET = createApiHandler({
  auth: "none",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ searchParams, supabase }) => {
    const queryResult = exploreQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      genre: searchParams.get("genre") || undefined,
      search: searchParams.get("search") || undefined,
      type: searchParams.get("type") || undefined,
    })

    if (!queryResult.success) {
      return { error: "Invalid query parameters", details: queryResult.error.issues }
    }

    const { limit, offset, genre, search, type } = queryResult.data

    if (type === "genres") {
      const { data: genreData, error } = await supabase
        .from("Screenplay")
        .select("genre")
        .eq("isPublic", true)
        .not("genre", "is", null)

      if (error) throw error

      // Get distinct genres
      const uniqueGenres = [...new Set((genreData || []).map((g: { genre: string | null }) => g.genre).filter(Boolean))]
      return { genres: uniqueGenres }
    }

    // Build query for screenplays
    let query = supabase
      .from("Screenplay")
      .select(`
        id,
        title,
        synopsis,
        genre,
        views,
        publishedAt,
        user:User!userId(id, name, image)
      `, { count: "exact" })
      .eq("isPublic", true)
      .order("views", { ascending: false })
      .order("publishedAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (genre) {
      query = query.eq("genre", genre)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,synopsis.ilike.%${search}%`)
    }

    const { data: screenplays, count, error } = await query

    if (error) throw error

    const total = count || 0

    return {
      screenplays: screenplays || [],
      total,
      hasMore: offset + (screenplays?.length || 0) < total,
    }
  },
})
