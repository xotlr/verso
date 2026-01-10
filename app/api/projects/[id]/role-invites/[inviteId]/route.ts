import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId, inviteId } = params

    const invite = await prisma.projectRoleInvite.findFirst({
      where: {
        id: inviteId,
        projectId,
      },
      include: {
        project: {
          select: {
            userId: true,
            team: {
              select: {
                members: {
                  where: { userId: user.id },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    const isProjectOwner = invite.project.userId === user.id
    const isTeamAdmin = invite.project.team?.members.some(
      (m) => m.role === "OWNER" || m.role === "ADMIN"
    )
    const isInviter = invite.invitedBy === user.id

    if (!isProjectOwner && !isTeamAdmin && !isInviter) {
      throw new ForbiddenError("Not authorized to revoke this invite")
    }

    await prisma.projectRoleInvite.delete({
      where: { id: inviteId },
    })

    return { success: true }
  },
})
