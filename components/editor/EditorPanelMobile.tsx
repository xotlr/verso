'use client';

import React from 'react';
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
      className={cn(
        'flex-1 flex flex-col items-center gap-1 py-3 px-2',
        'touch-manipulation min-h-[56px]',
        'transition-colors',
        isActive
          ? 'text-primary border-b-2 border-primary bg-primary/5'
          : 'text-muted-foreground border-b-2 border-transparent'
      )}
    >
      <div className="relative">
        {icon}
        {count > 0 && (
          <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
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
  screenplayId,
  scenesWithShots = [],
  onShotsChange,
  onEditShot,
  onAddShot,
}: EditorPanelMobileProps) {
  const { mobileOpen, setMobileOpen, activePanel, setActivePanel, isMobile } =
    useEditorPanel();

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

  const currentSceneId = scenes[0]?.id;

  // Default to scenes if no panel selected
  const currentPanel = activePanel || 'scenes';

  return (
    <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{getPanelTitle(currentPanel)}</DrawerTitle>
        </DrawerHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border shrink-0 bg-card">
          <TabButton
            panel="scenes"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<Film className="h-5 w-5" />}
            label="Scenes"
            count={scenes.length}
          />
          <TabButton
            panel="characters"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<Users className="h-5 w-5" />}
            label="Characters"
            count={characters.length}
          />
          <TabButton
            panel="shotlist"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<Clapperboard className="h-5 w-5" />}
            label="Shots"
            count={shotCount}
          />
          <TabButton
            panel="notes"
            activePanel={currentPanel}
            onClick={handlePanelChange}
            icon={<StickyNote className="h-5 w-5" />}
            label="Notes"
          />
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {currentPanel === 'scenes' && (
            <ScenesPanel
              scenes={scenes}
              view={view}
              className="h-full"
            />
          )}

          {currentPanel === 'characters' && (
            <CharactersPanel
              characters={characters}
              screenplayId={screenplayId}
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
              currentSceneId={currentSceneId}
              className="h-full"
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
