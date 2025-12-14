'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ListPreviewPanelProps {
  children: React.ReactNode | null;
  className?: string;
}

export function ListPreviewPanel({ children, className }: ListPreviewPanelProps) {
  const hasContent = !!children;

  return (
    <div
      className={cn(
        'hidden lg:flex flex-shrink-0 flex-col',
        'border-l border-border bg-muted/30',
        'sticky top-0 h-full',
        'transition-all duration-300 ease-out overflow-hidden',
        hasContent ? 'w-[380px]' : 'w-0 border-l-0',
        className
      )}
    >
      <div className="p-4 h-full overflow-auto w-[380px]">
        {children && (
          <div className="animate-in fade-in duration-150">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

interface ListWithPreviewProps {
  children: React.ReactNode;
  preview: React.ReactNode | null;
  className?: string;
}

export function ListWithPreview({ children, preview, className }: ListWithPreviewProps) {
  return (
    <div className={cn('flex h-full', className)}>
      {/* List area */}
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>

      {/* Preview panel - hidden on mobile/tablet */}
      <ListPreviewPanel>{preview}</ListPreviewPanel>
    </div>
  );
}
