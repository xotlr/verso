import { z } from "zod"
import { createApiHandler, ForbiddenError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

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

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const series = await prisma.series.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        logline: true,
        genre: true,
        format: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: { select: { id: true, name: true } },
        episodes: {
          select: {
            id: true,
            title: true,
            season: true,
            episode: true,
            episodeTitle: true,
            wordCount: true,
            updatedAt: true,
          },
          orderBy: [{ season: "asc" }, { episode: "asc" }],
        },
        _count: { select: { episodes: true } },
      },
    })

    return series
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSeriesSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data }) => {
    const { title, logline, genre, format, projectId } = data

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    })

    const plan = userData?.plan || "FREE"
    const limit = PLAN_LIMITS[plan]

    const seriesCount = await prisma.series.count({
      where: { userId: user.id },
    })

    if (seriesCount >= limit) {
      throw new ForbiddenError(
        `You've reached the limit of ${limit} series on the ${plan} plan. Upgrade to create more.`
      )
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      })
      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    const series = await prisma.series.create({
      data: {
        title,
        logline,
        genre,
        format,
        userId: user.id,
        projectId: projectId || null,
      },
    })

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "series_created",
        entityId: series.id,
        entityTitle: series.title,
      },
    })

    return series
  },
})
