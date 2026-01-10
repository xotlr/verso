import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { reconcileUserSubscription } from "@/lib/stripe-helpers"

export const dynamic = "force-dynamic"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    })

    if (!userData) {
      throw new NotFoundError("User")
    }

    const isActive =
      userData.plan !== "FREE" &&
      userData.stripeSubscriptionId &&
      userData.stripeCurrentPeriodEnd &&
      userData.stripeCurrentPeriodEnd > new Date()

    return {
      plan: userData.plan,
      isActive,
      isPremium: userData.plan !== "FREE",
      stripeCustomerId: userData.stripeCustomerId,
      stripeSubscriptionId: userData.stripeSubscriptionId,
      stripePriceId: userData.stripePriceId,
      currentPeriodEnd: userData.stripeCurrentPeriodEnd?.toISOString() || null,
    }
  },
})

const subscriptionActionSchema = z.object({
  action: z.enum(["reconcile", "cancel", "reactivate"]),
})

export const POST = createApiHandler({
  auth: "required",
  schema: subscriptionActionSchema,
  handler: async ({ user, data }) => {
    const { action } = data

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    })

    if (!userData) {
      throw new NotFoundError("User")
    }

    const stripe = getStripe()

    switch (action) {
      case "reconcile": {
        const result = await reconcileUserSubscription(user.id)
        return { success: true, plan: result.plan, synced: result.synced }
      }

      case "cancel": {
        if (!userData.stripeSubscriptionId) {
          throw new BadRequestError("No active subscription")
        }

        await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          cancel_at_period_end: true,
        })

        return { success: true, message: "Subscription will cancel at end of billing period" }
      }

      case "reactivate": {
        if (!userData.stripeSubscriptionId) {
          throw new BadRequestError("No subscription to reactivate")
        }

        await stripe.subscriptions.update(userData.stripeSubscriptionId, {
          cancel_at_period_end: false,
        })

        return { success: true, message: "Subscription reactivated" }
      }
    }
  },
})
