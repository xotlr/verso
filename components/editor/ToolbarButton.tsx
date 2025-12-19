'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toolbarStyles } from './toolbar-styles';

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
 * Unified toolbar button component.
 * Uses shared toolbar styles for consistent look across all toolbars.
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
  const { button } = toolbarStyles;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            button.base,
            button.size,
            button.rounded,
            disabled && button.states.disabled,
            isActive ? button.states.active : button.states.inactive,
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
