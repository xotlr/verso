'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useEditorPanel } from './EditorPanelContext';
import { ScenesPanel } from './panels/ScenesPanel';
import { CharactersPanel } from './panels/CharactersPanel';
import { ShotlistPanel } from './panels/ShotlistPanel';
import { NotesPanel } from './panels/NotesPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
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
  const { mobileOpen, setMobileOpen, activePanel, setActivePanel, isMobile, setCounts } =
    useEditorPanel();

  // Update counts in context when data changes
  useEffect(() => {
    setCounts({
      scenes: scenes.length,
      characters: characters.length,
      shots: detectedShots.length,
    });
  }, [scenes.length, characters.length, detectedShots.length, setCounts]);

  // Edge swipe detection state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const EDGE_THRESHOLD = 30;
  const SWIPE_THRESHOLD = 60;
  const MAX_Y_DRIFT = 50;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (mobileOpen) return;
    const touch = e.touches[0];
    const distanceFromRightEdge = window.innerWidth - touch.clientX;
    if (distanceFromRightEdge <= EDGE_THRESHOLD) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, [mobileOpen]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || mobileOpen) return;
    const touch = e.touches[0];
    const deltaX = touchStartRef.current.x - touch.clientX;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaY > MAX_Y_DRIFT) {
      touchStartRef.current = null;
      return;
    }
    if (deltaX >= SWIPE_THRESHOLD) {
      setMobileOpen(true);
      touchStartRef.current = null;
    }
  }, [mobileOpen, setMobileOpen]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

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

  // Handle drawer close (user drags down)
  const handleOpenChange = useCallback((open: boolean) => {
    setMobileOpen(open);
    if (!open) {
      setActivePanel(null);
    }
  }, [setMobileOpen, setActivePanel]);

  if (!isMobile) return null;

  const notesSceneId = currentSceneId ?? scenes[0]?.id;

  return (
    <Drawer open={mobileOpen} onOpenChange={handleOpenChange} modal={false}>
      <DrawerContent className="max-h-[70vh] flex flex-col overflow-hidden pb-16">
        <VisuallyHidden.Root>
          <DrawerTitle>Editor Panel</DrawerTitle>
        </VisuallyHidden.Root>
        <div className="flex-1 min-h-0 pt-2">
          {activePanel === 'scenes' && (
            <ScenesPanel
              scenes={scenes}
              view={view}
              currentSceneId={currentSceneId}
              className="h-full"
            />
          )}

          {activePanel === 'characters' && (
            <CharactersPanel
              characters={characters}
              screenplayId={screenplayId}
              view={view}
              className="h-full"
            />
          )}

          {activePanel === 'shotlist' && screenplayId && (
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

          {activePanel === 'notes' && screenplayId && (
            <NotesPanel
              screenplayId={screenplayId}
              currentSceneId={notesSceneId}
              className="h-full"
            />
          )}

          {activePanel === 'settings' && (
            <SettingsPanel className="h-full" />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
