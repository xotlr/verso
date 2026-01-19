"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import type { PlanType } from "@/lib/stripe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STRIPE_PLANS } from "@/lib/stripe-constants";
import { PricingCard } from "@/components/pricing";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const allPaidPlans = [
  { key: "PLUS" as const, ...STRIPE_PLANS.plus },
  { key: "PRO" as const, ...STRIPE_PLANS.pro },
  { key: "MAX" as const, ...STRIPE_PLANS.max },
];

const PLAN_ORDER: PlanType[] = ['FREE', 'PLUS', 'PRO', 'MAX'];

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  const { data: session } = useSession();
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Get current plan and filter to only show higher tiers
  const currentPlan = (session?.user?.plan as PlanType) || 'FREE';
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);

  const paidPlans = useMemo(() => {
    return allPaidPlans.filter(plan => {
      const planIndex = PLAN_ORDER.indexOf(plan.key);
      return planIndex > currentPlanIndex;
    });
  }, [currentPlanIndex]);

  const handleUpgrade = async (planKey: string) => {
    if (!session?.user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    const plan = allPaidPlans.find(p => p.key === planKey);
    if (!plan) return;

    const priceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;

    if (!priceId) {
      toast.error("Plan not available yet");
      return;
    }

    setLoadingPlan(planKey);

    try {
      // Pass current path so user returns here after checkout
      const returnUrl = window.location.pathname + window.location.search;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, returnUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start checkout");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setLoadingPlan(null);
    }
  };

  const getSavings = () => {
    const plan = STRIPE_PLANS.pro;
    const yearlyMonthly = plan.yearlyPrice / 12;
    const savings = ((plan.monthlyPrice - yearlyMonthly) / plan.monthlyPrice) * 100;
    return Math.round(savings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Choose the plan that works best for you. Cancel anytime.
          </DialogDescription>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 pb-6">
          <Label
            htmlFor="billing-toggle"
            className={cn(
              "text-sm cursor-pointer transition-colors",
              !isYearly ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label
            htmlFor="billing-toggle"
            className={cn(
              "text-sm cursor-pointer transition-colors",
              isYearly ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            Yearly
          </Label>
          {isYearly && (
            <Badge variant="secondary" className="ml-1 text-xs">
              Save up to {getSavings()}%
            </Badge>
          )}
        </div>

        {/* Plans Grid */}
        {paidPlans.length === 0 ? (
          <div className="px-6 pb-6 text-center">
            <p className="text-muted-foreground">
              You're on the highest tier. Thank you for your support!
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid grid-cols-1 gap-4 px-6 pb-6",
            paidPlans.length === 1 && "md:grid-cols-1 max-w-md mx-auto",
            paidPlans.length === 2 && "md:grid-cols-2 max-w-2xl mx-auto",
            paidPlans.length >= 3 && "md:grid-cols-3"
          )}>
            {paidPlans.map((plan) => {
              const isHighlighted = 'highlighted' in plan && plan.highlighted;
              const perUser = 'perUser' in plan && plan.perUser;
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const period = isYearly
                ? `/year${perUser ? '/user' : ''}`
                : `/month${perUser ? '/user' : ''}`;

              return (
                <PricingCard
                  key={plan.key}
                  name={plan.name}
                  price={`$${price}`}
                  period={period}
                  description={plan.description}
                  features={[...plan.features]}
                  cta={plan.cta}
                  highlighted={isHighlighted}
                  isLoading={loadingPlan === plan.key}
                  onClick={() => handleUpgrade(plan.key)}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="bg-muted/50 px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Secure payment powered by Stripe. Cancel or change plans anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
