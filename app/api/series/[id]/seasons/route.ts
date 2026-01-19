import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, handleSupabaseError } from "@/lib/api"

const createSeasonSchema = z.object({
  number: z.number().int().min(1).max(99),
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "writing", "complete"]).optional(),
})

type SeasonData = {
  id: string
  number: number
  title: string | null
  description: string | null
  status: string | null
  createdAt: string
  updatedAt: string
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: seriesId } = params

    const { data: series, error: seriesError } = await supabase
      .from("Series")
      .select("id")
      .eq("id", seriesId)
      .eq("userId", user.id)
      .single()

    if (seriesError?.code === "PGRST116" || !series) {
      throw new NotFoundError("Series")
    }
    if (seriesError) handleSupabaseError(seriesError, "Series")

    const { data: seasons, error: seasonsError } = await supabase
      .from("Season")
      .select("id, number, title, description, status, createdAt, updatedAt")
      .eq("seriesId", seriesId)
      .order("number", { ascending: true })

    if (seasonsError) handleSupabaseError(seasonsError, "Season")

    // Get episodes for each season
    const seasonsWithEpisodes = await Promise.all(
      (seasons || []).map(async (s: SeasonData) => {
        const { data: episodes } = await supabase
          .from("Screenplay")
          .select("id, title, episode, episodeTitle, wordCount, updatedAt, isFavorite")
          .eq("seasonId", s.id)
          .order("episode", { ascending: true })

        return {
          ...s,
          episodes: episodes || [],
          _count: { episodes: episodes?.length || 0 },
        }
      })
    )

    return seasonsWithEpisodes
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSeasonSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: seriesId } = params

    const { data: series, error: seriesError } = await supabase
      .from("Series")
      .select("id")
      .eq("id", seriesId)
      .eq("userId", user.id)
      .single()

    if (seriesError?.code === "PGRST116" || !series) {
      throw new NotFoundError("Series")
    }
    if (seriesError) handleSupabaseError(seriesError, "Series")

    const { data: existingSeason } = await supabase
      .from("Season")
      .select("id")
      .eq("seriesId", seriesId)
      .eq("number", data.number)
      .single()

    if (existingSeason) {
      throw new BadRequestError(`Season ${data.number} already exists`)
    }

    const { data: season, error: createError } = await supabase
      .from("Season")
      .insert({
        number: data.number,
        title: data.title || null,
        description: data.description || null,
        status: data.status || "planning",
        seriesId,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError, "Season")

    // Get episodes (will be empty for new season)
    return {
      ...season,
      episodes: [],
      _count: { episodes: 0 },
    }
  },
})
