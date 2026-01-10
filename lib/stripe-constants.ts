/**
 * Stripe Product and Price IDs for Verso
 *
 * Configure these price IDs in your environment variables:
 * - NEXT_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID
 */

export const STRIPE_PLANS = {
  free: {
    name: "Free",
    description: "Write unlimited pages",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: undefined,
    yearlyPriceId: undefined,
    features: [
      "Unlimited screenplays",
      "1 project",
      "Auto-formatting",
      "PDF export",
      "Index cards + beat board",
    ],
    limitations: [
      "No FDX/Fountain export",
      "No collaboration",
    ],
    cta: "Start Free",
  },
  plus: {
    name: "Plus",
    description: "Multiple projects, all exports",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID || "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID || "",
    monthlyPrice: 12.99,
    yearlyPrice: 99.99,
    yearlyDiscount: "Save $56",
    features: [
      "Unlimited projects",
      "FDX + Fountain export",
      "Character analytics",
      "Cloud sync",
      "Priority support",
    ],
    limitations: [],
    highlighted: true,
    cta: "Try Plus",
  },
  pro: {
    name: "Pro",
    description: "Write with your team",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || "",
    monthlyPrice: 29.99,
    yearlyPrice: 249.99,
    yearlyDiscount: "Save $110",
    features: [
      "Everything in Plus",
      "Real-time collaboration",
      "Up to 5 writers",
      "Version history",
      "Comments + notes",
    ],
    limitations: [],
    cta: "Try Pro",
  },
  max: {
    name: "Max",
    description: "Production-ready",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || "",
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || "",
    monthlyPrice: 99.99,
    yearlyPrice: 899.99,
    yearlyDiscount: "Save $300",
    perUser: true,
    features: [
      "Everything in Pro",
      "Unlimited team",
      "Shotlists + production tools",
      "Admin controls",
      "Custom branding",
    ],
    limitations: [],
    cta: "Contact Sales",
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
  ]).filter((id): id is string => Boolean(id))
}
