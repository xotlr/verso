'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useEditorPanel, type EditorPanelType } from './EditorPanelContext';
import { ScenesPanel } from './panels/ScenesPanel';
import { CharactersPanel } from './panels/CharactersPanel';
import { ShotlistPanel } from './panels/ShotlistPanel';
import { NotesPanel } from './panels/NotesPanel';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Film, Users, Clapperboard, StickyNote } from 'lucide-react';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import type { SceneWithShots, Shot } from '@/types/shotlist';

interface EditorPanelMobileProps {
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  screenplayId?: string;
  scenesWithShots?: SceneWithShots[];
  onShotsChange?: (shots: Shot[]) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
}

interface TabButtonProps {
  panel: EditorPanelType;
  activePanel: EditorPanelType | null;
  onClick: (panel: EditorPanelType) => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({
  panel,
  activePanel,
  onClick,
  icon,
  label,
  count = 0,
}: TabButtonProps) {
  const isActive = activePanel === panel;

  return (
    <button
      onClick={() => onClick(panel)}
      aria-label={label}
      className={cn(
        'flex-1 flex items-center justify-center py-3 px-2',
        'touch-manipulation min-h-[48px]',
        'transition-colors',
        isActive
          ? 'text-primary border-b-2 border-primary bg-primary/5'
          : 'text-muted-foreground border-b-2 border-transparent'
      )}
    >
      <div className="relative">
        {icon}
        {count > 0 && (
          <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
    </button>
  );
}

function getPanelTitle(panel: EditorPanelType | null): string {
  switch (panel) {
    case 'scenes':
      return 'Scenes';
    case 'characters':
      return 'Characters';
    case 'shotlist':
      return 'Shotlist';
    case 'notes':
      return 'Notes';
    default:
      return 'Panel';
  }
}

export function EditorPanelMobile({
  scenes,
  characters,
  view,
  currentSceneId,
  screenplayId,
  scenesWithShots = [],
  onShotsChange,
  onEditShot,
  onAddShot,
}: EditorPanelMobileProps) {
  const { mobileOpen, setMobileOpen, activePanel, setActivePanel, isMobile } =
    useEditorPanel();

  // Edge swipe detection state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const EDGE_THRESHOLD = 30; // px from right edge to start gesture
  const SWIPE_THRESHOLD = 60; // px to complete swipe
  const MAX_Y_DRIFT = 50; // max vertical movement allowed

  // Handle edge swipe gesture to open panel
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (mobileOpen) return; // Don't detect if already open

    const touch = e.touches[0];
    const distanceFromRightEdge = window.innerWidth - touch.clientX;

    // Only start tracking if touch begins near right edge
    if (distanceFromRightEdge <= EDGE_THRESHOLD) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  }, [mobileOpen]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || mobileOpen) return;

    const touch = e.touches[0];
    const deltaX = touchStartRef.current.x - touch.clientX;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Cancel if too much vertical movement (user is scrolling)
    if (deltaY > MAX_Y_DRIFT) {
      touchStartRef.current = null;
      return;
    }

    // If swiped left enough from the right edge, open the panel
    if (deltaX >= SWIPE_THRESHOLD) {
      setMobileOpen(true);
      touchStartRef.current = null;
    }
  }, [mobileOpen, setMobileOpen]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // Attach touch event listeners
  useEffect(() => {
    if (!isMobile) return;

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Only render on mobile
  if (!isMobile) return null;

  const handlePanelChange = (panel: EditorPanelType) => {
    // On mobile, don't toggle off - just switch
    setActivePanel(panel);
  };

  // Calculate shot count
  const shotCount = scenesWithShots.reduce(
    (acc, scene) => acc + scene.shots.length,
    0
  );

  // For notes panel, use prop or fallback to first scene
  const notesSceneId = currentSceneId ?? scenes[0]?.id;

  // Default to scenes if no panel selected
  const currentPanel = activePanel || 'scenes';

  return (
    <>
      {/* Subtle edge indicator for swipe gesture discoverability */}
      {!mobileOpen && (
        <div
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none md:hidden"
          aria-hidden="true"
        >
          <div className="w-1 h-16 bg-primary/20 rounded-l-full" />
        </div>
      )}

      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{getPanelTitle(currentPanel)}</DrawerTitle>
        </DrawerHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border shrink-0 bg-card">
          <TabButton
            panel="scenes"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<Film className="h-6 w-6" />}
            label="Scenes"
            count={scenes.length}
          />
          <TabButton
            panel="characters"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<Users className="h-6 w-6" />}
            label="Characters"
            count={characters.length}
          />
          <TabButton
            panel="shotlist"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<Clapperboard className="h-6 w-6" />}
            label="Shots"
            count={shotCount}
          />
          <TabButton
            panel="notes"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<StickyNote className="h-6 w-6" />}
            label="Notes"
          />
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {currentPanel === 'scenes' && (
            <ScenesPanel
              scenes={scenes}
              view={view}
              currentSceneId={currentSceneId}
              className="h-full"
            />
          )}

          {currentPanel === 'characters' && (
            <CharactersPanel
              characters={characters}
              screenplayId={screenplayId}
              view={view}
              className="h-full"
            />
          )}

          {currentPanel === 'shotlist' && screenplayId && (
            <ShotlistPanel
              screenplayId={screenplayId}
              scenesWithShots={scenesWithShots}
              onShotsChange={onShotsChange}
              onEditShot={onEditShot}
              onAddShot={onAddShot}
              className="h-full"
            />
          )}

          {currentPanel === 'notes' && screenplayId && (
            <NotesPanel
              screenplayId={screenplayId}
              currentSceneId={notesSceneId}
              className="h-full"
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
}
