'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element to display */
  icon: React.ReactNode;
  /** Tooltip text */
  tooltip?: string;
  /** Whether the button is in an active state */
  isActive?: boolean;
  /** Side for the tooltip */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Icon button for headers with sidebar-matching styling.
 * Provides consistent hover states and optional tooltips.
 */
export const HeaderIconButton = React.forwardRef<HTMLButtonElement, HeaderIconButtonProps>(
  ({ icon, tooltip, isActive = false, tooltipSide = 'bottom', className, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        className={cn(
          // Base styles matching SidebarMenuButton
          'flex items-center justify-center rounded-lg p-2 text-sm outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Size
          'size-8',
          // Hover and active states matching sidebar
          'hover:bg-accent hover:text-accent-foreground',
          'active:bg-accent active:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground font-medium',
          // Icon color
          '[&_svg]:text-muted-foreground [&_svg]:hover:text-foreground',
          isActive && '[&_svg]:text-foreground',
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );

    if (!tooltip) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide} sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }
);

HeaderIconButton.displayName = 'HeaderIconButton';
