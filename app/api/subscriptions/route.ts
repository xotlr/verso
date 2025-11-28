import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { reconcileUserSubscription } from "@/lib/stripe-helpers"

export const dynamic = "force-dynamic"

/**
 * GET /api/subscriptions
 * Returns the current user's subscription status
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if subscription is active
    const isActive =
      user.plan !== "FREE" &&
      user.stripeSubscriptionId &&
      user.stripeCurrentPeriodEnd &&
      user.stripeCurrentPeriodEnd > new Date()

    return NextResponse.json({
      plan: user.plan,
      isActive,
      isPremium: user.plan !== "FREE",
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripePriceId: user.stripePriceId,
      currentPeriodEnd: user.stripeCurrentPeriodEnd?.toISOString() || null,
    })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscriptions
 * Actions: reconcile, cancel, reactivate
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const stripe = getStripe()

    switch (action) {
      case "reconcile": {
        // Sync subscription status from Stripe
        const result = await reconcileUserSubscription(session.user.id)
        return NextResponse.json({
          success: true,
          plan: result.plan,
          synced: result.synced,
        })
      }

      case "cancel": {
        // Cancel subscription at period end
        if (!user.stripeSubscriptionId) {
          return NextResponse.json(
            { error: "No active subscription" },
            { status: 400 }
          )
        }

        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        })

        return NextResponse.json({
          success: true,
          message: "Subscription will cancel at end of billing period",
        })
      }

      case "reactivate": {
        // Reactivate a subscription that was set to cancel
        if (!user.stripeSubscriptionId) {
          return NextResponse.json(
            { error: "No subscription to reactivate" },
            { status: 400 }
          )
        }

        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: false,
        })

        return NextResponse.json({
          success: true,
          message: "Subscription reactivated",
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Subscription action error:", error)
    return NextResponse.json(
      { error: "Failed to process subscription action" },
      { status: 500 }
    )
  }
}
