'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BillingSectionProps {
  currentPlan: string;
}

interface Plan {
  name: string;
  key: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount?: string;
  perUser?: boolean;
  features: string[];
  highlighted?: boolean;
  priceIdMonthly: string | undefined;
  priceIdYearly: string | undefined;
}

const plans: Plan[] = [
  {
    name: 'Free',
    key: 'FREE',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Unlimited screenplays & pages',
      '1 project',
      'Industry-standard formatting',
      'PDF export',
      'Dark mode',
    ],
    priceIdMonthly: undefined,
    priceIdYearly: undefined,
  },
  {
    name: 'Plus',
    key: 'PLUS',
    description: 'For serious screenwriters',
    monthlyPrice: 12.99,
    yearlyPrice: 99.99,
    yearlyDiscount: 'Save $56',
    features: [
      'Unlimited projects',
      'All export formats (PDF, FDX, Fountain)',
      'Index cards & beat board',
      'Character analytics',
      'Cloud sync',
      'Priority support',
    ],
    highlighted: true,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PLUS_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PLUS_YEARLY_PRICE_ID,
  },
  {
    name: 'Pro',
    key: 'PRO',
    description: 'For writing teams',
    monthlyPrice: 29.99,
    yearlyPrice: 249.99,
    yearlyDiscount: 'Save $110',
    features: [
      'Everything in Plus',
      'Real-time collaboration',
      'Up to 5 team members',
      'Version history',
      'Comments & notes',
      'Team workspace',
    ],
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
  },
  {
    name: 'Max',
    key: 'MAX',
    description: 'For production & studios',
    monthlyPrice: 99.99,
    yearlyPrice: 899.99,
    yearlyDiscount: 'Save $300',
    perUser: true,
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Production tools',
      'Schedules & budgets',
      'Admin controls',
      'Custom branding',
    ],
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY_PRICE_ID,
  },
];

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
        <div className="flex items-center justify-center gap-3">
          <span className={cn("text-sm", !isYearly ? "font-medium" : "text-muted-foreground")}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={cn("text-sm", isYearly ? "font-medium" : "text-muted-foreground")}>
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="text-xs">
              Save up to 30%
            </Badge>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

        <p className="text-xs text-center text-muted-foreground">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </CardContent>
    </Card>
  );
}

interface PlanCardProps {
  plan: Plan;
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

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border transition-all",
        isCurrentPlan
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : plan.highlighted
            ? "border-primary/50 bg-primary/[0.02]"
            : "border-border hover:border-border/80"
      )}
    >
      {isCurrentPlan && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
          Current Plan
        </Badge>
      )}
      {!isCurrentPlan && plan.highlighted && (
        <Badge variant="secondary" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
          Most Popular
        </Badge>
      )}

      <div className="mb-3">
        <h3 className="font-semibold">{plan.name}</h3>
        <p className="text-xs text-muted-foreground">{plan.description}</p>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-semibold">
            ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
          </span>
          <span className="text-xs text-muted-foreground">
            /{isYearly ? 'yr' : 'mo'}
            {plan.perUser && '/user'}
          </span>
        </div>
        {isYearly && plan.yearlyDiscount && (
          <Badge variant="secondary" className="mt-1 text-[10px]">
            {plan.yearlyDiscount}
          </Badge>
        )}
      </div>

      <ul className="space-y-1.5 mb-4">
        {plan.features.slice(0, 4).map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <Check className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
        {plan.features.length > 4 && (
          <li className="text-xs text-muted-foreground pl-5">
            +{plan.features.length - 4} more
          </li>
        )}
      </ul>

      {isCurrentPlan ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Active
        </Button>
      ) : plan.key === 'FREE' ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onManageBilling}
          disabled={currentPlan === 'FREE'}
        >
          {currentPlan === 'FREE' ? 'Current' : 'Downgrade'}
        </Button>
      ) : (
        <Button
          variant={plan.highlighted && !isDowngrade ? "default" : "outline"}
          size="sm"
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
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Processing...
            </>
          ) : isDowngrade ? (
            'Downgrade'
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Upgrade
            </>
          )}
        </Button>
      )}
    </div>
  );
}
