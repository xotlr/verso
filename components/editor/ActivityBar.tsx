'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Film, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ActivityBarPanel = 'scenes' | 'characters' | null;

interface ActivityBarProps {
  activePanel: ActivityBarPanel;
  onPanelChange: (panel: ActivityBarPanel) => void;
  scenesCount?: number;
  charactersCount?: number;
  className?: string;
}

/**
 * VS Code-style activity bar with icons for Scenes and Characters.
 * Sits between the main sidebar and the content area.
 */
export function ActivityBar({
  activePanel,
  onPanelChange,
  scenesCount = 0,
  charactersCount = 0,
  className,
}: ActivityBarProps) {
  const handleClick = (panel: ActivityBarPanel) => {
    // Toggle off if clicking the active panel, otherwise switch to new panel
    if (activePanel === panel) {
      onPanelChange(null);
    } else {
      onPanelChange(panel);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col items-center py-2 gap-1',
          'w-12 bg-card border-r border-border',
          'shrink-0',
          className
        )}
      >
        {/* Scenes Icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleClick('scenes')}
              className={cn(
                'relative flex items-center justify-center',
                'w-10 h-10 rounded-lg',
                'transition-colors',
                activePanel === 'scenes'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Film className="h-5 w-5" />
              {scenesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground px-1">
                  {scenesCount > 99 ? '99+' : scenesCount}
                </span>
              )}
              {/* Active indicator bar */}
              {activePanel === 'scenes' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Scenes ({scenesCount})</p>
          </TooltipContent>
        </Tooltip>

        {/* Characters Icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleClick('characters')}
              className={cn(
                'relative flex items-center justify-center',
                'w-10 h-10 rounded-lg',
                'transition-colors',
                activePanel === 'characters'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Users className="h-5 w-5" />
              {charactersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground px-1">
                  {charactersCount > 99 ? '99+' : charactersCount}
                </span>
              )}
              {/* Active indicator bar */}
              {activePanel === 'characters' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Characters ({charactersCount})</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
