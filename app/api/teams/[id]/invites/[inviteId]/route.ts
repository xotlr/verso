import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, inviteId } = params

    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { team: true },
    })

    if (!invite || invite.teamId !== id) {
      throw new NotFoundError("Invite")
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const canRevoke =
      invite.team.ownerId === user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"))

    if (!canRevoke) {
      throw new ForbiddenError("Only owners and admins can revoke invites")
    }

    await prisma.teamInvite.delete({
      where: { id: inviteId },
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "invite_revoked",
      targetType: "invite",
      targetId: inviteId,
      metadata: { email: invite.email, role: invite.role },
    })

    return { success: true }
  },
})
