import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { ShareRole } from "@prisma/client"

interface ShareAccessResult {
  allowed: boolean
  isOwner: boolean
  series?: {
    userId: string
    projectTeamId: string | null
    owner: { id: true; name: string | null; email: string | null; image: string | null }
  }
  error?: string
  status?: number
}

async function checkShareAccess(
  seriesId: string,
  userId: string
): Promise<ShareAccessResult> {
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: {
      userId: true,
      project: { select: { teamId: true } },
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
      shares: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  })

  if (!series) {
    return { allowed: false, isOwner: false, error: "Series not found", status: 404 }
  }

  if (series.userId === userId) {
    return {
      allowed: true,
      isOwner: true,
      series: {
        userId: series.userId,
        projectTeamId: series.project?.teamId ?? null,
        owner: series.user,
      },
    }
  }

  const userShare = series.shares[0]
  if (userShare?.role === "ADMIN") {
    return {
      allowed: true,
      isOwner: false,
      series: {
        userId: series.userId,
        projectTeamId: series.project?.teamId ?? null,
        owner: series.user,
      },
    }
  }

  const teamId = series.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    })

    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return {
        allowed: true,
        isOwner: false,
        series: {
          userId: series.userId,
          projectTeamId: series.project?.teamId ?? null,
          owner: series.user,
        },
      }
    }
  }

  return { allowed: false, isOwner: false, error: "Access denied", status: 403 }
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const [access, shares, invites] = await Promise.all([
      checkShareAccess(id, user.id),
      prisma.seriesShare.findMany({
        where: { seriesId: id },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          sharer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.shareInvite.findMany({
        where: {
          seriesId: id,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresAt: true,
          inviter: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Series")
      throw new ForbiddenError(access.error)
    }

    return {
      owner: access.series?.owner,
      shares,
      pendingInvites: invites,
    }
  },
})

const createShareSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR", "ADMIN"]).default("VIEWER"),
}).refine(
  (data) => data.userId || data.email,
  { message: "Either userId or email is required" }
)

export const POST = createApiHandler({
  auth: "required",
  schema: createShareSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params
    const { userId: targetUserId, email, role } = data

    if (targetUserId) {
      const [access, targetUser, existingShare] = await Promise.all([
        checkShareAccess(id, user.id),
        prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, name: true, email: true, image: true },
        }),
        prisma.seriesShare.findUnique({
          where: { seriesId_userId: { seriesId: id, userId: targetUserId } },
          select: { id: true },
        }),
      ])

      if (!access.allowed) {
        if (access.status === 404) throw new NotFoundError("Series")
        throw new ForbiddenError(access.error)
      }

      if (!targetUser) {
        throw new NotFoundError("User")
      }

      if (existingShare) {
        throw new BadRequestError("User already has access to this series")
      }

      const share = await prisma.seriesShare.create({
        data: {
          seriesId: id,
          userId: targetUserId,
          role: role as ShareRole,
          sharedBy: user.id,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      })

      return share
    }

    if (email) {
      const [access, existingUser] = await Promise.all([
        checkShareAccess(id, user.id),
        prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, image: true },
        }),
      ])

      if (!access.allowed) {
        if (access.status === 404) throw new NotFoundError("Series")
        throw new ForbiddenError(access.error)
      }

      if (existingUser) {
        const existingShare = await prisma.seriesShare.findUnique({
          where: {
            seriesId_userId: {
              seriesId: id,
              userId: existingUser.id,
            },
          },
        })

        if (existingShare) {
          throw new BadRequestError("User already has access to this series")
        }

        const share = await prisma.seriesShare.create({
          data: {
            seriesId: id,
            userId: existingUser.id,
            role: role as ShareRole,
            sharedBy: user.id,
          },
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        })

        return share
      }

      const existingInvite = await prisma.shareInvite.findFirst({
        where: {
          seriesId: id,
          email,
          expiresAt: { gt: new Date() },
        },
      })

      if (existingInvite) {
        throw new BadRequestError("Invite already sent to this email")
      }

      const invite = await prisma.shareInvite.create({
        data: {
          seriesId: id,
          email,
          role: role as ShareRole,
          invitedBy: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        select: {
          id: true,
          email: true,
          role: true,
          token: true,
          createdAt: true,
          expiresAt: true,
        },
      })

      return {
        type: "invite",
        invite,
        message: `Invite sent to ${email}`,
      }
    }

    throw new BadRequestError("Either userId or email is required")
  },
})
