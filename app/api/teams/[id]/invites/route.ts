import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const isMember = membership || team.ownerId === user.id
    if (!isMember) {
      throw new ForbiddenError("Access denied")
    }

    const invites = await prisma.teamInvite.findMany({
      where: { teamId: id },
      include: {
        inviter: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return invites
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createInviteSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const team = await prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { members: true, invites: true } } },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const canInvite =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canInvite) {
      throw new ForbiddenError("Only owners and admins can invite members")
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      const existingMembership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: existingUser.id } },
      })

      if (existingMembership) {
        throw new BadRequestError("User is already a member of this team")
      }
    }

    const invite = await prisma.$transaction(async (tx) => {
      const [memberCount, inviteCount] = await Promise.all([
        tx.teamMember.count({ where: { teamId: id } }),
        tx.teamInvite.count({ where: { teamId: id } }),
      ])

      const totalSeats = memberCount + inviteCount
      if (totalSeats >= team.maxSeats) {
        throw new Error("SEAT_LIMIT_REACHED")
      }

      const existingInvite = await tx.teamInvite.findUnique({
        where: { teamId_email: { teamId: id, email: data.email } },
      })

      if (existingInvite) {
        throw new Error("INVITE_EXISTS")
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      return tx.teamInvite.create({
        data: {
          teamId: id,
          email: data.email,
          role: data.role,
          expiresAt,
          invitedBy: user.id,
        },
        include: {
          inviter: {
            select: { id: true, name: true, email: true, image: true },
          },
          team: {
            select: { id: true, name: true, logo: true },
          },
        },
      })
    }).catch((error) => {
      if (error instanceof Error) {
        if (error.message === "SEAT_LIMIT_REACHED") {
          throw new ForbiddenError(
            "Team has reached its seat limit. Upgrade to add more members."
          )
        }
        if (error.message === "INVITE_EXISTS") {
          throw new BadRequestError("An invite has already been sent to this email")
        }
      }
      throw error
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "invite_sent",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email: data.email, role: data.role },
    })

    return invite
  },
})
