'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

/**
 * Procreate-style toolbar button with hover scale animation.
 * Matches ActivityBar button styling.
 */
export function ToolbarButton({
  icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
  tooltipSide = 'right',
  className,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'relative flex items-center justify-center',
            'w-9 h-9 rounded-full',
            'transition-all duration-150',
            'hover:scale-110 active:scale-95',
            'disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
            className
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
