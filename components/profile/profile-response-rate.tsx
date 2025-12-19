'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RESPONSE_RATE_CONFIG, type ResponseRate } from '@/types/profile';

interface ProfileResponseRateProps {
  responseRate: ResponseRate;
  className?: string;
}

export function ProfileResponseRate({
  responseRate,
  className,
}: ProfileResponseRateProps) {
  const config = RESPONSE_RATE_CONFIG[responseRate];

  if (!config.description) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Clock className="h-3.5 w-3.5" />
      <span>{config.description}</span>
    </div>
  );
}
