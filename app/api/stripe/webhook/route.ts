import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { Plan } from "@prisma/client"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

// Simple in-memory cache for processed events (prevents duplicate processing within same instance)
// For production, consider using Redis or database-based idempotency
const processedEvents = new Set<string>()
const MAX_CACHED_EVENTS = 1000

function markEventProcessed(eventId: string) {
  if (processedEvents.size >= MAX_CACHED_EVENTS) {
    // Clear oldest entries (simple LRU approximation)
    const entries = Array.from(processedEvents)
    entries.slice(0, 100).forEach((id) => processedEvents.delete(id))
  }
  processedEvents.add(eventId)
}

function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId)
}

export async function POST(request: Request) {
  const startTime = Date.now()
  let event: Stripe.Event | undefined

  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.warn("Webhook received without signature")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured")
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      )
    }

    const stripe = getStripe()

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Check for duplicate event processing (simple idempotency)
    if (isEventProcessed(event.id)) {
      console.log(`Webhook event already processed, skipping: ${event.id}`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    console.log(`Processing webhook event: ${event.type} (${event.id})`)

    // Process event based on type
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(session, stripe)
          break
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionUpdate(subscription)
          break
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionCancellation(subscription)
          break
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice
          await handlePaymentSucceeded(invoice)
          break
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice
          await handlePaymentFailed(invoice)
          break
        }
        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }

      // Mark as processed
      markEventProcessed(event.id)

      const processingTime = Date.now() - startTime
      console.log(
        `Webhook processed successfully in ${processingTime}ms: ${event.type}`
      )

      return NextResponse.json({ received: true, eventId: event.id })
    } catch (handlerError) {
      console.error(`Error processing webhook event ${event.type}:`, handlerError)
      // Return 500 to tell Stripe to retry
      return NextResponse.json(
        {
          error: "Event processing failed",
          eventId: event.id,
          eventType: event.type,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Webhook processing failed:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe
) {
  const userId = session.metadata?.userId
  const planName = session.metadata?.plan
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.toString()

  if (!userId) {
    console.warn("Checkout session completed without userId in metadata", {
      sessionId: session.id,
    })
    return
  }

  // Get the subscription from the session
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.toString()

  if (!subscriptionId) {
    console.warn("No subscription ID in checkout session", {
      sessionId: session.id,
    })
    return
  }

  // Fetch subscription details
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
  const subscription = subscriptionResponse as unknown as Stripe.Subscription & { current_period_end: number }
  const plan = (planName?.toUpperCase() || "PRO") as Plan

  // Update user with subscription info
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log("Subscription activated from checkout", {
    userId,
    plan,
    subscriptionId,
  })
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscriptionData: Stripe.Subscription) {
  // Cast to access properties that may not be in the type definitions
  const subscription = subscriptionData as Stripe.Subscription & { current_period_end: number }
  const userId = subscription.metadata?.userId
  const planName = subscription.metadata?.plan

  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer as string
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    })

    if (!user) {
      console.warn("Subscription update: cannot find user", {
        customerId,
        subscriptionId: subscription.id,
      })
      return
    }

    // Update by customer ID
    const plan =
      subscription.status === "active" || subscription.status === "trialing"
        ? ((planName?.toUpperCase() || "PRO") as Plan)
        : "FREE"

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price?.id || null,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
      },
    })

    console.log("Subscription updated (by customer ID)", {
      userId: user.id,
      plan,
      status: subscription.status,
    })
    return
  }

  // Update by user ID from metadata
  const plan =
    subscription.status === "active" || subscription.status === "trialing"
      ? ((planName?.toUpperCase() || "PRO") as Plan)
      : "FREE"

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log("Subscription updated", {
    userId,
    plan,
    status: subscription.status,
  })
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.userId
  const customerId = subscription.customer as string

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: "FREE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    })
    console.log("Subscription canceled", { userId })
  } else {
    // Update by customer ID
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        plan: "FREE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    })
    console.log("Subscription canceled (by customer ID)", { customerId })
  }
}

/**
 * Handle successful payment (reactivates past_due subscriptions)
 */
async function handlePaymentSucceeded(invoiceData: Stripe.Invoice) {
  // Cast to access properties that may not be in the type definitions
  const invoice = invoiceData as Stripe.Invoice & {
    subscription?: string | null
    subscription_details?: { metadata?: Record<string, string> }
  }
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription

  if (!subscriptionId) {
    // Not a subscription invoice
    return
  }

  // Find user and update their plan status if they were past_due
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true },
  })

  if (user && user.plan === "FREE") {
    // User was downgraded due to payment failure, reactivate
    const subscriptionMeta = invoice.subscription_details?.metadata
    const plan = (subscriptionMeta?.plan?.toUpperCase() || "PRO") as Plan

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeCurrentPeriodEnd: invoice.lines.data[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000)
          : undefined,
      },
    })

    console.log("Subscription reactivated after payment", {
      userId: user.id,
      plan,
    })
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Log the failure - could add email notification here
  console.warn("Payment failed", {
    customerId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  })

  // After multiple failures, Stripe will cancel the subscription
  // which will trigger customer.subscription.deleted
}
