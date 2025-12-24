'use client';

import React, { useEffect, useRef, useCallback } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import type { SceneWithShots, Shot, DetectedShot } from '@/types/shotlist';

interface EditorPanelMobileProps {
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  screenplayId?: string;
  scenesWithShots?: SceneWithShots[];
  detectedShots?: DetectedShot[];
  onShotsChange?: (shots: Shot[]) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
  onAddDetectedShot?: (shot: DetectedShot) => void;
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
    case 'settings':
      return 'Settings';
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
  detectedShots = [],
  onShotsChange,
  onEditShot,
  onAddShot,
  onAddDetectedShot,
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

  // Listen for panel open events from EditorBottomNav
  useEffect(() => {
    const handlePanelOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ panel: EditorPanelType; close?: boolean }>;
      const { panel, close } = customEvent.detail;

      if (close) {
        setMobileOpen(false);
      } else {
        setActivePanel(panel);
        setMobileOpen(true);
      }
    };

    window.addEventListener('editor-panel-open', handlePanelOpen);
    return () => window.removeEventListener('editor-panel-open', handlePanelOpen);
  }, [setActivePanel, setMobileOpen]);

  // Notify EditorBottomNav of panel state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('editor-panel-state-change', {
      detail: { panel: activePanel, open: mobileOpen }
    }));
  }, [activePanel, mobileOpen]);

  // Only render on mobile
  if (!isMobile) return null;

  // For notes panel, use prop or fallback to first scene
  const notesSceneId = currentSceneId ?? scenes[0]?.id;

  // Default to scenes if no panel selected
  const currentPanel = activePanel || 'scenes';

  return (
    <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
      <DrawerContent className="max-h-[70vh] flex flex-col !bottom-14">
        <DrawerHeader className="border-b border-border py-3 px-4">
          <DrawerTitle className="text-base font-semibold">
            {getPanelTitle(currentPanel)}
          </DrawerTitle>
        </DrawerHeader>

        {/* Panel Content */}
        <ScrollArea className="flex-1">
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
              detectedShots={detectedShots}
              currentSceneId={currentSceneId}
              onShotsChange={onShotsChange}
              onEditShot={onEditShot}
              onAddShot={onAddShot}
              onAddDetectedShot={onAddDetectedShot}
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

          {currentPanel === 'settings' && (
            <div className="p-4 text-muted-foreground">
              Settings panel coming soon
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
