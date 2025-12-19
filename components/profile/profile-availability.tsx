'use client';

import { cn } from '@/lib/utils';
import { AVAILABILITY_CONFIG, type Availability } from '@/types/profile';

interface ProfileAvailabilityProps {
  availability: Availability;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProfileAvailability({
  availability,
  className,
  showLabel = true,
  size = 'md',
}: ProfileAvailabilityProps) {
  const config = AVAILABILITY_CONFIG[availability];

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
    >
      <span
        className={cn(
          'rounded-full',
          config.color,
          size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
        )}
      />
      {showLabel && (
        <span className={cn('font-medium', config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
