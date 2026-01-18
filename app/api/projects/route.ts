import { z } from "zod"
import { Prisma } from "@prisma/client"
import { createApiHandler, ForbiddenError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 1,
  PLUS: 5,
  PRO: 10,
  TEAM: 25,
}

const DEFAULT_PROJECT_ROLES = [
  "director",
  "writer",
  "producer",
  "cinematographer",
  "editor",
] as const

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  teamId: z.string().optional(),
  type: z
    .enum(["FEATURE_FILM", "SHORT_FILM", "TV_SERIES", "STAGE_PLAY", "OTHER"])
    .optional()
    .default("FEATURE_FILM"),
  creatorRole: z.enum(["writer", "director", "producer"]).optional().default("writer"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams }) => {
    const teamId = searchParams.get("teamId")

    let where: Prisma.ProjectWhereInput

    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError("Access denied")
      }

      where = { teamId }
    } else {
      where = {
        OR: [
          { userId: user.id, teamId: null },
          { team: { members: { some: { userId: user.id } } } },
        ],
      }
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        banner: true,
        logo: true,
        type: true,
        status: true,
        budget: true,
        isFavorite: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        roles: {
          select: {
            id: true,
            role: true,
            name: true,
            userId: true,
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { role: "asc" },
        },
        screenplays: {
          take: 3,
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
        },
        _count: {
          select: { screenplays: true, notes: true, schedules: true, budgets: true },
        },
      },
    })

    return projects
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createProjectSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data }) => {
    const { name, description, teamId, type, creatorRole } = data

    if (!teamId) {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { plan: true },
      })

      const plan = userData?.plan || "FREE"
      const limit = PLAN_LIMITS[plan]

      const projectCount = await prisma.project.count({
        where: { userId: user.id, teamId: null },
      })

      if (projectCount >= limit) {
        throw new ForbiddenError(
          `You've reached the limit of ${limit} projects on the ${plan} plan. Upgrade to create more.`
        )
      }
    }

    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: user.id } },
      })

      if (!membership) {
        throw new ForbiddenError("Access denied to team")
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        type,
        userId: user.id,
        teamId: teamId || null,
      },
    })

    const creator = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    })

    await prisma.projectRole.createMany({
      data: DEFAULT_PROJECT_ROLES.map((role) => ({
        projectId: project.id,
        role,
        name: role === creatorRole ? (creator?.name || "Unknown") : "Unfilled",
        userId: role === creatorRole ? user.id : null,
      })),
    })

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "project_created",
        entityId: project.id,
        entityTitle: project.name,
      },
    })

    return project
  },
})
