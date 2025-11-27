import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { Plan } from "@prisma/client"
import Stripe from "stripe"

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

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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
            metadata?: { userId?: string; plan?: string };
          }

          const userId = session.metadata?.userId
          const plan = (session.metadata?.plan?.toUpperCase() || "PRO") as Plan

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
          metadata?: { userId?: string; plan?: string };
        }
        const userId = subscriptionData.metadata?.userId

        if (userId) {
          const plan = (subscriptionData.metadata?.plan?.toUpperCase() || "PRO") as Plan

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
          metadata?: { userId?: string };
        }
        const userId = subscriptionData.metadata?.userId

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
        const invoice = event.data.object as Stripe.Invoice
        // Handle failed payment - could send email notification
        console.log("Payment failed for invoice:", invoice.id)
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
