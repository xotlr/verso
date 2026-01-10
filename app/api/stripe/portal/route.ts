import { createApiHandler, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser?.stripeCustomerId) {
      throw new BadRequestError("No billing account found")
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/home`,
    })

    return { url: portalSession.url }
  },
})
