'use client';

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ZoomDropdownProps {
  zoom: number;
  fitToWidthScale: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
}

const ZOOM_PRESETS = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1.0, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2.0, label: '200%' },
];

/**
 * Horizontal zoom dropdown for the unified toolbar.
 * Shows current zoom percentage with preset options.
 */
export function ZoomDropdown({
  zoom,
  fitToWidthScale,
  onZoomChange,
  onResetZoom,
}: ZoomDropdownProps) {
  const isFitToWidth = Math.abs(zoom - fitToWidthScale) < 0.01;
  const displayValue = isFitToWidth ? 'Fit' : `${Math.round(zoom * 100)}%`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1 px-2 h-8 rounded-md',
            'text-sm font-medium text-muted-foreground',
            'hover:text-foreground hover:bg-accent/50',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <span className="min-w-[3ch] tabular-nums">{displayValue}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[120px]">
        <DropdownMenuItem onClick={onResetZoom}>
          <span className="flex-1">Fit to width</span>
          {isFitToWidth && <Check className="h-4 w-4 ml-2" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {ZOOM_PRESETS.map((preset) => {
          const isActive = !isFitToWidth && Math.abs(zoom - preset.value) < 0.01;
          return (
            <DropdownMenuItem
              key={preset.value}
              onClick={() => onZoomChange(preset.value)}
            >
              <span className="flex-1">{preset.label}</span>
              {isActive && <Check className="h-4 w-4 ml-2" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
