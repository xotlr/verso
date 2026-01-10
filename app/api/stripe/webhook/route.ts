import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { Plan } from "@prisma/client"
import Stripe from "stripe"
import { updateTeamSubscription, cancelTeamSubscription } from "@/lib/stripe-helpers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// Valid plan types for validation
const VALID_PLANS = ["FREE", "PLUS", "PRO", "MAX"] as const

/**
 * Check if a webhook event has already been processed (database-backed idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { id: eventId },
  })
  return existing !== null
}

/**
 * Mark a webhook event as processed in the database
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await prisma.processedWebhookEvent.create({
    data: {
      id: eventId,
      eventType,
    },
  })
}

export async function POST(request: Request) {
  const startTime = Date.now()
  let event: Stripe.Event | undefined

  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      logger.warn("Webhook received without signature")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET is not configured")
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      )
    }

    const stripe = getStripe()

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.error("Webhook signature verification failed", err instanceof Error ? err : undefined)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Check for duplicate event processing (database-backed idempotency)
    if (await isEventProcessed(event.id)) {
      logger.info("Webhook event already processed, skipping", { eventId: event.id })
      return NextResponse.json({ received: true, duplicate: true })
    }

    logger.info("Processing webhook event", { eventType: event.type, eventId: event.id })

    // Process event based on type
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session
          // Check if this is a team checkout
          if (session.metadata?.type === "team" && session.metadata?.teamId) {
            await handleTeamCheckoutCompleted(session, stripe)
          } else {
            await handleCheckoutCompleted(session, stripe)
          }
          break
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription
          // Check if this is a team subscription
          if (subscription.metadata?.type === "team" && subscription.metadata?.teamId) {
            await handleTeamSubscriptionUpdate(subscription)
          } else {
            await handleSubscriptionUpdate(subscription)
          }
          break
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription
          // Check if this is a team subscription
          if (subscription.metadata?.type === "team" && subscription.metadata?.teamId) {
            await handleTeamSubscriptionCancellation(subscription)
          } else {
            await handleSubscriptionCancellation(subscription)
          }
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
          logger.debug("Unhandled webhook event type", { eventType: event.type })
      }

      // Mark as processed in database
      await markEventProcessed(event.id, event.type)

      const processingTime = Date.now() - startTime
      logger.info("Webhook processed successfully", {
        eventType: event.type,
        eventId: event.id,
        processingTimeMs: processingTime,
      })

      return NextResponse.json({ received: true, eventId: event.id })
    } catch (handlerError) {
      logger.error(
        "Error processing webhook event",
        handlerError instanceof Error ? handlerError : undefined,
        { eventType: event.type, eventId: event.id }
      )
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
    logger.error("Webhook processing failed", error instanceof Error ? error : undefined)
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
    logger.warn("Checkout session completed without userId in metadata", {
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
    logger.warn("No subscription ID in checkout session", {
      sessionId: session.id,
    })
    return
  }

  // Fetch subscription details
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription
  const plan = (planName && VALID_PLANS.includes(planName.toUpperCase() as Plan))
    ? (planName.toUpperCase() as Plan)
    : "PRO"

  // Update user with subscription info
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeCurrentPeriodEnd: getStripeDate(subscription.items.data[0]?.current_period_end),
    },
  })

  logger.info("Subscription activated from checkout", {
    userId,
    plan,
    subscriptionId,
  })
}

/**
 * Safely convert Stripe timestamp to Date
 */
