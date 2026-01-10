import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { ShareRole } from "@prisma/client"

async function canManageShares(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: {
      userId: true,
      project: { select: { teamId: true } },
      teamId: true,
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404 }
  }

  if (screenplay.userId === userId) {
    return { allowed: true, isOwner: true }
  }

  const share = await prisma.screenplayShare.findUnique({
    where: {
      screenplayId_userId: {
        screenplayId,
        userId,
      },
    },
  })

  if (share?.role === "ADMIN") {
    return { allowed: true, isOwner: false }
  }

  const teamId = screenplay.teamId || screenplay.project?.teamId
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
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const share = await prisma.screenplayShare.findUnique({
      where: { id: shareId },
    })

    if (share) {
      if (share.userId === user.id && !access.isOwner) {
        throw new BadRequestError("Cannot change your own permissions")
      }

      const updatedShare = await prisma.screenplayShare.update({
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

    if (invite && invite.screenplayId === id) {
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
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const share = await prisma.screenplayShare.findUnique({
      where: { id: shareId },
    })

    if (share && share.screenplayId === id) {
      await prisma.screenplayShare.delete({
        where: { id: shareId },
      })
      return { success: true }
    }

    const invite = await prisma.shareInvite.findUnique({
      where: { id: shareId },
    })

    if (invite && invite.screenplayId === id) {
      await prisma.shareInvite.delete({
        where: { id: shareId },
      })
      return { success: true }
    }

    throw new NotFoundError("Share")
  },
})
