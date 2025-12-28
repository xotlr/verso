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
  variant?: 'default' | 'ghost';
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
  variant = 'default',
  tooltipSide = 'right',
  className,
}: ToolbarButtonProps) {
  const { button } = toolbarStyles;

  // Determine state classes based on variant
  const getStateClasses = () => {
    if (disabled) return button.states.disabled;
    if (variant === 'ghost') return button.states.ghost;
    return isActive ? button.states.active : button.states.inactive;
  };

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
            getStateClasses(),
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
