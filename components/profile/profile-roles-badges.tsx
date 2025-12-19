'use client';

import { Badge } from '@/components/ui/badge';
import { getRoleLabel } from '@/types/profile';
import { cn } from '@/lib/utils';

interface ProfileRolesBadgesProps {
  roles: string[];
  className?: string;
  max?: number;
}

export function ProfileRolesBadges({
  roles,
  className,
  max = 5,
}: ProfileRolesBadgesProps) {
  if (!roles || roles.length === 0) return null;

  const displayRoles = roles.slice(0, max);

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {displayRoles.map((role) => (
        <Badge
          key={role}
          variant="secondary"
          className="text-xs font-medium"
        >
          {getRoleLabel(role)}
        </Badge>
      ))}
      {roles.length > max && (
        <Badge variant="outline" className="text-xs">
          +{roles.length - max}
        </Badge>
      )}
    </div>
  );
}
