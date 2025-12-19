'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { toolbarStyles } from './toolbar-styles';

interface EditorToolbarContainerProps {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  children: React.ReactNode;
}

/**
 * Unified toolbar container component.
 * Uses shared toolbar styles for consistent look across all toolbars.
 */
export function EditorToolbarContainer({
  orientation = 'vertical',
  className,
  children,
}: EditorToolbarContainerProps) {
  const { container } = toolbarStyles;

  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'vertical' ? `flex-col ${container.padding.vertical}` : container.padding.horizontal,
        container.base,
        container.rounded,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Visual separator for toolbar sections.
 * Uses shared toolbar styles.
 */
export function ToolbarDivider({
  orientation = 'vertical',
  className,
}: {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}) {
  const { divider } = toolbarStyles;

  return (
    <div
      className={cn(
        divider.base,
        orientation === 'vertical' ? divider.vertical : divider.horizontal,
        className
      )}
    />
  );
}
