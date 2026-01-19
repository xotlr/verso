import { z } from "zod"
import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

const updateSeasonSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "writing", "complete"]).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: seriesId, seasonId } = params

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

    const { data: season, error: seasonError } = await supabase
      .from("Season")
      .select("id, number, title, description, status, createdAt, updatedAt")
      .eq("id", seasonId)
      .eq("seriesId", seriesId)
      .single()

    if (seasonError?.code === "PGRST116" || !season) {
      throw new NotFoundError("Season")
    }
    if (seasonError) handleSupabaseError(seasonError, "Season")

    // Get episodes
    const { data: episodes } = await supabase
      .from("Screenplay")
      .select("id, title, episode, episodeTitle, wordCount, updatedAt, isFavorite")
      .eq("seasonId", seasonId)
      .order("episode", { ascending: true })

    return {
      ...season,
      episodes: episodes || [],
      _count: { episodes: episodes?.length || 0 },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSeasonSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: seriesId, seasonId } = params

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

    const { data: existingSeason, error: fetchError } = await supabase
      .from("Season")
      .select("id")
      .eq("id", seasonId)
      .eq("seriesId", seriesId)
      .single()

    if (fetchError?.code === "PGRST116" || !existingSeason) {
      throw new NotFoundError("Season")
    }
    if (fetchError) handleSupabaseError(fetchError, "Season")

    const { data: season, error: updateError } = await supabase
      .from("Season")
      .update(data)
      .eq("id", seasonId)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "Season")

    // Get episodes
    const { data: episodes } = await supabase
      .from("Screenplay")
      .select("id, title, episode, episodeTitle, wordCount, updatedAt")
      .eq("seasonId", seasonId)
      .order("episode", { ascending: true })

    return {
      ...season,
      episodes: episodes || [],
      _count: { episodes: episodes?.length || 0 },
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: seriesId, seasonId } = params

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

    const { data: season, error: fetchError } = await supabase
      .from("Season")
      .select("id")
      .eq("id", seasonId)
      .eq("seriesId", seriesId)
      .single()

    if (fetchError?.code === "PGRST116" || !season) {
      throw new NotFoundError("Season")
    }
    if (fetchError) handleSupabaseError(fetchError, "Season")

    // Count episodes
    const { count: episodeCount } = await supabase
      .from("Screenplay")
      .select("*", { count: "exact", head: true })
      .eq("seasonId", seasonId)

    // Delete episodes if any
    if ((episodeCount || 0) > 0) {
      await supabase
        .from("Screenplay")
        .delete()
        .eq("seasonId", seasonId)
    }

    // Delete season
    const { error: deleteError } = await supabase
      .from("Season")
      .delete()
      .eq("id", seasonId)

    if (deleteError) handleSupabaseError(deleteError, "Season")

    return { success: true, deletedEpisodes: episodeCount || 0 }
  },
})
