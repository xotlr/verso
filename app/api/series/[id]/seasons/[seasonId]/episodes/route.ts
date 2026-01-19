import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, RATE_LIMITS, handleSupabaseError } from "@/lib/api"

const createEpisodeSchema = z.object({
  episode: z.number().int().min(1).max(999),
  episodeTitle: z.string().min(1, "Episode title is required").max(255),
})

export const POST = createApiHandler({
  auth: "required",
  schema: createEpisodeSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, params, data, supabase }) => {
    const { id: seriesId, seasonId } = params

    const { data: series, error: seriesError } = await supabase
      .from("Series")
      .select("id, title, format, genre")
      .eq("id", seriesId)
      .eq("userId", user.id)
      .single()

    if (seriesError?.code === "PGRST116" || !series) {
      throw new NotFoundError("Series")
    }
    if (seriesError) handleSupabaseError(seriesError, "Series")

    const { data: season, error: seasonError } = await supabase
      .from("Season")
      .select("id, number")
      .eq("id", seasonId)
      .eq("seriesId", seriesId)
      .single()

    if (seasonError?.code === "PGRST116" || !season) {
      throw new NotFoundError("Season")
    }
    if (seasonError) handleSupabaseError(seasonError, "Season")

    const { data: existingEpisode } = await supabase
      .from("Screenplay")
      .select("id")
      .eq("seasonId", seasonId)
      .eq("episode", data.episode)
      .single()

    if (existingEpisode) {
      throw new BadRequestError(
        `S${String(season.number).padStart(2, "0")}E${String(data.episode).padStart(2, "0")} already exists`
      )
    }

    let format = "tv-one-hour"
    if (series.format === "half-hour") {
      format = "tv-half-hour"
    } else if (series.format === "multi-cam") {
      format = "tv-multi-cam"
    }

    const title = `${series.title} - S${String(season.number).padStart(2, "0")}E${String(data.episode).padStart(2, "0")} - ${data.episodeTitle}`

    const { data: screenplay, error: createError } = await supabase
      .from("Screenplay")
      .insert({
        title,
        content: "",
        userId: user.id,
        seriesId,
        seasonId,
        type: "TV",
        format,
        season: season.number,
        episode: data.episode,
        episodeTitle: data.episodeTitle,
        genre: series.genre,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError, "Screenplay")

    await supabase.from("Activity").insert({
      userId: user.id,
      type: "screenplay_created",
      entityId: screenplay.id,
      entityTitle: screenplay.title,
    })

    return screenplay
  },
})
