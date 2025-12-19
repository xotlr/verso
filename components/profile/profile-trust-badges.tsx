'use client';

import { Check, Mail, Film, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProfileTrustBadgesProps {
  emailVerified: boolean;
  imdbLinked: boolean;
  projectsCompleted: number;
  className?: string;
}

export function ProfileTrustBadges({
  emailVerified,
  imdbLinked,
  projectsCompleted,
  className,
}: ProfileTrustBadgesProps) {
  const badges = [
    {
      label: 'Email verified',
      icon: Mail,
      active: emailVerified,
    },
    {
      label: 'IMDb linked',
      icon: Film,
      active: imdbLinked,
    },
    {
      label: 'Shipped project',
      icon: Package,
      active: projectsCompleted > 0,
    },
  ];

  const activeBadges = badges.filter((b) => b.active);

  if (activeBadges.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {activeBadges.map((badge) => (
          <Tooltip key={badge.label}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-green-500/10">
                  <Check className="h-2.5 w-2.5 text-green-500" />
                </div>
                <badge.icon className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{badge.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
