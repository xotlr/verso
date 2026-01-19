import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, handleSupabaseError } from "@/lib/api"
import { getStripe } from "@/lib/stripe"
import { reconcileUserSubscription } from "@/lib/stripe-helpers"

export const dynamic = "force-dynamic"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: userData, error } = await supabase
      .from("User")
      .select("plan, stripeCustomerId, stripeSubscriptionId, stripePriceId, stripeCurrentPeriodEnd")
      .eq("id", user.id)
      .single()

    if (error) handleSupabaseError(error, "User")
    if (!userData) throw new NotFoundError("User")

    const isActive =
      userData.plan !== "FREE" &&
      userData.stripeSubscriptionId &&
      userData.stripeCurrentPeriodEnd &&
      new Date(userData.stripeCurrentPeriodEnd) > new Date()

    return {
      plan: userData.plan,
      isActive,
      isPremium: userData.plan !== "FREE",
      stripeCustomerId: userData.stripeCustomerId,
      stripeSubscriptionId: userData.stripeSubscriptionId,
      stripePriceId: userData.stripePriceId,
      currentPeriodEnd: userData.stripeCurrentPeriodEnd || null,
    }
  },
})

const subscriptionActionSchema = z.object({
  action: z.enum(["reconcile", "cancel", "reactivate"]),
})

export const POST = createApiHandler({
  auth: "required",
  schema: subscriptionActionSchema,
  handler: async ({ user, data, supabase }) => {
    const { action } = data

    const { data: userData, error } = await supabase
      .from("User")
      .select("stripeSubscriptionId, stripeCustomerId")
      .eq("id", user.id)
      .single()

    if (error) handleSupabaseError(error, "User")
    if (!userData) throw new NotFoundError("User")

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
