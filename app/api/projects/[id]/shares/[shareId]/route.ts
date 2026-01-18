import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { ShareRole } from "@prisma/client"

async function canManageShares(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      teamId: true,
    },
  })

  if (!project) {
    return { allowed: false, error: "Project not found", status: 404 }
  }

  if (project.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  const share = await prisma.projectShare.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  })

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  const teamId = project.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    })

    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return { allowed: true, isOwner: false }
    }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

const updateShareSchema = z.object({
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR", "ADMIN"]),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateShareSchema,
  handler: async ({ user, params, data }) => {
    const { id, shareId } = params

    const access = await canManageShares(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Project")
      throw new ForbiddenError(access.error)
    }

    const share = await prisma.projectShare.findUnique({
      where: { id: shareId },
    })

    if (share) {
      if (share.userId === user.id && !access.isOwner) {
        throw new BadRequestError("Cannot change your own permissions")
      }

      const updatedShare = await prisma.projectShare.update({
        where: { id: shareId },
        data: { role: data.role as ShareRole },
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      return updatedShare
    }

    const invite = await prisma.shareInvite.findUnique({
      where: { id: shareId },
    })

    if (invite && invite.projectId === id) {
      const updatedInvite = await prisma.shareInvite.update({
        where: { id: shareId },
        data: { role: data.role as ShareRole },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
        },
      })

      return { type: "invite", invite: updatedInvite }
    }

    throw new NotFoundError("Share")
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, shareId } = params

    const access = await canManageShares(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Project")
      throw new ForbiddenError(access.error)
    }

    const share = await prisma.projectShare.findUnique({
      where: { id: shareId },
    })

    if (share && share.projectId === id) {
      await prisma.projectShare.delete({
        where: { id: shareId },
      })
      return { success: true }
    }

    const invite = await prisma.shareInvite.findUnique({
      where: { id: shareId },
    })

    if (invite && invite.projectId === id) {
      await prisma.shareInvite.delete({
        where: { id: shareId },
      })
      return { success: true }
    }

    throw new NotFoundError("Share")
  },
})
