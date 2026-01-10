import { z } from "zod"
import { createApiHandler, BadRequestError } from "@/lib/api"
import { getStripe } from "@/lib/stripe"
import { getPlanFromPriceId } from "@/lib/stripe-constants"
import { getOrCreateStripeCustomer } from "@/lib/stripe-helpers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  returnUrl: z.string().optional(),
})

export const POST = createApiHandler({
  auth: "required",
  schema: checkoutSchema,
  handler: async ({ user, data }) => {
    if (!user.email) {
      throw new BadRequestError("Email is required for checkout")
    }

    const planDetails = getPlanFromPriceId(data.priceId)
    if (!planDetails) {
      throw new BadRequestError("Invalid price ID")
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error("STRIPE_SECRET_KEY is not configured")
      throw new Error("Payment system not configured")
    }

    const stripe = getStripe()

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.name || undefined
    )

    const baseUrl = process.env.NEXTAUTH_URL || "https://verso.ac"
    // Return to where user was, or default to home
    const returnPath = data.returnUrl || "/home"
    const successUrl = `${baseUrl}${returnPath}${returnPath.includes('?') ? '&' : '?'}success=true&plan=${planDetails.planId}`
    const cancelUrl = data.returnUrl ? `${baseUrl}${returnPath}` : `${baseUrl}/pricing?canceled=true`

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: data.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          plan: planDetails.planId.toUpperCase(),
          planName: planDetails.planName,
          billingPeriod: planDetails.billingPeriod,
        },
      },
      allow_promotion_codes: true,
      customer_update: {
        address: "auto",
        name: "auto",
      },
      billing_address_collection: "auto",
      custom_text: {
        submit: {
          message: `Welcome to Verso ${planDetails.planName}! Start your 14-day free trial.`,
        },
        after_submit: {
          message: "Thank you! You'll be redirected back to Verso shortly.",
        },
      },
      metadata: {
        userId: user.id,
        plan: planDetails.planId.toUpperCase(),
        planName: planDetails.planName,
        billingPeriod: planDetails.billingPeriod,
      },
      payment_method_types: ["card"],
    })

    return {
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    }
  },
})
