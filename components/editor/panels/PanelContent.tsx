'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PanelContentProps {
  children: React.ReactNode;
  /** Disable ScrollArea wrapper (for custom scroll handling) */
  noScroll?: boolean;
  /** Inner padding (default: 'p-4') */
  padding?: string;
  className?: string;
}

/**
 * Unified scrollable content area for panels.
 * Wraps content in ScrollArea with consistent styling.
 */
export function PanelContent({
  children,
  noScroll = false,
  padding = 'p-4',
  className,
}: PanelContentProps) {
  if (noScroll) {
    return (
      <div className={cn('flex-1 min-h-0 overflow-auto', padding, className)}>
        {children}
      </div>
    );
  }

  return (
    <ScrollArea className={cn('flex-1 min-h-0', className)} fadeEdges fadeHeight="1.5rem">
      <div className={padding}>
        {children}
      </div>
    </ScrollArea>
  );
}
