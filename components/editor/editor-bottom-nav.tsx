'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Film, Users, Clapperboard } from 'lucide-react';
import { CiStickyNote } from 'react-icons/ci';
import { cn } from '@/lib/utils';

type EditorPanelType = 'scenes' | 'characters' | 'shotlist' | 'notes';

interface TabButtonProps {
  panel: EditorPanelType;
  activePanel: EditorPanelType | null;
  onClick: (panel: EditorPanelType) => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({
  panel,
  activePanel,
  onClick,
  icon,
  label,
}: TabButtonProps) {
  const isActive = activePanel === panel;

  return (
    <button
      onClick={() => onClick(panel)}
      aria-label={label}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-1 py-2',
        'touch-manipulation min-h-[48px]',
        'transition-colors duration-200',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground'
      )}
    >
      <div className="relative">
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
      {isActive && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

export function EditorBottomNav() {
  const [activePanel, setActivePanel] = useState<EditorPanelType | null>(null);

  // Listen for panel state changes from EditorPanelMobile
  useEffect(() => {
    const handlePanelStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ panel: EditorPanelType | null; open: boolean }>;
      if (customEvent.detail.open) {
        setActivePanel(customEvent.detail.panel);
      } else {
        setActivePanel(null);
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="relative flex items-center h-14">
        <TabButton
          panel="scenes"
          activePanel={activePanel}
          onClick={handleTabClick}
          icon={<Film className="h-5 w-5" />}
          label="Scenes"
        />
        <TabButton
          panel="characters"
          activePanel={activePanel}
          onClick={handleTabClick}
          icon={<Users className="h-5 w-5" />}
          label="Characters"
        />
        <TabButton
          panel="shotlist"
          activePanel={activePanel}
          onClick={handleTabClick}
          icon={<Clapperboard className="h-5 w-5" />}
          label="Shots"
        />
        <TabButton
          panel="notes"
          activePanel={activePanel}
          onClick={handleTabClick}
          icon={<CiStickyNote className="h-5 w-5" />}
          label="Notes"
        />
      </div>
    </nav>
  );
}
