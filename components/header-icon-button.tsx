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
  /** Icon to show when pressed (optional) */
  activeIcon?: React.ReactNode;
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
  ({ icon, activeIcon, tooltip, isActive = false, tooltipSide = 'bottom', className, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        data-header-button=""
        className={cn(
          // Base styles matching SidebarMenuButton
          'flex items-center justify-center rounded-lg p-2 text-sm outline-none transition-all duration-150',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Size
          'size-8',
          // Default (non-glass) hover state - glass handled via CSS
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          'active:scale-[0.98]',
          isActive && 'bg-primary text-primary-foreground font-medium',
          // Icon color
          '[&_svg]:text-muted-foreground [&_svg]:hover:text-foreground',
          isActive && '[&_svg]:text-primary-foreground',
          // Toggle icons on active (pressed) state
          activeIcon && '[&_.icon-default]:active:hidden [&_.icon-active]:hidden [&_.icon-active]:active:block',
          className
        )}
        {...props}
      >
        {activeIcon ? (
          <>
            <span className="icon-default">{icon}</span>
            <span className="icon-active">{activeIcon}</span>
          </>
        ) : (
          icon
        )}
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
