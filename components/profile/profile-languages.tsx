'use client';

import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileLanguagesProps {
  languages: string[];
  className?: string;
}

export function ProfileLanguages({
  languages,
  className,
}: ProfileLanguagesProps) {
  if (!languages || languages.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">
        {languages.join(', ')}
      </span>
    </div>
  );
}
