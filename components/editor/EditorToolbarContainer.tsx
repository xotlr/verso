'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EditorToolbarContainerProps {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  children: React.ReactNode;
}

/**
 * Procreate-style toolbar container.
 * Pill-shaped container matching ActivityBar styling.
 */
export function EditorToolbarContainer({
  orientation = 'vertical',
  className,
  children,
}: EditorToolbarContainerProps) {
  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'vertical' ? 'flex-col py-2 gap-1' : 'flex-row px-2 gap-1',
        'bg-background',
        'rounded-full border border-border/50',
        'shadow-lg shadow-black/10',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Visual separator for toolbar sections.
 */
export function ToolbarDivider({
  orientation = 'vertical',
  className,
}: {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-border/50',
        orientation === 'vertical' ? 'h-px w-6 my-1' : 'w-px h-6 mx-1',
        className
      )}
    />
  );
}
