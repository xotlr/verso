'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { STRIPE_PLANS } from '@/lib/stripe-constants';
import { PricingCard } from './pricing-card';

export interface PricingGridProps {
  currentPlan?: string;
  onCheckout?: (planKey: string, priceId: string) => Promise<void>;
  loadingPlan?: string | null;
  showToggle?: boolean;
  defaultYearly?: boolean;
  ctaHrefBase?: string;
  className?: string;
}

export function PricingGrid({
  currentPlan,
  onCheckout,
  loadingPlan: externalLoadingPlan,
  showToggle = true,
  defaultYearly = false,
  ctaHrefBase = '/signup',
  className,
}: PricingGridProps) {
  const [isYearly, setIsYearly] = useState(defaultYearly);
  const [internalLoadingPlan, setInternalLoadingPlan] = useState<string | null>(null);

  const loadingPlan = externalLoadingPlan ?? internalLoadingPlan;

  const handleCheckout = async (planKey: string, priceId: string | undefined) => {
    if (!priceId || !onCheckout) return;

    setInternalLoadingPlan(planKey);
    try {
      await onCheckout(planKey, priceId);
    } finally {
      setInternalLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: 'FREE',
      ...STRIPE_PLANS.free,
      priceId: undefined,
    },
    {
      key: 'PLUS',
      ...STRIPE_PLANS.plus,
      priceId: isYearly ? STRIPE_PLANS.plus.yearlyPriceId : STRIPE_PLANS.plus.monthlyPriceId,
    },
    {
      key: 'PRO',
      ...STRIPE_PLANS.pro,
      priceId: isYearly ? STRIPE_PLANS.pro.yearlyPriceId : STRIPE_PLANS.pro.monthlyPriceId,
    },
    {
      key: 'MAX',
      ...STRIPE_PLANS.max,
      priceId: isYearly ? STRIPE_PLANS.max.yearlyPriceId : STRIPE_PLANS.max.monthlyPriceId,
    },
  ];

  const formatPrice = (plan: typeof plans[number]) => {
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    return `$${price}`;
  };

  const formatPeriod = (plan: typeof plans[number]) => {
    const base = isYearly ? '/year' : '/month';
    const perUser = 'perUser' in plan && plan.perUser;
    return perUser ? `${base}/user` : base;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {showToggle && (
        <div className="flex items-center justify-center gap-4">
          <span className={cn(!isYearly ? 'font-medium' : 'text-muted-foreground')}>Monthly</span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={cn(isYearly ? 'font-medium' : 'text-muted-foreground')}>Yearly</span>
          {isYearly && (
            <Badge variant="secondary" className="ml-2">
              Save up to 30%
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 items-start">
        {plans.map((plan) => {
          const isHighlighted = 'highlighted' in plan && plan.highlighted;
          const yearlyDiscount = isYearly && 'yearlyDiscount' in plan ? plan.yearlyDiscount : undefined;
          const isCurrentUserPlan = currentPlan?.toUpperCase() === plan.key;

          return (
            <PricingCard
              key={plan.key}
              name={plan.name}
              price={formatPrice(plan)}
              period={formatPeriod(plan)}
              description={plan.description}
              features={[...plan.features, ...(yearlyDiscount ? [yearlyDiscount] : [])]}
              limitations={plan.limitations ? [...plan.limitations] : undefined}
              cta={plan.cta}
              ctaHref={plan.key === 'FREE' && !onCheckout ? ctaHrefBase : undefined}
              highlighted={isHighlighted}
              isCurrentPlan={isCurrentUserPlan}
              isLoading={loadingPlan === plan.key}
              onClick={
                plan.key !== 'FREE' && onCheckout
                  ? () => handleCheckout(plan.key, plan.priceId)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
