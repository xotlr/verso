import { z } from "zod"
import { createApiHandler, RATE_LIMITS, handleSupabaseError } from "@/lib/api"
import { MAX_PAGINATION_OFFSET } from "@/lib/constants"

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

const exploreQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(MAX_PAGINATION_OFFSET).default(0),
  genre: z.string().max(100).optional(),
  search: z.string().max(200).optional(), // Reduced max length
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
      // Don't expose validation details to prevent schema leakage
      return { error: "Invalid query parameters" }
    }

    const { limit, offset, genre, search, type } = queryResult.data

    if (type === "genres") {
      const { data: genreData, error } = await supabase
        .from("Screenplay")
        .select("genre")
        .eq("isPublic", true)
        .not("genre", "is", null)

      if (error) handleSupabaseError(error, "Explore")

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
      const sanitizedSearch = sanitizeSearchInput(search)
      query = query.or(`title.ilike.%${sanitizedSearch}%,synopsis.ilike.%${sanitizedSearch}%`)
    }

    const { data: screenplays, count, error } = await query

    if (error) handleSupabaseError(error, "Explore")

    const total = count || 0

    return {
      screenplays: screenplays || [],
      total,
      hasMore: offset + (screenplays?.length || 0) < total,
    }
  },
})
