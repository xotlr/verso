"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STRIPE_PLANS } from "@/lib/stripe-constants";
import {
  Sparkles,
  Crown,
  Zap,
  Check,
  Loader2,
} from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    id: "plus" as const,
    name: STRIPE_PLANS.plus.name,
    description: STRIPE_PLANS.plus.description,
    icon: Sparkles,
    features: STRIPE_PLANS.plus.features,
    popular: true,
  },
  {
    id: "pro" as const,
    name: STRIPE_PLANS.pro.name,
    description: STRIPE_PLANS.pro.description,
    icon: Crown,
    features: STRIPE_PLANS.pro.features,
    popular: false,
  },
  {
    id: "max" as const,
    name: STRIPE_PLANS.max.name,
    description: STRIPE_PLANS.max.description,
    icon: Zap,
    features: STRIPE_PLANS.max.features,
    popular: false,
  },
];

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  const { data: session } = useSession();
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: "plus" | "pro" | "max") => {
    if (!session?.user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setLoadingPlan(planId);

    try {
      const plan = STRIPE_PLANS[planId];
      const priceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;

      if (!priceId) {
        toast.error("Plan not available yet");
        setLoadingPlan(null);
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
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

  const getPrice = (planId: "plus" | "pro" | "max") => {
    const plan = STRIPE_PLANS[planId];
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getMonthlyEquivalent = (planId: "plus" | "pro" | "max") => {
    const plan = STRIPE_PLANS[planId];
    return isYearly ? (plan.yearlyPrice / 12).toFixed(2) : plan.monthlyPrice.toFixed(2);
  };

  const getSavings = (planId: "plus" | "pro" | "max") => {
    const plan = STRIPE_PLANS[planId];
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
              Save up to {getSavings("pro")}%
            </Badge>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl border p-5 transition-all",
                  plan.popular
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:shadow-md"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}

                {/* Plan Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      plan.popular
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground/80">
                      {plan.description}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mt-3 mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium">
                      ${getMonthlyEquivalent(plan.id)}
                    </span>
                    <span className="text-muted-foreground/60 text-sm">/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      ${getPrice(plan.id)} billed yearly
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm font-light">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isLoading || loadingPlan !== null}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Get ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

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
