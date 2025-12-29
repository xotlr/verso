'use client';

import React, { useCallback } from 'react';
import { HiFilm } from "react-icons/hi2";
import { HiOutlineFilm } from "react-icons/hi";
import { RiGroup2Fill, RiGroup2Line } from "react-icons/ri";
import { AiFillVideoCamera, AiOutlineVideoCamera } from "react-icons/ai";
import { FaNoteSticky, FaRegNoteSticky } from "react-icons/fa6";
import { IoSettings, IoSettingsOutline } from "react-icons/io5";
import { cn } from '@/lib/utils';
import { useEditorPanel, type EditorPanelType } from './EditorPanelContext';
import { toolbarStyles } from './toolbar-styles';

interface TabButtonProps {
  panel: EditorPanelType;
  activePanel: EditorPanelType | null;
  onClick: (panel: EditorPanelType) => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({
  panel,
  activePanel,
  onClick,
  activeIcon,
  inactiveIcon,
  label,
  count = 0,
}: TabButtonProps) {
  const isActive = activePanel === panel;
  const { badge } = toolbarStyles;

  return (
    <button
      onClick={() => onClick(panel)}
      aria-label={label}
      className={cn(
        'relative flex-1 flex items-center justify-center py-3',
        'touch-manipulation min-h-[56px]',
        'transition-colors duration-150',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground'
      )}
    >
      <span className="relative">
        {isActive ? activeIcon : inactiveIcon}
        {count > 0 && (
          <span className={cn(badge.base, badge.size, badge.style, 'animate-[badge-pop_300ms_ease-out]')}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
    </button>
  );
}

export function EditorBottomNav() {
  const { activePanel, setActivePanel, mobileOpen, setMobileOpen, counts } = useEditorPanel();

  const handleTabClick = useCallback((panel: EditorPanelType) => {
    if (mobileOpen && activePanel === panel) {
      // Close if clicking same panel
      setMobileOpen(false);
      setActivePanel(null);
    } else {
      // Open the panel
      setActivePanel(panel);
      setMobileOpen(true);
    }
  }, [activePanel, mobileOpen, setActivePanel, setMobileOpen]);

  // Derive active state from mobileOpen + activePanel
  const visiblePanel = mobileOpen ? activePanel : null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-sidebar/95 backdrop-blur-lg border-t border-border safe-area-bottom pointer-events-auto">
      <div className="relative flex items-center h-14">
        <TabButton
          panel="scenes"
          activePanel={visiblePanel}
          onClick={handleTabClick}
          activeIcon={<HiFilm className="h-6 w-6" />}
          inactiveIcon={<HiOutlineFilm className="h-6 w-6" />}
          label="Scenes"
          count={counts.scenes}
        />
        <TabButton
          panel="characters"
          activePanel={visiblePanel}
          onClick={handleTabClick}
          activeIcon={<RiGroup2Fill className="h-6 w-6" />}
          inactiveIcon={<RiGroup2Line className="h-6 w-6" />}
          label="Characters"
          count={counts.characters}
        />
        <TabButton
          panel="shotlist"
          activePanel={visiblePanel}
          onClick={handleTabClick}
          activeIcon={<AiFillVideoCamera className="h-6 w-6" />}
          inactiveIcon={<AiOutlineVideoCamera className="h-6 w-6" />}
          label="Shots"
          count={counts.shots}
        />
        <TabButton
          panel="notes"
          activePanel={visiblePanel}
          onClick={handleTabClick}
          activeIcon={<FaNoteSticky className="h-6 w-6" />}
          inactiveIcon={<FaRegNoteSticky className="h-6 w-6" />}
          label="Notes"
          count={counts.notes}
        />
        <TabButton
          panel="settings"
          activePanel={visiblePanel}
          onClick={handleTabClick}
          activeIcon={<IoSettings className="h-6 w-6" />}
          inactiveIcon={<IoSettingsOutline className="h-6 w-6" />}
          label="Settings"
        />
      </div>
    </nav>
  );
}
