"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
      toast.info("This plan is not yet available. Please contact support.")
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
        toast.error(data.error || "Something went wrong")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error("Something went wrong")
    } finally {
      setLoadingPlan(null)
    }
  }

  const plans = [
    {
      name: "Free",
      description: "Write unlimited pages",
      monthlyPrice: 0,
      yearlyPrice: 0,
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
      ctaHref: "/signup",
      priceIdMonthly: undefined,
      priceIdYearly: undefined,
    },
    {
      name: "Plus",
      description: "Multiple projects, all exports",
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
      cta: "Try Plus",
      highlighted: true,
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID,
    },
    {
      name: "Pro",
      description: "Write with your team",
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
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
    },
    {
      name: "Max",
      description: "Production-ready",
      monthlyPrice: 99.99,
      yearlyPrice: 899.99,
      yearlyDiscount: "Save $300",
      perUser: true,
      features: [
        "Everything in Pro",
        "Unlimited team",
        "Schedules + budgets",
        "Admin controls",
        "Custom branding",
      ],
      limitations: [],
      cta: "Contact Sales",
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID,
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID,
    },
  ]

  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-4 mb-16 sm:mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            Pricing
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Free tier is real. Upgrade when you need to.
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border transition-all ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-xl ring-2 ring-primary/20 scale-[1.02]"
                  : "bg-card hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-medium">{plan.name}</h2>
                <p className="text-muted-foreground/80 mt-1 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-medium">
                    ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground/60 text-sm">
                    /{isYearly ? "year" : "month"}
                    {plan.perUser && "/user"}
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
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-light">{feature}</span>
                  </li>
                ))}
                {plan.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground/60">
                    <span className="h-4 w-4 flex items-center justify-center flex-shrink-0">
                      -
                    </span>
                    <span className="text-sm font-light">{limitation}</span>
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
            No credit card for free tier. 14-day trial on paid plans.
          </p>
          <p className="text-muted-foreground mt-2">
            Questions? <Link href="/contact" className="text-primary hover:underline">help@verso.ac</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
