import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { ShareRole } from "@prisma/client"

async function canManageShares(seriesId: string, userId: string) {
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: {
      userId: true,
      project: { select: { teamId: true } },
    },
  })

  if (!series) {
    return { allowed: false, error: "Series not found", status: 404 }
  }

  if (series.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  const share = await prisma.seriesShare.findUnique({
    where: {
      seriesId_userId: {
        seriesId,
        userId,
      },
    },
  })

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  const teamId = series.project?.teamId
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
      if (access.status === 404) throw new NotFoundError("Series")
      throw new ForbiddenError(access.error)
    }

    const share = await prisma.seriesShare.findUnique({
      where: { id: shareId },
    })

    if (share) {
      if (share.userId === user.id && !access.isOwner) {
        throw new BadRequestError("Cannot change your own permissions")
      }

      const updatedShare = await prisma.seriesShare.update({
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

    if (invite && invite.seriesId === id) {
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
      if (access.status === 404) throw new NotFoundError("Series")
      throw new ForbiddenError(access.error)
    }

    const share = await prisma.seriesShare.findUnique({
      where: { id: shareId },
    })

    if (share && share.seriesId === id) {
      await prisma.seriesShare.delete({
        where: { id: shareId },
      })
      return { success: true }
    }

    const invite = await prisma.shareInvite.findUnique({
      where: { id: shareId },
    })

    if (invite && invite.seriesId === id) {
      await prisma.shareInvite.delete({
        where: { id: shareId },
      })
      return { success: true }
    }

    throw new NotFoundError("Share")
  },
})
