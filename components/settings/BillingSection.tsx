'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PricingGrid } from '@/components/pricing';

interface BillingSectionProps {
  currentPlan: string;
}

export function BillingSection({ currentPlan }: BillingSectionProps) {
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

  const handleCheckout = async (planKey: string, priceId: string) => {
    if (!priceId) {
      toast.info('This plan is not yet available. Please contact support.');
      return;
    }

    setLoadingPlan(planKey);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, plan: planKey }),
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
        <PricingGrid
          currentPlan={currentPlan}
          onCheckout={handleCheckout}
          loadingPlan={loadingPlan}
        />

        <p className="text-muted-foreground text-center text-sm">
          No credit card for free tier. 14-day trial on paid plans.
        </p>
      </CardContent>
    </Card>
  );
}
