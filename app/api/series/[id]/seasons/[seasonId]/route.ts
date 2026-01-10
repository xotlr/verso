import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateSeasonSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "writing", "complete"]).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: seriesId, seasonId } = params

    const series = await prisma.series.findFirst({
      where: { id: seriesId, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const season = await prisma.season.findFirst({
      where: { id: seasonId, seriesId },
      include: {
        episodes: {
          select: {
            id: true,
            title: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
            isFavorite: true,
          },
          orderBy: { episode: "asc" },
        },
        _count: { select: { episodes: true } },
      },
    })

    if (!season) {
      throw new NotFoundError("Season")
    }

    return season
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSeasonSchema,
  handler: async ({ user, params, data }) => {
    const { id: seriesId, seasonId } = params

    const series = await prisma.series.findFirst({
      where: { id: seriesId, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const existingSeason = await prisma.season.findFirst({
      where: { id: seasonId, seriesId },
    })

    if (!existingSeason) {
      throw new NotFoundError("Season")
    }

    const season = await prisma.season.update({
      where: { id: seasonId },
      data,
      include: {
        episodes: {
          select: {
            id: true,
            title: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: { episode: "asc" },
        },
        _count: { select: { episodes: true } },
      },
    })

    return season
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: seriesId, seasonId } = params

    const series = await prisma.series.findFirst({
      where: { id: seriesId, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const season = await prisma.season.findFirst({
      where: { id: seasonId, seriesId },
      include: {
        _count: { select: { episodes: true } },
        episodes: { select: { id: true } },
      },
    })

    if (!season) {
      throw new NotFoundError("Season")
    }

    if (season._count.episodes > 0) {
      await prisma.screenplay.deleteMany({
        where: { seasonId },
      })
    }

    await prisma.season.delete({
      where: { id: seasonId },
    })

    return { success: true, deletedEpisodes: season._count.episodes }
  },
})
