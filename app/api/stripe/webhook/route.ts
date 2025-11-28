import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { Plan } from "@prisma/client"
import Stripe from "stripe"
import { z } from "zod"

// Validation schema for webhook metadata
const metadataSchema = z.object({
  userId: z.string().cuid().optional(),
  plan: z.enum(["pro", "team", "PRO", "TEAM"]).optional(),
})

// Validate and extract metadata safely
function validateMetadata(metadata: Record<string, string> | null | undefined) {
  if (!metadata) return { userId: undefined, plan: undefined }
  const result = metadataSchema.safeParse(metadata)
  if (!result.success) {
    console.warn("Invalid webhook metadata:", result.error.issues)
    return { userId: undefined, plan: undefined }
  }
  return result.data
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  // Validate webhook secret is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id

          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as {
            id: string;
            items: { data: Array<{ price: { id: string } }> };
            current_period_end: number;
            status: string;
          }

          // Validate metadata before using
          const { userId, plan: metaPlan } = validateMetadata(session.metadata)
          const plan = (metaPlan?.toUpperCase() || "PRO") as Plan

          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                stripeSubscriptionId: subscription.id,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                plan: plan,
              },
            })
          }
        }
        break
      }

      case "customer.subscription.updated": {
        const subscriptionData = event.data.object as unknown as {
          id: string;
          items: { data: Array<{ price: { id: string } }> };
          current_period_end: number;
          status: string;
          metadata?: Record<string, string>;
        }

        // Validate metadata before using
        const { userId, plan: metaPlan } = validateMetadata(subscriptionData.metadata)

        if (userId) {
          const plan = (metaPlan?.toUpperCase() || "PRO") as Plan

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripePriceId: subscriptionData.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(
                subscriptionData.current_period_end * 1000
              ),
              plan: subscriptionData.status === "active" ? plan : "FREE",
            },
          })
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscriptionData = event.data.object as unknown as {
          metadata?: Record<string, string>;
        }

        // Validate metadata before using
        const { userId } = validateMetadata(subscriptionData.metadata)

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
              plan: "FREE",
            },
          })
        }
        break
      }

      case "invoice.payment_failed": {
        // Handle failed payment - could send email notification
        // Invoice ID is available via event.data.object.id
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
