'use client';

import { cn } from '@/lib/utils';

interface ProfileInfluencesProps {
  influences: string[];
  className?: string;
}

export function ProfileInfluences({
  influences,
  className,
}: ProfileInfluencesProps) {
  if (!influences || influences.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground shrink-0">
        Influences
      </span>
      <span className="text-muted-foreground">
        {influences.slice(0, 3).join(' · ')}
      </span>
    </div>
  );
}
