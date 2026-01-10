import { NextResponse } from "next/server"
import { createApiHandler, UnauthorizedError, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("You must be logged in to accept an invite")
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            _count: { select: { members: true, invites: true } },
          },
        },
      },
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    if (new Date() > invite.expiresAt) {
      await prisma.teamInvite.delete({ where: { token } })
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 })
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite was sent to a different email address")
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: invite.teamId, userId: user.id },
      },
    })

    if (existingMembership) {
      await prisma.teamInvite.delete({ where: { token } })
      throw new BadRequestError("You are already a member of this team")
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentMemberCount = await tx.teamMember.count({
        where: { teamId: invite.teamId },
      })

      if (currentMemberCount >= invite.team.maxSeats) {
        throw new Error("SEAT_LIMIT_REACHED")
      }

      const member = await tx.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: user.id,
          role: invite.role,
        },
        include: {
          team: { select: { id: true, name: true, logo: true } },
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      })

      await tx.teamInvite.delete({ where: { token } })

      return member
    }).catch((error) => {
      if (error instanceof Error && error.message === "SEAT_LIMIT_REACHED") {
        throw new ForbiddenError("Team has reached its seat limit")
      }
      throw error
    })

    await logTeamAction({
      teamId: invite.teamId,
      actorId: user.id,
      action: "invite_accepted",
      targetType: "member",
      targetId: user.id,
      metadata: {
        inviteId: invite.id,
        role: invite.role,
        teamName: result.team.name,
      },
    })

    return { success: true, membership: result }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("You must be logged in to decline an invite")
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite was sent to a different email address")
    }

    const teamId = invite.teamId

    await prisma.teamInvite.delete({ where: { token } })

    await logTeamAction({
      teamId,
      actorId: user.id,
      action: "invite_declined",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email: invite.email },
    })

    return { success: true }
  },
})
