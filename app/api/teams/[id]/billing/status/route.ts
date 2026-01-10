import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { getTeamBillingStatus } from "@/lib/stripe-helpers"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: user.id } },
    })

    const team = await prisma.team.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    const isMember = membership || team.ownerId === user.id
    if (!isMember) {
      throw new ForbiddenError("Access denied")
    }

    const billingStatus = await getTeamBillingStatus(id)

    return billingStatus
  },
})
