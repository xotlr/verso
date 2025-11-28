import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { getPlanFromPriceId } from "@/lib/stripe-constants"
import { getOrCreateStripeCustomer } from "@/lib/stripe-helpers"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      )
    }

    const { priceId, plan } = await request.json()

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      )
    }

    // Validate price ID matches our configured plans
    const planDetails = getPlanFromPriceId(priceId)
    if (!planDetails) {
      return NextResponse.json(
        {
          error: "Invalid price ID",
          details: "Price ID does not match any configured plans",
        },
        { status: 400 }
      )
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not configured")
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      )
    }

    const stripe = getStripe()

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
      session.user.name || undefined
    )

    // Build success/cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || "https://verso.ac"
    const successUrl = `${baseUrl}/home?success=true&plan=${planDetails.planId}`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`

    // Create Stripe Checkout session with best practices
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // URLs
      success_url: successUrl,
      cancel_url: cancelUrl,

      // 14-day free trial
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: session.user.id,
          plan: planDetails.planId.toUpperCase(),
          planName: planDetails.planName,
          billingPeriod: planDetails.billingPeriod,
        },
      },

      // Allow promotion codes
      allow_promotion_codes: true,

      // Collect customer information
      customer_update: {
        address: "auto",
        name: "auto",
      },

      // Billing address collection
      billing_address_collection: "auto",

      // Custom text for better UX
      custom_text: {
        submit: {
          message: `Welcome to Verso ${planDetails.planName}! Start your 14-day free trial.`,
        },
        after_submit: {
          message: "Thank you! You'll be redirected back to Verso shortly.",
        },
      },

      // Metadata for webhook processing
      metadata: {
        userId: session.user.id,
        plan: planDetails.planId.toUpperCase(),
        planName: planDetails.planName,
        billingPeriod: planDetails.billingPeriod,
      },

      // Payment method types
      payment_method_types: ["card"],
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
