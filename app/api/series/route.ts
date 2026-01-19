import { z } from "zod"
import { createApiHandler, ForbiddenError, RATE_LIMITS, handleSupabaseError } from "@/lib/api"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 2,
  PLUS: 10,
  PRO: 25,
  MAX: 100,
}

const plannedSeasonSchema = z.object({
  seasonNumber: z.number().int().min(1).max(99),
  episodeCount: z.number().int().min(1).max(30),
})

const createSeriesSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  logline: z.string().optional(),
  genre: z.string().optional(),
  format: z.enum(["one-hour", "half-hour", "multi-cam"]).optional(),
  projectId: z.string().optional(),
  plannedSeasons: z.array(plannedSeasonSchema).optional(),
})

type SeriesData = {
  id: string
  title: string
  logline: string | null
  genre: string | null
  format: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  projectId: string | null
  project: { id: string; name: string } | null
}

type EpisodeData = {
  id: string
  title: string
  season: number | null
  episode: number | null
  episodeTitle: string | null
  wordCount: number
  updatedAt: string
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: seriesList, error } = await supabase
      .from("Series")
      .select(`
        id, title, logline, genre, format, isFavorite, createdAt, updatedAt, projectId,
        project:Project(id, name)
      `)
      .eq("userId", user.id)
      .order("isFavorite", { ascending: false })
      .order("updatedAt", { ascending: false })

    if (error) handleSupabaseError(error, "Series")

    // Get episodes for each series
    const seriesWithEpisodes = await Promise.all(
      (seriesList || []).map(async (s: SeriesData) => {
        const { data: episodes } = await supabase
          .from("Screenplay")
          .select("id, title, season, episode, episodeTitle, wordCount, updatedAt")
          .eq("seriesId", s.id)
          .order("season", { ascending: true })
          .order("episode", { ascending: true })

        return {
          ...s,
          episodes: episodes || [],
          _count: { episodes: episodes?.length || 0 },
        }
      })
    )

    return seriesWithEpisodes
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSeriesSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data, supabase }) => {
    const { title, logline, genre, format, projectId } = data

    const { data: userData } = await supabase
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single()

    const plan = userData?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    const { count: seriesCount } = await supabase
      .from("Series")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)

    if ((seriesCount || 0) >= limit) {
      throw new ForbiddenError(
        `You've reached the limit of ${limit} series on the ${plan} plan. Upgrade to create more.`
      )
    }

    if (projectId) {
      const { data: project } = await supabase
        .from("Project")
        .select("id")
        .eq("id", projectId)
        .eq("userId", user.id)
        .single()

      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    const { data: series, error: createError } = await supabase
      .from("Series")
      .insert({
        title,
        logline,
        genre,
        format,
        userId: user.id,
        projectId: projectId || null,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError, "Series")

    await supabase.from("Activity").insert({
      userId: user.id,
      type: "series_created",
      entityId: series.id,
      entityTitle: series.title,
    })

    return series
  },
})
