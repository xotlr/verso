'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PanelEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function PanelEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: PanelEmptyStateProps) {
  return (
    <div className={cn('text-center py-8 text-muted-foreground p-3', className)}>
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="font-medium text-xs">{title}</p>
      {description && (
        <p className="text-[10px] mt-1">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-[10px] text-primary hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
