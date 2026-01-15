'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  limitations?: string[];
  cta: string;
  ctaHref?: string;
  highlighted?: boolean;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  limitations = [],
  cta,
  ctaHref,
  highlighted,
  isCurrentPlan,
  isLoading,
  onClick,
}: PricingCardProps) {
  const buttonContent = (
    <>
      {isLoading ? (
        <>
          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
          Processing...
        </>
      ) : isCurrentPlan ? (
        'Current Plan'
      ) : (
        <>
          {cta}
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </>
      )}
    </>
  );

  return (
    <div
      className={cn(
        'relative h-full flex flex-col p-4 sm:p-6 rounded-xl border transition-all duration-300',
        highlighted
          ? 'border-primary bg-primary text-primary-foreground shadow-lg lg:scale-[1.02] hover:shadow-xl'
          : 'bg-card hover:border-border/80 hover:shadow-lg hover:-translate-y-1'
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground shadow-md px-4 py-1.5 text-xs font-medium uppercase tracking-wide whitespace-nowrap pointer-events-none">
          Most Popular
        </div>
      )}

      <h3 className="text-base sm:text-lg font-medium">{name}</h3>

      <div className="mt-1 sm:mt-2 mb-2 sm:mb-4">
        <span className="text-2xl sm:text-4xl font-medium">{price}</span>
        {period && (
          <span
            className={cn(
              'text-xs sm:text-sm',
              highlighted ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
            )}
          >
            {period}
          </span>
        )}
      </div>

      <p
        className={cn(
          'text-xs sm:text-sm mb-3 sm:mb-6 line-clamp-2 sm:line-clamp-none',
          highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground/80'
        )}
      >
        {description}
      </p>

      <ul className="flex-1 space-y-2 sm:space-y-3 mb-3 sm:mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-normal">
            <Check
              className={cn(
                'h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0',
                highlighted ? 'text-primary-foreground' : 'text-primary'
              )}
            />
            <span className="line-clamp-1 sm:line-clamp-none">{feature}</span>
          </li>
        ))}
        {limitations.map((limitation, i) => (
          <li
            key={`limit-${i}`}
            className={cn(
              'flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-normal',
              highlighted ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
            )}
          >
            <X
              className={cn(
                'h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0',
                highlighted ? 'text-primary-foreground/40' : 'text-muted-foreground/40'
              )}
            />
            <span className="line-clamp-1 sm:line-clamp-none line-through">{limitation}</span>
          </li>
        ))}
      </ul>

      {ctaHref && !onClick ? (
        <Button
          className={cn(
            'w-full h-9 sm:h-11 text-xs sm:text-sm group rounded-xl transition-all duration-200',
            !isCurrentPlan && 'hover:-translate-y-0.5 hover:shadow-md',
            highlighted
              ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          variant="ghost"
          asChild
          disabled={isCurrentPlan}
        >
          <Link href={ctaHref} className="flex items-center justify-center gap-1 sm:gap-2">
            {buttonContent}
          </Link>
        </Button>
      ) : (
        <Button
          className={cn(
            'w-full h-9 sm:h-11 text-xs sm:text-sm group rounded-xl transition-all duration-200',
            !isCurrentPlan && !isLoading && 'hover:-translate-y-0.5 hover:shadow-md',
            highlighted
              ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          variant="ghost"
          onClick={onClick}
          disabled={isCurrentPlan || isLoading}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">{buttonContent}</span>
        </Button>
      )}
    </div>
  );
}
