'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { HiFilm } from "react-icons/hi2";
import { HiOutlineFilm } from "react-icons/hi";
import { AiFillVideoCamera, AiOutlineVideoCamera } from "react-icons/ai";
import { FaNoteSticky, FaRegNoteSticky } from "react-icons/fa6";
import { RiGroup2Fill, RiGroup2Line } from "react-icons/ri";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EditorPanelType } from './EditorPanelContext';
import { toolbarStyles } from './toolbar-styles';

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
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  count?: number;
  indicatorPosition: 'left' | 'right';
}

function ActivityBarButton({
  panel,
  activePanel,
  onClick,
  activeIcon,
  inactiveIcon,
  label,
  count = 0,
  indicatorPosition,
}: ActivityBarButtonProps) {
  const isActive = activePanel === panel;
  const { button, badge } = toolbarStyles;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(panel)}
          className={cn(
            button.base,
            button.size,
            button.rounded,
            isActive ? button.states.active : button.states.inactive
          )}
        >
          {isActive ? activeIcon : inactiveIcon}
          {count > 0 && (
            <span
              key={count}
              className={cn(badge.base, badge.size, badge.style, 'animate-[badge-pop_300ms_ease-out]')}
            >
              {count > 99 ? '99+' : count}
            </span>
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

  const { container } = toolbarStyles;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex flex-col items-center',
          container.padding.vertical,
          'w-12',
          container.base,
          container.rounded,
          'shrink-0',
          className
        )}
      >
        <ActivityBarButton
          panel="scenes"
          activePanel={activePanel}
          onClick={handleClick}
          activeIcon={<HiFilm className="h-5 w-5" />}
          inactiveIcon={<HiOutlineFilm className="h-5 w-5" />}
          label="Scenes"
          count={scenesCount}
          indicatorPosition={indicatorPosition}
        />

        <ActivityBarButton
          panel="characters"
          activePanel={activePanel}
          onClick={handleClick}
          activeIcon={<RiGroup2Fill className="h-5 w-5" />}
          inactiveIcon={<RiGroup2Line className="h-5 w-5" />}
          label="Characters"
          count={charactersCount}
          indicatorPosition={indicatorPosition}
        />

        <ActivityBarButton
          panel="shotlist"
          activePanel={activePanel}
          onClick={handleClick}
          activeIcon={<AiFillVideoCamera className="h-5 w-5" />}
          inactiveIcon={<AiOutlineVideoCamera className="h-5 w-5" />}
          label="Shotlist"
          count={shotlistCount}
          indicatorPosition={indicatorPosition}
        />

        <ActivityBarButton
          panel="notes"
          activePanel={activePanel}
          onClick={handleClick}
          activeIcon={<FaNoteSticky className="h-5 w-5" />}
          inactiveIcon={<FaRegNoteSticky className="h-5 w-5" />}
          label="Notes"
          count={notesCount}
          indicatorPosition={indicatorPosition}
        />
      </div>
    </TooltipProvider>
  );
}
