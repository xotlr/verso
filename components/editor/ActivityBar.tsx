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

export type ActivityBarPanel = 'scenes' | 'characters' | 'shotlist' | 'notes' | null;

interface ActivityBarProps {
  activePanel: ActivityBarPanel;
  onPanelChange: (panel: ActivityBarPanel) => void;
  scenesCount?: number;
  charactersCount?: number;
  shotlistCount?: number;
  notesCount?: number;
  className?: string;
}

interface ActivityBarButtonProps {
  panel: ActivityBarPanel;
  activePanel: ActivityBarPanel;
  onClick: (panel: ActivityBarPanel) => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  showIndicator?: 'left' | 'right';
}

function ActivityBarButton({
  panel,
  activePanel,
  onClick,
  icon,
  label,
  count = 0,
  showIndicator = 'right',
}: ActivityBarButtonProps) {
  const isActive = activePanel === panel;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(panel)}
          className={cn(
            'relative flex items-center justify-center',
            'w-10 h-10 rounded-lg',
            'transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          {icon}
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground px-1">
              {count > 99 ? '99+' : count}
            </span>
          )}
          {/* Active indicator bar */}
          {isActive && (
            <span
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary",
                showIndicator === 'left' ? 'left-0 rounded-r' : 'right-0 rounded-l'
              )}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={showIndicator === 'left' ? 'right' : 'left'}>
        <p>{label} {count > 0 && `(${count})`}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * VS Code-style activity bar with icons for Scenes, Characters, Shotlist, and Notes.
 * Sits on the right edge of the editor content area.
 */
export function ActivityBar({
  activePanel,
  onPanelChange,
  scenesCount = 0,
  charactersCount = 0,
  shotlistCount = 0,
  notesCount = 0,
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
          'w-12 bg-card border-l border-border',
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
          showIndicator="right"
        />

        <ActivityBarButton
          panel="characters"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<Users className="h-5 w-5" />}
          label="Characters"
          count={charactersCount}
          showIndicator="right"
        />

        <ActivityBarButton
          panel="shotlist"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<Clapperboard className="h-5 w-5" />}
          label="Shotlist"
          count={shotlistCount}
          showIndicator="right"
        />

        <ActivityBarButton
          panel="notes"
          activePanel={activePanel}
          onClick={handleClick}
          icon={<StickyNote className="h-5 w-5" />}
          label="Notes"
          count={notesCount}
          showIndicator="right"
        />
      </div>
    </TooltipProvider>
  );
}
