import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { createTeamCheckoutSession } from "@/lib/stripe-helpers"
import { logTeamAction } from "@/lib/audit-log"

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: checkoutSchema,
  handler: async ({ user, params, data, request }) => {
    const { id } = params

    if (!user.email) {
      throw new ForbiddenError("Email is required")
    }

    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!team) {
      throw new NotFoundError("Team")
    }

    if (team.ownerId !== user.id) {
      throw new ForbiddenError("Only the team owner can manage billing")
    }

    if (team.stripeSubscriptionId) {
      throw new BadRequestError(
        "Team already has an active subscription. Use the billing portal to manage it."
      )
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"

    const checkoutSession = await createTeamCheckoutSession({
      teamId: team.id,
      teamName: team.name,
      ownerEmail: user.email,
      ownerId: user.id,
      priceId: data.priceId,
      successUrl: `${origin}/teams/${team.id}/settings?tab=billing&success=true`,
      cancelUrl: `${origin}/teams/${team.id}/settings?tab=billing&canceled=true`,
    })

    await logTeamAction({
      teamId: id,
      actorId: user.id,
      action: "billing_updated",
      targetType: "billing",
      metadata: { action: "checkout_initiated", priceId: data.priceId },
    })

    return { url: checkoutSession.url }
  },
})