function getStripeDate(timestamp: number | undefined | null): Date {
  if (timestamp && typeof timestamp === 'number' && !isNaN(timestamp)) {
    return new Date(timestamp * 1000)
  }
  // Default to 14 days from now for trials
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
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
      logger.warn("Subscription update: cannot find user", {
        customerId,
        subscriptionId: subscription.id,
      })
      return
    }

    // Update by customer ID
    const plan =
      subscription.status === "active" || subscription.status === "trialing"
        ? (planName && VALID_PLANS.includes(planName.toUpperCase() as Plan))
          ? (planName.toUpperCase() as Plan)
          : "PRO"
        : "FREE"

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price?.id || null,
        stripeCurrentPeriodEnd: getStripeDate(subscription.items.data[0]?.current_period_end),
      },
    })

    logger.info("Subscription updated (by customer ID)", {
      userId: user.id,
      plan,
      status: subscription.status,
    })
    return
  }

  // Update by user ID from metadata
  const plan =
    subscription.status === "active" || subscription.status === "trialing"
      ? (planName && VALID_PLANS.includes(planName.toUpperCase() as Plan))
        ? (planName.toUpperCase() as Plan)
        : "PRO"
      : "FREE"

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeCurrentPeriodEnd: getStripeDate(subscription.items.data[0]?.current_period_end),
    },
  })

  logger.info("Subscription updated", {
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
    logger.info("Subscription canceled", { userId })
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
    logger.info("Subscription canceled (by customer ID)", { customerId })
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
    const planName = subscriptionMeta?.plan
    const plan = (planName && VALID_PLANS.includes(planName.toUpperCase() as Plan))
      ? (planName.toUpperCase() as Plan)
      : "PRO"

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeCurrentPeriodEnd: invoice.lines.data[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000)
          : undefined,
      },
    })

    logger.info("Subscription reactivated after payment", {
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
  logger.warn("Payment failed", {
    customerId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  })

  // After multiple failures, Stripe will cancel the subscription
  // which will trigger customer.subscription.deleted
}

// ============================================
// TEAM SUBSCRIPTION HANDLERS
// ============================================

/**
 * Handle team checkout session completion
 */
async function handleTeamCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe
) {
  const teamId = session.metadata?.teamId
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.toString()

  if (!teamId) {
    logger.warn("Team checkout session completed without teamId in metadata", {
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
    logger.warn("No subscription ID in team checkout session", {
      sessionId: session.id,
    })
    return
  }

  // Fetch subscription details
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription

  // Determine maxSeats based on price/product (can be configured in Stripe product metadata)
  // Default: Team plan = 10 seats
  const maxSeats = parseInt(subscription.metadata?.maxSeats || "10", 10)

  // Update team with subscription info
  await prisma.team.update({
    where: { id: teamId },
    data: {
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeCurrentPeriodEnd: getStripeDate(subscription.items.data[0]?.current_period_end),
      maxSeats,
    },
  })

  logger.info("Team subscription activated from checkout", {
    teamId,
    subscriptionId,
    maxSeats,
  })
}

/**
 * Handle team subscription updates
 */
async function handleTeamSubscriptionUpdate(subscriptionData: Stripe.Subscription) {
  const subscription = subscriptionData as Stripe.Subscription & { current_period_end: number }
  const teamId = subscription.metadata?.teamId

  if (!teamId) {
    // Try to find team by customer ID
    const customerId = subscription.customer as string
    const team = await prisma.team.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    })

    if (!team) {
      logger.warn("Team subscription update: cannot find team", {
        customerId,
        subscriptionId: subscription.id,
      })
      return
    }

    // Update by customer ID
    const maxSeats =
      subscription.status === "active" || subscription.status === "trialing"
        ? parseInt(subscription.metadata?.maxSeats || "10", 10)
        : 3

    await updateTeamSubscription(
      team.id,
      subscription.id,
      subscription.items.data[0]?.price?.id || "",
      subscription.items.data[0]?.current_period_end,
      maxSeats
    )

    logger.info("Team subscription updated (by customer ID)", {
      teamId: team.id,
      status: subscription.status,
      maxSeats,
    })
    return
  }

  // Update by team ID from metadata
  const maxSeats =
    subscription.status === "active" || subscription.status === "trialing"
      ? parseInt(subscription.metadata?.maxSeats || "10", 10)
      : 3

  await updateTeamSubscription(
    teamId,
    subscription.id,
    subscription.items.data[0]?.price?.id || "",
    subscription.items.data[0]?.current_period_end,
    maxSeats
  )

  logger.info("Team subscription updated", {
    teamId,
    status: subscription.status,
    maxSeats,
  })
}

/**
 * Handle team subscription cancellation
 */
async function handleTeamSubscriptionCancellation(
  subscription: Stripe.Subscription
) {
  const teamId = subscription.metadata?.teamId
  const customerId = subscription.customer as string

  if (teamId) {
    await cancelTeamSubscription(teamId)
    logger.info("Team subscription canceled", { teamId })
  } else {
    // Cancel by customer ID
    const team = await prisma.team.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    })

    if (team) {
      await cancelTeamSubscription(team.id)
      logger.info("Team subscription canceled (by customer ID)", { teamId: team.id })
    }
  }
}
