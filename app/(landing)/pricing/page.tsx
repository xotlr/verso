"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, Loader2 } from "lucide-react"

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isYearly, setIsYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleCheckout = async (plan: string, priceId: string | undefined) => {
    if (!session) {
      router.push("/signup")
      return
    }

    if (!priceId) {
      alert("This plan is not yet available. Please contact support.")
      return
    }

    setLoadingPlan(plan)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Something went wrong")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Something went wrong")
    } finally {
      setLoadingPlan(null)
    }
  }

  const plans = [
    {
      name: "Free",
      description: "Perfect for getting started",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        "Up to 3 projects",
        "Industry-standard formatting",
        "Index cards view",
        "Beat board",
        "PDF export",
        "Dark mode",
      ],
      limitations: [
        "Limited export formats",
        "No collaboration",
      ],
      cta: "Get Started",
      ctaHref: "/signup",
      priceIdMonthly: undefined,
      priceIdYearly: undefined,
    },
    {
      name: "Pro",
      description: "For serious screenwriters",
      monthlyPrice: 12,
      yearlyPrice: 99,
      yearlyDiscount: "Save $45",
      features: [
        "Unlimited projects",
        "All export formats (PDF, FDX, Fountain)",
        "Index cards view",
        "Beat board",
        "Character analytics",
        "Priority support",
        "Cloud sync",
      ],
      limitations: [],
      cta: "Upgrade to Pro",
      highlighted: true,
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
    },
    {
      name: "Team",
      description: "For writing teams & production",
      monthlyPrice: 29,
      yearlyPrice: 249,
      yearlyDiscount: "Save $99",
      features: [
        "Everything in Pro",
        "Real-time collaboration",
        "Up to 10 team members",
        "Team workspace",
        "Version history",
        "Comments & notes",
        "Admin controls",
      ],
      limitations: [],
      cta: "Upgrade to Team",
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID,
    },
  ]

  return (
    <div className="py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that works for you. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={!isYearly ? "font-medium" : "text-muted-foreground"}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={isYearly ? "font-medium" : "text-muted-foreground"}>
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2">
              Save up to 30%
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-xl"
                  : "bg-card"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">
                    ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{isYearly ? "year" : "month"}
                  </span>
                </div>
                {isYearly && plan.yearlyDiscount && (
                  <Badge variant="secondary" className="mt-2">
                    {plan.yearlyDiscount}
                  </Badge>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
                {plan.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <span className="h-5 w-5 flex items-center justify-center flex-shrink-0">
                      -
                    </span>
                    <span className="text-sm">{limitation}</span>
                  </li>
                ))}
              </ul>

              {plan.name === "Free" ? (
                <Button
                  className="w-full"
                  variant="outline"
                  asChild
                  disabled={!!session}
                >
                  <Link href="/signup">
                    {session ? "Current Plan" : plan.cta}
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() =>
                    handleCheckout(
                      plan.name.toUpperCase(),
                      isYearly ? plan.priceIdYearly : plan.priceIdMonthly
                    )
                  }
                  disabled={loadingPlan === plan.name.toUpperCase()}
                >
                  {loadingPlan === plan.name.toUpperCase() ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
          <p className="text-muted-foreground mt-2">
            Questions?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
