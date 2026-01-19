import { createServerActionClient } from "./supabase/server"
import { getStripe } from "./stripe"
import type Stripe from "stripe"

const stripe = getStripe()

// Plan type for validation
type Plan = "FREE" | "PLUS" | "PRO" | "MAX"

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const supabase = await createServerActionClient()

  // Check if user already has a Stripe customer ID
  const userResult = await supabase
    .from("User")
    .select("stripeCustomerId")
    .eq("id", userId)
    .single()
  const user = userResult.data as { stripeCustomerId: string | null } | null

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  })

  // Update user with Stripe customer ID
  await (supabase.from("User") as ReturnType<typeof supabase.from>)
    .update({ stripeCustomerId: customer.id })
    .eq("id", userId)

  return customer.id
}

/**
 * Get all subscriptions for a Stripe customer
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    expand: ["data.default_payment_method"],
  })
  return subscriptions.data
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
  return subscription
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
  return subscription
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session
}

/**
 * Sync user subscription status from Stripe
 * Useful for reconciliation when webhook events are missed
 */
export async function reconcileUserSubscription(userId: string): Promise<{
  plan: Plan
  synced: boolean
}> {
  const supabase = await createServerActionClient()

  // Get user with Stripe customer ID
  const userResult = await supabase
    .from("User")
    .select("stripeCustomerId, plan")
    .eq("id", userId)
    .single()
  const user = userResult.data as { stripeCustomerId: string | null; plan: string | null } | null

  if (!user?.stripeCustomerId) {
    return {
      plan: "FREE",
      synced: false,
    }
  }

  // Fetch active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "active",
    limit: 1,
  })

  if (subscriptions.data.length === 0) {
    // No active subscription in Stripe
    await (supabase.from("User") as ReturnType<typeof supabase.from>)
      .update({
        plan: "FREE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      })
      .eq("id", userId)

    return {
      plan: "FREE",
      synced: true,
    }
  }

  // Get the most recent active subscription
  const subscriptionData = subscriptions.data[0]
  const subscription = subscriptionData as Stripe.Subscription & { current_period_end: number }
  const plan = (subscription.metadata?.plan?.toUpperCase() || "PRO") as Plan

  // Update user with correct subscription status
  await (supabase.from("User") as ReturnType<typeof supabase.from>)
    .update({
      plan,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id || null,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", userId)

  return {
    plan,
    synced: true,
  }
}

/**
 * Map Stripe subscription status to app status
 */
export function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "past_due" | "canceled" | "incomplete" {
  const statusMap: Record<
    Stripe.Subscription.Status,
    "active" | "past_due" | "canceled" | "incomplete"
  > = {
    active: "active",
    trialing: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "past_due",
  }
  return statusMap[stripeStatus] || "canceled"
}

// ============================================
// TEAM BILLING HELPERS
// ============================================

/**
 * Get or create a Stripe customer for a team
 */
export async function getOrCreateTeamStripeCustomer(
  teamId: string,
  teamName: string,
  ownerEmail: string
): Promise<string> {
  const supabase = await createServerActionClient()

  // Check if team already has a Stripe customer ID
  const teamResult = await supabase
    .from("Team")
    .select("stripeCustomerId")
    .eq("id", teamId)
    .single()
  const team = teamResult.data as { stripeCustomerId: string | null } | null

  if (team?.stripeCustomerId) {
    return team.stripeCustomerId
  }

  // Create new Stripe customer for the team
  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: teamName,
    metadata: {
      teamId,
      type: "team",
    },
  })

  // Update team with Stripe customer ID
  await (supabase.from("Team") as ReturnType<typeof supabase.from>)
    .update({ stripeCustomerId: customer.id })
    .eq("id", teamId)

  return customer.id
}

/**
 * Create a checkout session for team subscription
 */
export async function createTeamCheckoutSession(params: {
  teamId: string
  teamName: string
  ownerEmail: string
  ownerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const { teamId, teamName, ownerEmail, ownerId, priceId, successUrl, cancelUrl } = params

  const customerId = await getOrCreateTeamStripeCustomer(teamId, teamName, ownerEmail)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      teamId,
      ownerId,
      type: "team",
    },
    subscription_data: {
      metadata: {
        teamId,
        ownerId,
        type: "team",
      },
    },
  })

  return session
}

/**
 * Create a billing portal session for team
 */
export async function createTeamPortalSession(
  teamId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const supabase = await createServerActionClient()

  const teamResult = await supabase
    .from("Team")
    .select("stripeCustomerId")
    .eq("id", teamId)
    .single()
  const team = teamResult.data as { stripeCustomerId: string | null } | null

  if (!team?.stripeCustomerId) {
    throw new Error("Team does not have a Stripe customer ID")
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Get team billing status from Stripe
 */
export async function getTeamBillingStatus(teamId: string): Promise<{
  hasSubscription: boolean
  status: "active" | "past_due" | "canceled" | "incomplete" | "none"
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  maxSeats: number
}> {
  const supabase = await createServerActionClient()

  const teamResult = await supabase
    .from("Team")
    .select("stripeSubscriptionId, stripeCurrentPeriodEnd, maxSeats")
    .eq("id", teamId)
    .single()
  const team = teamResult.data as { stripeSubscriptionId: string | null; stripeCurrentPeriodEnd: string | null; maxSeats: number } | null

  if (!team?.stripeSubscriptionId) {
    return {
      hasSubscription: false,
      status: "none",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxSeats: team?.maxSeats || 3,
    }
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId)

    return {
      hasSubscription: true,
      status: mapSubscriptionStatus(subscription.status),
      currentPeriodEnd: team.stripeCurrentPeriodEnd ? new Date(team.stripeCurrentPeriodEnd) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      maxSeats: team.maxSeats,
    }
  } catch {
    // Subscription may have been deleted
    return {
      hasSubscription: false,
      status: "none",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      maxSeats: team?.maxSeats || 3,
    }
  }
}

/**
 * Update team subscription (maxSeats) after successful payment
 */
export async function updateTeamSubscription(
  teamId: string,
  subscriptionId: string,
  priceId: string,
  currentPeriodEnd: number,
  maxSeats: number
): Promise<void> {
  const supabase = await createServerActionClient()

  await (supabase.from("Team") as ReturnType<typeof supabase.from>)
    .update({
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
      maxSeats,
    })
    .eq("id", teamId)
}

/**
 * Cancel team subscription
 */
export async function cancelTeamSubscription(teamId: string): Promise<void> {
  const supabase = await createServerActionClient()

  await (supabase.from("Team") as ReturnType<typeof supabase.from>)
    .update({
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      maxSeats: 3, // Reset to free tier
    })
    .eq("id", teamId)
}
