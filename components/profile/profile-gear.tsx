'use client';

import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileGearProps {
  gear: string;
  className?: string;
}

export function ProfileGear({ gear, className }: ProfileGearProps) {
  if (!gear) return null;

  return (
    <div className={cn('flex items-start gap-2 text-sm', className)}>
      <Camera className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-muted-foreground">{gear}</span>
    </div>
  );
}
