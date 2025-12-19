'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PanelHeaderProps {
  title: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
}

export function PanelHeader({
  title,
  count,
  onAdd,
  addLabel = 'Add',
  className,
}: PanelHeaderProps) {
  return (
    <div className={cn('px-4 py-3 border-b border-border flex items-center gap-2', className)}>
      <h2 className="font-semibold text-sm">{title}</h2>
      {count !== undefined && (
        <span className="text-[10px] text-muted-foreground ml-auto">
          {count}
        </span>
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
