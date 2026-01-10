import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: { members: { where: { userId } } },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  status: z
    .enum([
      "DEVELOPMENT",
      "PRE_PRODUCTION",
      "PRODUCTION",
      "POST_PRODUCTION",
      "COMPLETED",
    ])
    .optional(),
  budget: z.number().min(0).optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const hasAccess = await hasProjectAccess(id, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        banner: true,
        logo: true,
        status: true,
        budget: true,
        isPublic: true,
        publishedAt: true,
        userId: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        team: { select: { id: true, name: true } },
        screenplays: {
          select: {
            id: true,
            title: true,
            logline: true,
            synopsis: true,
            wordCount: true,
            genre: true,
            isFavorite: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        notes: {
          select: {
            id: true,
            title: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        schedules: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        budgets: {
          select: {
            id: true,
            title: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
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
        _count: {
          select: { screenplays: true, notes: true, schedules: true, budgets: true },
        },
      },
    })

    return project
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateProjectSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const hasAccess = await hasProjectAccess(id, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    })

    return project
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: {
          include: { members: { where: { userId: user.id } } },
        },
      },
    })

    if (!project) {
      throw new NotFoundError("Project")
    }

    const isOwner = project.userId === user.id
    const isTeamAdmin =
      project.team?.members[0]?.role === "OWNER" ||
      project.team?.members[0]?.role === "ADMIN"

    if (!isOwner && !isTeamAdmin) {
      throw new ForbiddenError("Only project owner or team admins can delete")
    }

    await prisma.project.delete({
      where: { id },
    })

    return { success: true }
  },
})
