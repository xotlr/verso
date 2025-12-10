'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import type { SceneWithShots, Shot } from '@/types/shotlist';
import { ActivityBar, type ActivityBarPanel } from './ActivityBar';
import { ScenesPanel } from './panels/ScenesPanel';
import { CharactersPanel } from './panels/CharactersPanel';
import { ShotlistPanel } from './panels/ShotlistPanel';
import { NotesPanel } from './panels/NotesPanel';

interface EditorSecondaryPanelProps {
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  screenplayId?: string;
  scenesWithShots?: SceneWithShots[];
  onShotsChange?: (shots: Shot[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
  className?: string;
}

/**
 * Secondary panel with activity bar for editor tools.
 * Activity bar (icons) + expandable panel with scenes, characters, shotlist, notes.
 */
export function EditorSecondaryPanel({
  scenes,
  characters,
  view,
  screenplayId,
  scenesWithShots = [],
  onShotsChange,
  onSceneClick,
  onEditShot,
  onAddShot,
  className,
}: EditorSecondaryPanelProps) {
  const [activePanel, setActivePanel] = useState<ActivityBarPanel>('scenes');

  const isPanelOpen = activePanel !== null;

  // Calculate shot count for activity bar
  const shotCount = scenesWithShots.reduce(
    (acc, scene) => acc + scene.shots.length,
    0
  );

  // Get current scene ID for notes panel
  const currentSceneId = scenes[0]?.id;

  return (
    <>
      {/* Fixed sidebar container - positioned on right */}
      <div
        className={cn(
          'hidden md:flex fixed top-16 bottom-0 z-20',
          'right-0',
          className
        )}
      >
        {/* Expandable Panel - on left side of activity bar */}
        <div
          className={cn(
            'h-full',
            'bg-card border-l border-border overflow-hidden',
            'transition-all duration-200 ease-out',
            'shadow-sm',
            isPanelOpen ? 'w-64' : 'w-0'
          )}
        >
          {isPanelOpen && (
            <div className="w-64 h-full overflow-hidden">
              {activePanel === 'scenes' && (
                <ScenesPanel
                  scenes={scenes}
                  view={view}
                  className="h-full"
                />
              )}

              {activePanel === 'characters' && (
                <CharactersPanel
                  characters={characters}
                  screenplayId={screenplayId}
                  className="h-full"
                />
              )}

              {activePanel === 'shotlist' && screenplayId && (
                <ShotlistPanel
                  screenplayId={screenplayId}
                  scenesWithShots={scenesWithShots}
                  onShotsChange={onShotsChange}
                  onSceneClick={onSceneClick}
                  onEditShot={onEditShot}
                  onAddShot={onAddShot}
                  className="h-full"
                />
              )}

              {activePanel === 'notes' && screenplayId && (
                <NotesPanel
                  screenplayId={screenplayId}
                  currentSceneId={currentSceneId}
                  className="h-full"
                />
              )}
            </div>
          )}
        </div>

        {/* Activity Bar - on right edge */}
        <div className="h-full">
          <ActivityBar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            scenesCount={scenes.length}
            charactersCount={characters.length}
            shotlistCount={shotCount}
            notesCount={0}
          />
        </div>
      </div>
    </>
  );
}
