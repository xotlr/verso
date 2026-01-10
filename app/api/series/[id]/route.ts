import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

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

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const series = await prisma.series.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        title: true,
        logline: true,
        genre: true,
        format: true,
        banner: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: { select: { id: true, name: true } },
        seasons: {
          select: {
            id: true,
            number: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
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
        },
        episodes: {
          select: {
            id: true,
            title: true,
            season: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
            isFavorite: true,
          },
          orderBy: [{ season: "asc" }, { episode: "asc" }],
        },
        _count: { select: { episodes: true, seasons: true } },
      },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    return series
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateSeriesSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const existingSeries = await prisma.series.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingSeries) {
      throw new NotFoundError("Series")
    }

    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, userId: user.id },
      })

      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    const series = await prisma.series.update({
      where: { id },
      data,
    })

    return series
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const series = await prisma.series.findFirst({
      where: { id, userId: user.id },
      include: { _count: { select: { episodes: true } } },
    })

    if (!series) {
      throw new NotFoundError("Series")
    }

    await prisma.screenplay.updateMany({
      where: { seriesId: id },
      data: { seriesId: null },
    })

    await prisma.series.delete({
      where: { id },
    })

    return { success: true }
  },
})
