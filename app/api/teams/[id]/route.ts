import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

const updateTeamSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  banner: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  isPublic: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                title: true,
                createdAt: true,
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            coverImage: true,
            createdAt: true,
            _count: { select: { screenplays: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
        invites: {
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
          },
        },
        _count: { select: { projects: true, members: true, invites: true } },
      },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const isMember = team.members.some((m) => m.userId === user.id)
    if (!isMember && team.ownerId !== user.id) {
      throw new ForbiddenError("Access denied")
    }

    return team
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateTeamSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const membership = team.members.find((m) => m.userId === user.id)
    const canEdit =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canEdit) {
      throw new ForbiddenError("Access denied")
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: { select: { projects: true, members: true, invites: true } },
      },
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "team_updated",
      targetType: "settings",
      metadata: { changes: data },
    })

    return updatedTeam
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    if (team.ownerId !== user.id) {
      throw new ForbiddenError("Only the team owner can delete the team")
    }

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "team_deleted",
      metadata: { teamName: team.name },
    })

    await prisma.team.delete({
      where: { id },
    })

    return { success: true }
  },
})
