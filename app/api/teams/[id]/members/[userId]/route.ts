import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateRoleSchema,
  handler: async ({ user, params, data }) => {
    const { id, userId: targetUserId } = params

    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const currentMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const canManage =
      team.ownerId === user.id ||
      (currentMembership &&
        (currentMembership.role === "OWNER" || currentMembership.role === "ADMIN"))

    if (!canManage) {
      throw new ForbiddenError("Only owners and admins can update roles")
    }

    if (targetUserId === team.ownerId) {
      throw new BadRequestError("Cannot change the team owner's role")
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: targetUserId } },
      include: { user: { select: { name: true, email: true } } },
    })

    const updatedMember = await prisma.teamMember.update({
      where: { teamId_userId: { teamId: id, userId: targetUserId } },
      data: { role: data.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "member_role_changed",
      targetType: "member",
      targetId: targetUserId,
      metadata: {
        oldRole: existingMember?.role,
        newRole: data.role,
        userName: existingMember?.user?.name,
      },
    })

    return updatedMember
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, userId: targetUserId } = params

    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    if (targetUserId === team.ownerId) {
      throw new BadRequestError("Cannot remove the team owner")
    }

    const currentMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const isSelf = targetUserId === user.id
    const canRemove =
      isSelf ||
      team.ownerId === user.id ||
      (currentMembership &&
        (currentMembership.role === "OWNER" || currentMembership.role === "ADMIN"))

    if (!canRemove) {
      throw new ForbiddenError("Access denied")
    }

    const memberToRemove = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: targetUserId } },
      include: { user: { select: { name: true, email: true } } },
    })

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: id, userId: targetUserId } },
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "member_removed",
      targetType: "member",
      targetId: targetUserId,
      metadata: {
        userName: memberToRemove?.user?.name,
        email: memberToRemove?.user?.email,
        wasSelfRemoval: isSelf,
      },
    })

    return { success: true }
  },
})
