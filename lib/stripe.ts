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
  FREE: { projects: 3, collaboration: false, maxTeamSeats: 0 },   // Cannot create teams
  PRO: { projects: Infinity, collaboration: true, maxTeamSeats: 3 },   // Small team
  TEAM: { projects: Infinity, collaboration: true, maxTeamSeats: 10 }, // Standard team
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

// Price IDs from environment
export const PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  TEAM_MONTHLY: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
  TEAM_YEARLY: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
} as const
