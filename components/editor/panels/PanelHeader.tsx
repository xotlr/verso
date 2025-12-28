'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PanelHeaderProps {
  title: string;
  /** Optional description shown below the title */
  description?: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  /** Link to the full page view */
  viewHref?: string;
  className?: string;
}

export function PanelHeader({
  title,
  description,
  count,
  onAdd,
  addLabel = 'Add',
  viewHref,
  className,
}: PanelHeaderProps) {
  return (
    <div className={cn('px-4 py-3 border-b border-border flex items-center gap-2', className)}>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-sm">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {count !== undefined && (
        <span className="text-[10px] text-muted-foreground">
          {count}
        </span>
      )}
      {viewHref && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          asChild
          title="View full page"
        >
          <Link href={viewHref}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
      {onAdd && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onAdd}
          title={addLabel}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
