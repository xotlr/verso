'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Film, Users, Clapperboard, StickyNote } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EditorPanelType } from './EditorPanelContext';

export type ActivityBarPanel = EditorPanelType | null;

interface ActivityBarProps {
  activePanel: ActivityBarPanel;
  onPanelChange: (panel: ActivityBarPanel) => void;
  scenesCount?: number;
  charactersCount?: number;
  shotlistCount?: number;
  notesCount?: number;
  position?: 'left' | 'right';
  className?: string;
}

interface ActivityBarButtonProps {
  panel: EditorPanelType;
  activePanel: ActivityBarPanel;
  onClick: (panel: ActivityBarPanel) => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  indicatorPosition: 'left' | 'right';
}

function ActivityBarButton({
  panel,
  activePanel,
  onClick,
  icon,
  label,
  count = 0,
  indicatorPosition,
}: ActivityBarButtonProps) {
  const isActive = activePanel === panel;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(panel)}
          className={cn(
            'relative flex items-center justify-center',
            'w-9 h-9 rounded-full',
            'transition-all duration-200',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          {icon}
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground px-1">
              {count > 99 ? '99+' : count}
            </span>
          )}
          {/* Active indicator dot */}
          {isActive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={indicatorPosition === 'left' ? 'right' : 'left'}>
        <p>
          {label}
          {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * VS Code-style activity bar with icons for Scenes, Characters, Shotlist, and Notes.
 * Supports positioning on left or right side.
 */
export function ActivityBar({
  activePanel,
  onPanelChange,
  scenesCount = 0,
  charactersCount = 0,
  shotlistCount = 0,
  notesCount = 0,
  position = 'right',
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

  // Indicator position is opposite of panel position
  // (indicator shows on the side facing the panel content)
  const indicatorPosition = position === 'right' ? 'left' : 'right';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col items-center py-2 gap-1',
          'w-11 bg-card/95 backdrop-blur-md',
          'rounded-full border border-border/50',
          'shadow-lg shadow-black/10',
          'shrink-0',
          className
        )}
      >
        <ActivityBarButton
          panel="scenes"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<Film className="h-5 w-5" />}
          label="Scenes"
          count={scenesCount}
          indicatorPosition={indicatorPosition}
        />

        <ActivityBarButton
          panel="characters"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<Users className="h-5 w-5" />}
          label="Characters"
          count={charactersCount}
          indicatorPosition={indicatorPosition}
        />

        <ActivityBarButton
          panel="shotlist"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<Clapperboard className="h-5 w-5" />}
          label="Shotlist"
          count={shotlistCount}
          indicatorPosition={indicatorPosition}
        />

        <ActivityBarButton
          panel="notes"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<StickyNote className="h-5 w-5" />}
          label="Notes"
          count={notesCount}
          indicatorPosition={indicatorPosition}
        />
      </div>
    </TooltipProvider>
  );
}
