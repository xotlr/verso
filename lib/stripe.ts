import Stripe from "stripe"

// Lazy initialization to avoid build-time errors when env vars aren't available
let stripeInstance: Stripe | null = null

export const getStripe = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    })
  }
  return stripeInstance
}

// For backward compatibility - getter that lazily initializes
export const stripe = {
  get webhooks() { return getStripe().webhooks },
  get subscriptions() { return getStripe().subscriptions },
  get checkout() { return getStripe().checkout },
  get billingPortal() { return getStripe().billingPortal },
  get customers() { return getStripe().customers },
}

export const PLAN_LIMITS = {
  FREE: { projects: 1, collaboration: false, maxTeamSeats: 1, production: false, scriptCheck: false },      // Basic access (1 team allowed)
  PLUS: { projects: Infinity, collaboration: false, maxTeamSeats: 0, production: false, scriptCheck: false }, // Solo writer
  PRO: { projects: Infinity, collaboration: true, maxTeamSeats: 5, production: true, scriptCheck: true },   // Writing teams + production
  MAX: { projects: Infinity, collaboration: true, maxTeamSeats: Infinity, production: true, scriptCheck: true }, // Production/Studio (per-seat)
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export function canCreateProject(plan: PlanType, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].projects
}

export function canCollaborate(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].collaboration
}

export function getMaxTeamSeats(plan: PlanType): number {
  return PLAN_LIMITS[plan].maxTeamSeats
}

export function canCreateTeam(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].maxTeamSeats > 0
}

export function canUseProduction(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].production
}

/**
 * Check if a subscription is currently active (not expired).
 * SECURITY: This validates both the plan AND the subscription period end date.
 * Always use this for server-side feature gating, not just canUseProduction().
 *
 * @param plan - The user's plan type
 * @param periodEnd - The stripeCurrentPeriodEnd date string (ISO format)
 * @returns true if the subscription is active and not expired
 */
export function isSubscriptionActive(
  plan: PlanType,
  periodEnd: string | Date | null | undefined
): boolean {
  // FREE plan is always "active" (no subscription required)
  if (plan === "FREE") return true

  // Paid plans require valid periodEnd
  if (!periodEnd) return false

  const endDate = typeof periodEnd === "string" ? new Date(periodEnd) : periodEnd
  const now = new Date()

  // Add 1-day grace period for webhook processing delays
  const gracePeriodMs = 24 * 60 * 60 * 1000
  const endWithGrace = new Date(endDate.getTime() + gracePeriodMs)

  return endWithGrace > now
}

/**
 * Server-side validation for production feature access.
 * SECURITY: This is the correct function to use in API routes.
 * It validates both the plan AND the subscription period.
 *
 * @param plan - The user's plan type
 * @param periodEnd - The stripeCurrentPeriodEnd date
 * @returns true if user can access production features
 */
export function canAccessProductionFeatures(
  plan: PlanType,
  periodEnd: string | Date | null | undefined
): boolean {
  // Must have production-enabled plan AND active subscription
  return canUseProduction(plan) && isSubscriptionActive(plan, periodEnd)
}

export function canUseScriptCheck(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].scriptCheck
}

// Price IDs from environment
export const PRICES = {
  PLUS_MONTHLY: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,
  PLUS_YEARLY: process.env.STRIPE_PLUS_YEARLY_PRICE_ID,
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  MAX_MONTHLY: process.env.STRIPE_MAX_MONTHLY_PRICE_ID,
  MAX_YEARLY: process.env.STRIPE_MAX_YEARLY_PRICE_ID,
} as const
