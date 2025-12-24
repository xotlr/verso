'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HiFilm } from "react-icons/hi2";
import { HiOutlineFilm } from "react-icons/hi";
import { RiGroup2Fill, RiGroup2Line } from "react-icons/ri";
import { AiFillVideoCamera, AiOutlineVideoCamera } from "react-icons/ai";
import { FaNoteSticky, FaRegNoteSticky } from "react-icons/fa6";
import { IoSettings, IoSettingsOutline } from "react-icons/io5";
import { cn } from '@/lib/utils';
import type { EditorPanelType } from './EditorPanelContext';

interface TabButtonProps {
  panel: EditorPanelType;
  activePanel: EditorPanelType | null;
  onClick: (panel: EditorPanelType) => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
}

function TabButton({
  panel,
  activePanel,
  onClick,
  activeIcon,
  inactiveIcon,
  label,
}: TabButtonProps) {
  const isActive = activePanel === panel;

  return (
    <button
      onClick={() => onClick(panel)}
      aria-label={label}
      className={cn(
        'flex-1 flex items-center justify-center py-3',
        'touch-manipulation min-h-[56px]',
        'transition-colors duration-150',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground'
      )}
    >
      {isActive ? activeIcon : inactiveIcon}
    </button>
  );
}

export function EditorBottomNav() {
  const [activePanel, setActivePanel] = useState<EditorPanelType | null>(null);

  // Listen for drawer close (when user drags it down)
  // Only clear active state when drawer explicitly closes, not on mount
  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    const handlePanelStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ panel: EditorPanelType | null; open: boolean }>;
      const { open } = customEvent.detail;

      if (open) {
        wasOpenRef.current = true;
      } else if (wasOpenRef.current) {
        // Only clear if drawer was previously open (user closed it)
        setActivePanel(null);
        wasOpenRef.current = false;
      }
    };

    window.addEventListener('editor-panel-state-change', handlePanelStateChange);
    return () => window.removeEventListener('editor-panel-state-change', handlePanelStateChange);
  }, []);

  const handleTabClick = useCallback((panel: EditorPanelType) => {
    // If clicking the same panel that's active, close it
    const shouldClose = activePanel === panel;

    // Dispatch event to open/close the panel drawer
    window.dispatchEvent(new CustomEvent('editor-panel-open', {
      detail: { panel, close: shouldClose }
    }));

    // Update local state
    setActivePanel(shouldClose ? null : panel);
  }, [activePanel]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="relative flex items-center h-14">
        <TabButton
          panel="scenes"
          activePanel={activePanel}
          onClick={handleTabClick}
          activeIcon={<HiFilm className="h-6 w-6" />}
          inactiveIcon={<HiOutlineFilm className="h-6 w-6" />}
          label="Scenes"
        />
        <TabButton
          panel="characters"
          activePanel={activePanel}
          onClick={handleTabClick}
          activeIcon={<RiGroup2Fill className="h-6 w-6" />}
          inactiveIcon={<RiGroup2Line className="h-6 w-6" />}
          label="Characters"
        />
        <TabButton
          panel="shotlist"
          activePanel={activePanel}
          onClick={handleTabClick}
          activeIcon={<AiFillVideoCamera className="h-6 w-6" />}
          inactiveIcon={<AiOutlineVideoCamera className="h-6 w-6" />}
          label="Shots"
        />
        <TabButton
          panel="notes"
          activePanel={activePanel}
          onClick={handleTabClick}
          activeIcon={<FaNoteSticky className="h-6 w-6" />}
          inactiveIcon={<FaRegNoteSticky className="h-6 w-6" />}
          label="Notes"
        />
        <TabButton
          panel="settings"
          activePanel={activePanel}
          onClick={handleTabClick}
          activeIcon={<IoSettings className="h-6 w-6" />}
          inactiveIcon={<IoSettingsOutline className="h-6 w-6" />}
          label="Settings"
        />
      </div>
    </nav>
  );
}
