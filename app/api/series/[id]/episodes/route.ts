import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const createEpisodeSchema = z.object({
  season: z.number().int().min(1).max(99),
  episode: z.number().int().min(1).max(999),
  episodeTitle: z.string().min(1, "Episode title is required").max(255),
})

export const POST = createApiHandler({
  auth: "required",
  schema: createEpisodeSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, params, data }) => {
    const { id: seriesId } = params

    const series = await prisma.series.findFirst({
      where: { id: seriesId, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const existingEpisode = await prisma.screenplay.findFirst({
      where: { seriesId, season: data.season, episode: data.episode },
    })

    if (existingEpisode) {
      throw new BadRequestError(
        `S${String(data.season).padStart(2, "0")}E${String(data.episode).padStart(2, "0")} already exists`
      )
    }

    let format = "tv-one-hour"
    if (series.format === "half-hour") {
      format = "tv-half-hour"
    } else if (series.format === "multi-cam") {
      format = "tv-multi-cam"
    }

    const title = `${series.title} - S${String(data.season).padStart(2, "0")}E${String(data.episode).padStart(2, "0")} - ${data.episodeTitle}`

    const screenplay = await prisma.screenplay.create({
      data: {
        title,
        content: "",
        userId: user.id,
        seriesId,
        type: "TV",
        format,
        season: data.season,
        episode: data.episode,
        episodeTitle: data.episodeTitle,
        genre: series.genre,
      },
    })

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "screenplay_created",
        entityId: screenplay.id,
        entityTitle: screenplay.title,
      },
    })

    return screenplay
  },
})
