'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEditorPanel, EDITOR_PANEL_WIDTH } from './EditorPanelContext';
import { ActivityBar } from './ActivityBar';
import { ScenesPanel } from './panels/ScenesPanel';
import { CharactersPanel } from './panels/CharactersPanel';
import { ShotlistPanel } from './panels/ShotlistPanel';
import { NotesPanel } from './panels/NotesPanel';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import type { SceneWithShots, Shot } from '@/types/shotlist';

interface EditorPanelDesktopProps {
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  screenplayId?: string;
  scenesWithShots?: SceneWithShots[];
  onShotsChange?: (shots: Shot[]) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
}

// Panel animation variants - using y: '-50%' for vertical centering
const panelVariants = {
  hidden: {
    opacity: 0,
    x: 20,
    y: '-50%',
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: '-50%',
    scale: 1,
  },
};

export function EditorPanelDesktop({
  scenes,
  characters,
  view,
  screenplayId,
  scenesWithShots = [],
  onShotsChange,
  onEditShot,
  onAddShot,
}: EditorPanelDesktopProps) {
  const { open, activePanel, setActivePanel, position, isMobile } = useEditorPanel();

  // Hidden on mobile
  if (isMobile) return null;

  const isPanelOpen = open && activePanel !== null;

  // Calculate shot count for activity bar
  const shotCount = scenesWithShots.reduce(
    (acc, scene) => acc + scene.shots.length,
    0
  );

  // Get current scene ID for notes panel
  const currentSceneId = scenes[0]?.id;

  // Position classes based on left/right
  const isRight = position === 'right';

  return (
    <>
      {/* Activity Bar - Fixed position, never moves */}
      <div
        className={cn(
          'fixed top-1/2 -translate-y-1/2 z-30',
          isRight ? 'right-3' : 'left-3'
        )}
      >
        <ActivityBar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          scenesCount={scenes.length}
          charactersCount={characters.length}
          shotlistCount={shotCount}
          notesCount={0}
          position={position}
        />
      </div>

      {/* Expandable Panel - Slides in/out with Framer Motion */}
      <AnimatePresence mode="wait">
        {isPanelOpen && (
          <motion.div
            className={cn(
              'fixed top-1/2 z-20',
              isRight ? 'right-16' : 'left-16'
            )}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
          >
            <div
              className={cn(
                'overflow-hidden',
                'bg-card/95 backdrop-blur-md',
                'rounded-2xl border border-border/50',
                'shadow-lg shadow-black/10'
              )}
              style={{
                width: `${EDITOR_PANEL_WIDTH}px`,
                maxHeight: 'calc(100vh - 8rem)',
              }}
            >
              <div
                className="h-full overflow-y-auto"
                style={{ width: `${EDITOR_PANEL_WIDTH}px`, maxHeight: 'calc(100vh - 8rem)' }}
              >
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
