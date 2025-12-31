"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { PricingGrid } from "@/components/pricing"

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const currentPlan = ((session?.user as { plan?: string })?.plan || 'FREE').toUpperCase()

  const handleCheckout = async (planKey: string, priceId: string) => {
    if (!session) {
      router.push("/signup")
      return
    }

    if (!priceId) {
      toast.info("This plan is not yet available. Please contact support.")
      return
    }

    setLoadingPlan(planKey)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan: planKey }),
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

        <PricingGrid
          currentPlan={currentPlan}
          onCheckout={handleCheckout}
          loadingPlan={loadingPlan}
          ctaHrefBase="/signup"
        />

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
