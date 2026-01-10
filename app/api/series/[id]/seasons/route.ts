import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const createSeasonSchema = z.object({
  number: z.number().int().min(1).max(99),
  title: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "writing", "complete"]).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: seriesId } = params

    const series = await prisma.series.findFirst({
      where: { id: seriesId, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const seasons = await prisma.season.findMany({
      where: { seriesId },
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
      orderBy: { number: "asc" },
    })

    return seasons
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSeasonSchema,
  handler: async ({ user, params, data }) => {
    const { id: seriesId } = params

    const series = await prisma.series.findFirst({
      where: { id: seriesId, userId: user.id },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    const existingSeason = await prisma.season.findFirst({
      where: { seriesId, number: data.number },
    })

    if (existingSeason) {
      throw new BadRequestError(`Season ${data.number} already exists`)
    }

    const season = await prisma.season.create({
      data: {
        number: data.number,
        title: data.title || null,
        description: data.description || null,
        status: data.status || "planning",
        seriesId,
      },
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
