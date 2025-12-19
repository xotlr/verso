'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BillingTabProps {
  teamId: string;
  maxSeats: number;
  seatsUsed: number;
  isOwner: boolean;
}

export function BillingTab({
  teamId,
  maxSeats,
  seatsUsed,
  isOwner,
}: BillingTabProps) {
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  const seatsAvailable = maxSeats - seatsUsed;

  const handleManageBilling = async () => {
    setIsLoadingBilling(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/billing/portal`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to open billing portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
      setIsLoadingBilling(false);
    }
  };

  const handleUpgrade = async () => {
    setIsLoadingBilling(true);
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || '';

      if (!priceId) {
        toast.error('Team plan not configured. Contact support.');
        setIsLoadingBilling(false);
        return;
      }

      const response = await fetch(`/api/teams/${teamId}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start checkout');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoadingBilling(false);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Seats Usage */}
      <div className="p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Seats</h4>
          <span className="text-sm text-muted-foreground">
            {seatsUsed} / {maxSeats} used
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all"
            style={{ width: `${(seatsUsed / maxSeats) * 100}%` }}
          />
        </div>
        {seatsAvailable <= 1 && (
          <p className="text-xs text-muted-foreground mt-2">
            {seatsAvailable === 0
              ? "You've used all available seats. Upgrade to add more members."
              : "Only 1 seat remaining."}
          </p>
        )}
      </div>

      {/* Plan Info */}
      <div className="p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Current Plan</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {maxSeats <= 3 ? 'Free' : 'Team'} plan with {maxSeats} seats
            </p>
          </div>
          {isOwner && maxSeats > 3 && (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={isLoadingBilling}
            >
              {isLoadingBilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Billing
            </Button>
          )}
        </div>
      </div>

      {/* Upgrade CTA */}
      {maxSeats <= 3 && isOwner && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium">Need more seats?</h4>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Upgrade to the Team plan for up to 10 seats and additional features.
          </p>
          <Button onClick={handleUpgrade} disabled={isLoadingBilling}>
            {isLoadingBilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upgrade to Team
          </Button>
        </div>
      )}
    </div>
  );
}
