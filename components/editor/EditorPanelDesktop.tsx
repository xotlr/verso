'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEditorPanel, EDITOR_PANEL_WIDTH } from './EditorPanelContext';
import { ActivityBar } from './ActivityBar';
import { useSettings } from '@/contexts/settings-context';
import { ScenesPanel } from './panels/ScenesPanel';
import { CharactersPanel } from './panels/CharactersPanel';
import { ShotlistPanel } from './panels/ShotlistPanel';
import { NotesPanel } from './panels/NotesPanel';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import type { SceneWithShots, Shot, DetectedShot } from '@/types/shotlist';

interface EditorPanelDesktopProps {
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

// Content crossfade variants
const contentVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function EditorPanelDesktop({
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
}: EditorPanelDesktopProps) {
  const { open, activePanel, setActivePanel, position, isMobile } = useEditorPanel();
  const { settings } = useSettings();
  const [isInFocusMode, setIsInFocusMode] = useState(false);

  // Check if using Maelle layout (activity bar is in the top toolbar)
  const isMaelleLayout = settings.layout.toolbarLayout === 'maelle';

  // Listen for focus mode toggle events
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setIsInFocusMode(prev => !prev);
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  // Hidden on mobile or in focus mode
  if (isMobile || isInFocusMode) return null;

  const isPanelOpen = open && activePanel !== null;

  // Calculate shot count for activity bar
  const shotCount = scenesWithShots.reduce(
    (acc, scene) => acc + scene.shots.length,
    0
  );

  // Fallback scene ID for notes panel (uses prop or first scene)
  const notesSceneId = currentSceneId ?? scenes[0]?.id;

  // Position classes based on left/right
  const isRight = position === 'right';

  return (
    <>
      {/* Activity Bar - Fixed position, hidden in Maelle layout (icons in top toolbar) */}
      {!isMaelleLayout && (
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
      )}

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
                'bg-background',
                'rounded-2xl border border-border/50',
                'shadow-lg'
              )}
              style={{
                width: `${EDITOR_PANEL_WIDTH}px`,
                maxHeight: 'calc(100vh - 8rem)',
              }}
            >
              <div
                className="h-full overflow-hidden"
                style={{ width: `${EDITOR_PANEL_WIDTH}px`, maxHeight: 'calc(100vh - 8rem)' }}
              >
                <AnimatePresence mode="wait">
                  {activePanel === 'scenes' && (
                    <motion.div
                      key="scenes"
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      <ScenesPanel
                        scenes={scenes}
                        view={view}
                        currentSceneId={currentSceneId}
                        className="h-full"
                      />
                    </motion.div>
                  )}

                  {activePanel === 'characters' && (
                    <motion.div
                      key="characters"
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      <CharactersPanel
                        characters={characters}
                        screenplayId={screenplayId}
                        view={view}
                        className="h-full"
                      />
                    </motion.div>
                  )}

                  {activePanel === 'shotlist' && screenplayId && (
                    <motion.div
                      key="shotlist"
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
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
                    </motion.div>
                  )}

                  {activePanel === 'notes' && screenplayId && (
                    <motion.div
                      key="notes"
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      className="h-full"
                    >
                      <NotesPanel
                        screenplayId={screenplayId}
                        currentSceneId={notesSceneId}
                        className="h-full"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
