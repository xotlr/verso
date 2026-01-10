import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { createTeamPortalSession } from "@/lib/stripe-helpers"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request }) => {
    const { id } = params

    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        stripeCustomerId: true,
      },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    if (team.ownerId !== user.id) {
      throw new ForbiddenError("Only the team owner can access billing")
    }

    if (!team.stripeCustomerId) {
      throw new BadRequestError("No billing account found. Subscribe to a plan first.")
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    const returnUrl = `${origin}/teams/${team.id}/settings?tab=billing`

    const portalSession = await createTeamPortalSession(team.id, returnUrl)

    return { url: portalSession.url }
  },
})
