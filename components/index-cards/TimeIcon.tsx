import React from 'react';
import {
  Sun,
  Moon,
  Sunrise,
  Sunset,
  CloudSun,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeTimeOfDay } from '@/lib/prosemirror/utils/time-detection';

interface TimeIconProps {
  time?: string;
  className?: string;
}

/**
 * Icon component for time of day indicators.
 */
export function TimeIcon({ time, className }: TimeIconProps) {
  const normalized = normalizeTimeOfDay(time);
  const iconClass = cn('h-3 w-3', className);

  switch (normalized) {
    case 'NIGHT':
      return <Moon className={iconClass} />;
    case 'DAWN':
      return <Sunrise className={iconClass} />;
    case 'MORNING':
      return <CloudSun className={iconClass} />;
    case 'AFTERNOON':
      return <Sun className={iconClass} />;
    case 'DUSK':
    case 'EVENING':
      return <Sunset className={iconClass} />;
    case 'CONTINUOUS':
      return <Clock className={iconClass} />;
    default:
      return <Sun className={iconClass} />;
  }
}
