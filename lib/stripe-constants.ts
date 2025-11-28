/**
 * Stripe Product and Price IDs for Verso
 *
 * Configure these price IDs in your environment variables:
 * - NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID
 */

export const STRIPE_PLANS = {
  pro: {
    name: "Pro",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || "",
    monthlyPrice: 12.99,
    yearlyPrice: 99.99,
  },
  team: {
    name: "MAX",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || "",
    monthlyPrice: 39.99,
    yearlyPrice: 399.99,
  },
} as const

export type StripePlanId = keyof typeof STRIPE_PLANS

/**
 * Get plan details from a Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): {
  planId: StripePlanId
  planName: string
  billingPeriod: 'monthly' | 'yearly'
} | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.monthlyPriceId === priceId) {
      return { planId: key as StripePlanId, planName: plan.name, billingPeriod: 'monthly' }
    }
    if (plan.yearlyPriceId === priceId) {
      return { planId: key as StripePlanId, planName: plan.name, billingPeriod: 'yearly' }
    }
  }
  return null
}

/**
 * Validate that a price ID is configured and valid
 */
export function isValidPriceId(priceId: string): boolean {
  return getPlanFromPriceId(priceId) !== null
}

/**
 * Get all valid price IDs
 */
export function getAllPriceIds(): string[] {
  return Object.values(STRIPE_PLANS).flatMap(plan => [
    plan.monthlyPriceId,
    plan.yearlyPriceId,
  ]).filter(Boolean)
}
