import { createApiHandler, ForbiddenError, BadRequestError, RateLimitError, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import {
  initializeScreenplayContent,
  validateScreenplayCreationAccess,
} from "@/lib/screenplay"
import { createScreenplaySchema } from "@/lib/validation"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, request }) => {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const standalone = searchParams.get("standalone")
    const teamId = searchParams.get("teamId")
    const favorites = searchParams.get("favorites")
    const recent = searchParams.get("recent")
    const genre = searchParams.get("genre")
    const hasProject = searchParams.get("hasProject")

    let where: Prisma.ScreenplayWhereInput

    if (projectId) {
      where = { projectId }
    } else if (standalone === "true") {
      where = {
        userId: user.id,
        projectId: null,
      }
    } else if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id,
          },
        },
      })

      if (!membership) {
        throw new ForbiddenError("Access denied")
      }

      where = { teamId }
    } else {
      where = {
        OR: [
          { userId: user.id },
          { team: { members: { some: { userId: user.id } } } },
        ],
      }
    }

    if (favorites === "true") {
      where = { ...where, isFavorite: true }
    }
    if (recent === "true") {
      where = { ...where, lastOpenedAt: { not: null } }
    }
    if (genre) {
      where = { ...where, genre }
    }
    if (hasProject === "true") {
      where = { ...where, projectId: { not: null } }
    } else if (hasProject === "false") {
      where = { ...where, projectId: null }
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    const orderBy: Prisma.ScreenplayOrderByWithRelationInput = recent === "true"
      ? { lastOpenedAt: "desc" }
      : { updatedAt: "desc" }

    const [screenplays, total] = await Promise.all([
      prisma.screenplay.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          wordCount: true,
          synopsis: true,
          logline: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          teamId: true,
          stackId: true,
          isFavorite: true,
          isArchived: true,
          lastOpenedAt: true,
          genre: true,
          author: true,
          type: true,
          season: true,
          episode: true,
          episodeTitle: true,
          seriesId: true,
          series: {
            select: { id: true, title: true },
          },
          project: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.screenplay.count({ where }),
    ])

    return {
      screenplays,
      total,
      hasMore: offset + screenplays.length < total,
    }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createScreenplaySchema,
  handler: async ({ user, data }) => {
    const rateLimitResult = await rateLimit(
      `screenplay-create:${user.id}`,
      RATE_LIMITS.PROJECT_CREATE
    )

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    const accessResult = await validateScreenplayCreationAccess({
      userId: user.id,
      projectId: data.projectId,
      teamId: data.teamId,
    })

    if (!accessResult.allowed) {
      if (accessResult.status === 404) throw new NotFoundError(accessResult.error)
      if (accessResult.status === 403) throw new ForbiddenError(accessResult.error)
      throw new BadRequestError(accessResult.error)
    }

    const authorName = data.author || user.name || "Written by..."
    let finalContent: string
    let wordCount: number

    try {
      const initialized = initializeScreenplayContent({
        content: data.content || "",
        title: data.title,
        author: authorName,
        logline: data.logline || undefined,
      })
      finalContent = initialized.content
      wordCount = initialized.wordCount
    } catch (error) {
      throw new BadRequestError(error instanceof Error ? error.message : "Content initialization failed")
    }

    const screenplay = await prisma.screenplay.create({
      data: {
        title: data.title,
        content: finalContent,
        wordCount,
        synopsis: data.logline || data.synopsis || null,
        logline: data.logline || null,
        author: data.author || authorName,
        userId: user.id,
        projectId: data.projectId || null,
        teamId: data.teamId || null,
        type: data.type || "FILM",
        season: data.season ?? null,
        episode: data.episode ?? null,
        episodeTitle: data.episodeTitle ?? null,
        genre: data.genre ?? null,
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
