import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"

const updateSeriesSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  logline: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  format: z
    .enum(["one-hour", "half-hour", "multi-cam", "limited", "anthology"])
    .optional()
    .nullable(),
  projectId: z.string().optional().nullable(),
  banner: z.string().url().optional().nullable(),
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

type EpisodeData = {
  id: string
  title: string
  season: number | null
  episode: number | null
  episodeTitle: string | null
  wordCount: number
  updatedAt: string
  isFavorite: boolean
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: series, error } = await supabase
      .from("Series")
      .select(`
        id, title, logline, genre, format, banner, createdAt, updatedAt, projectId,
        project:Project(id, name)
      `)
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (error?.code === "PGRST116" || !series) {
      throw new NotFoundError("Series")
    }
    if (error) throw error

    // Get seasons with their episodes
    const { data: seasons } = await supabase
      .from("Season")
      .select("id, number, title, description, status, createdAt, updatedAt")
      .eq("seriesId", id)
      .order("number", { ascending: true })

    const seasonsWithEpisodes = await Promise.all(
      (seasons || []).map(async (s: SeasonData) => {
        const { data: episodes } = await supabase
          .from("Screenplay")
          .select("id, title, episode, episodeTitle, wordCount, updatedAt, isFavorite")
          .eq("seriesId", id)
          .eq("seasonId", s.id)
          .order("episode", { ascending: true })

        return {
          ...s,
          episodes: episodes || [],
          _count: { episodes: episodes?.length || 0 },
        }
      })
    )

    // Get all episodes for this series
    const { data: allEpisodes } = await supabase
      .from("Screenplay")
      .select("id, title, season, episode, episodeTitle, wordCount, updatedAt, isFavorite")
      .eq("seriesId", id)
      .order("season", { ascending: true })
      .order("episode", { ascending: true })

    return {
      ...series,
      seasons: seasonsWithEpisodes,
      episodes: allEpisodes || [],
      _count: {
        episodes: allEpisodes?.length || 0,
        seasons: seasons?.length || 0,
      },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSeriesSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const { data: existingSeries, error: fetchError } = await supabase
      .from("Series")
      .select("id")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !existingSeries) {
      throw new NotFoundError("Series")
    }
    if (fetchError) throw fetchError

    if (data.projectId) {
      const { data: project } = await supabase
        .from("Project")
        .select("id")
        .eq("id", data.projectId)
        .eq("userId", user.id)
        .single()

      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    const { data: series, error: updateError } = await supabase
      .from("Series")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    return series
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const { data: series, error: fetchError } = await supabase
      .from("Series")
      .select("id")
      .eq("id", id)
      .eq("userId", user.id)
      .single()

    if (fetchError?.code === "PGRST116" || !series) {
      throw new NotFoundError("Series")
    }
    if (fetchError) throw fetchError

    // Unlink screenplays from series
    await supabase
      .from("Screenplay")
      .update({ seriesId: null })
      .eq("seriesId", id)

    // Delete series
    const { error: deleteError } = await supabase
      .from("Series")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
