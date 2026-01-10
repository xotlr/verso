import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

const addMemberSchema = z.object({
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

    if (!membership) {
      throw new ForbiddenError("Access denied")
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return members
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: addMemberSchema,
  handler: async ({ user, params, data }) => {
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

    const canInvite =
      team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canInvite) {
      throw new ForbiddenError("Only owners and admins can invite members")
    }

    const [memberCount, inviteCount] = await Promise.all([
      prisma.teamMember.count({ where: { teamId: id } }),
      prisma.teamInvite.count({ where: { teamId: id } }),
    ])
    const totalSeats = memberCount + inviteCount

    if (totalSeats >= team.maxSeats) {
      throw new ForbiddenError(
        `Team has reached the maximum of ${team.maxSeats} seats. Upgrade to add more members.`
      )
    }

    const userToAdd = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!userToAdd) {
      throw new NotFoundError("User not found. They need to create an account first.")
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: userToAdd.id } },
    })

    if (existingMembership) {
      throw new BadRequestError("User is already a member of this team")
    }

    const newMember = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: userToAdd.id,
        role: data.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "member_added",
      targetType: "member",
      targetId: userToAdd.id,
      metadata: { email: data.email, role: data.role, userName: userToAdd.name },
    })

    return newMember
  },
})
