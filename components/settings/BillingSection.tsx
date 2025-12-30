'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STRIPE_PLANS } from '@/lib/stripe-constants';

interface BillingSectionProps {
  currentPlan: string;
}

// Build plans array from constants
const plans = Object.entries(STRIPE_PLANS).map(([key, plan]) => ({
  ...plan,
  key: key.toUpperCase(),
  priceIdMonthly: plan.monthlyPriceId,
  priceIdYearly: plan.yearlyPriceId,
}));

export function BillingSection({ currentPlan }: BillingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  const handleManageBilling = async () => {
    setIsLoadingBilling(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'No billing account found') {
          toast.error('No subscription found. Subscribe to access billing.');
        } else {
          toast.error('Failed to open billing portal');
        }
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleCheckout = async (plan: string, priceId: string | undefined) => {
    if (!priceId) {
      toast.info('This plan is not yet available. Please contact support.');
      return;
    }

    setLoadingPlan(plan);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, plan }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Card className="shrink-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>Manage your billing and plan</CardDescription>
          </div>
          {currentPlan !== 'FREE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={isLoadingBilling}
            >
              {isLoadingBilling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={cn(!isYearly ? "font-medium" : "text-muted-foreground")}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={cn(isYearly ? "font-medium" : "text-muted-foreground")}>
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2">
              Save up to 30%
            </Badge>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isYearly={isYearly}
              currentPlan={currentPlan}
              loadingPlan={loadingPlan}
              onCheckout={handleCheckout}
              onManageBilling={handleManageBilling}
            />
          ))}
        </div>

        <p className="text-muted-foreground text-center">
          No credit card for free tier. 14-day trial on paid plans.
        </p>
      </CardContent>
    </Card>
  );
}

interface PlanCardProps {
  plan: typeof plans[number];
  isYearly: boolean;
  currentPlan: string;
  loadingPlan: string | null;
  onCheckout: (plan: string, priceId: string | undefined) => void;
  onManageBilling: () => void;
}

function PlanCard({ plan, isYearly, currentPlan, loadingPlan, onCheckout, onManageBilling }: PlanCardProps) {
  const isCurrentPlan = currentPlan === plan.key;
  const isDowngrade = plan.key === 'FREE' ||
    (plan.key === 'PLUS' && (currentPlan === 'PRO' || currentPlan === 'MAX')) ||
    (plan.key === 'PRO' && currentPlan === 'MAX');
  const isHighlighted = 'highlighted' in plan && plan.highlighted;
  const perUser = 'perUser' in plan && plan.perUser;
  const yearlyDiscount = 'yearlyDiscount' in plan ? plan.yearlyDiscount : undefined;

  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl border transition-all",
        isCurrentPlan
          ? "border-primary bg-primary/5 shadow-xl ring-2 ring-primary/20 scale-[1.02]"
          : isHighlighted
            ? "border-primary bg-primary/5 shadow-xl ring-2 ring-primary/20 scale-[1.02]"
            : "bg-card hover:shadow-md"
      )}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg">
          Current Plan
        </div>
      )}
      {!isCurrentPlan && isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg">
          Most Popular
        </div>
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
            /{isYearly ? 'year' : 'month'}
            {perUser && '/user'}
          </span>
        </div>
        {isYearly && yearlyDiscount && (
          <Badge variant="secondary" className="mt-2">
            {yearlyDiscount}
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

      {isCurrentPlan ? (
        <Button
          variant="outline"
          className="w-full"
          disabled
        >
          <Check className="h-4 w-4 mr-2" />
          Active
        </Button>
      ) : plan.key === 'FREE' ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={onManageBilling}
          disabled={currentPlan === 'FREE'}
        >
          {currentPlan === 'FREE' ? 'Current' : 'Downgrade'}
        </Button>
      ) : (
        <Button
          variant={isHighlighted && !isDowngrade ? "default" : "outline"}
          className="w-full"
          onClick={() =>
            onCheckout(
              plan.key,
              isYearly ? plan.priceIdYearly : plan.priceIdMonthly
            )
          }
          disabled={loadingPlan === plan.key}
        >
          {loadingPlan === plan.key ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isDowngrade ? (
            'Downgrade'
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade
            </>
          )}
        </Button>
      )}
    </div>
  );
}
