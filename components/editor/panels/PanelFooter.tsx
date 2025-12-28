'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified footer for panels that need action buttons or controls.
 * Currently used by SettingsPanel for the reset button.
 */
export function PanelFooter({ children, className }: PanelFooterProps) {
  return (
    <div className={cn('px-4 py-3 border-t border-border shrink-0', className)}>
      {children}
    </div>
  );
}
