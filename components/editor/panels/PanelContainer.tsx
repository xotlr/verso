'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PanelContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified container for all editor panel subpanels.
 * Provides consistent flex structure for header, tabs, content, and footer.
 *
 * Usage:
 * <PanelContainer>
 *   <PanelHeader ... />
 *   <PanelTabs ... />      // optional
 *   <PanelSearch ... />    // optional
 *   <PanelContent>
 *     {children}
 *   </PanelContent>
 *   <PanelFooter ... />    // optional
 * </PanelContainer>
 */
export function PanelContainer({ children, className }: PanelContainerProps) {
  return (
    <div className={cn('flex flex-col overflow-hidden bg-sidebar rounded-xl', className)}>
      {children}
    </div>
  );
}
