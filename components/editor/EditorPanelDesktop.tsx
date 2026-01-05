'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftClose, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEditorPanel, EDITOR_PANEL_WIDTH } from './EditorPanelContext';
import { ScenesPanel } from './panels/ScenesPanel';
import { CharactersPanel } from './panels/CharactersPanel';
import { ShotlistPanel } from './panels/ShotlistPanel';
import { NotesPanel } from './panels/NotesPanel';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  onAddScene?: () => void;
  onAddCharacter?: () => void;
}

// Content crossfade variants
const contentVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
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
  onAddScene,
  onAddCharacter,
}: EditorPanelDesktopProps) {
  const { open, activePanel, setActivePanel, isMobile } = useEditorPanel();
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [panelWidth, setPanelWidth] = useState(EDITOR_PANEL_WIDTH);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Listen for focus mode toggle events
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setIsInFocusMode(prev => !prev);
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        if (activePanel) {
          setActivePanel(null);
        } else {
          setActivePanel('scenes');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel, setActivePanel]);

  // Handle resize drag (panel is on left, so drag right edge)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(240, Math.min(500, startWidthRef.current + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Hidden on mobile or in focus mode
  if (isMobile || isInFocusMode) return null;

  const isPanelOpen = open && activePanel !== null;

  // Fallback scene ID for notes panel (uses prop or first scene)
  const notesSceneId = currentSceneId ?? scenes[0]?.id;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'relative h-full shrink-0 overflow-hidden',
          'transition-[width] duration-[250ms] ease-out'
        )}
        style={{ width: isPanelOpen ? panelWidth : 0 }}
      >
        <div
          style={{ width: panelWidth }}
          className={cn(
            'absolute inset-y-0 left-0 flex flex-col h-full',
            'bg-background',
            'transition-transform duration-[250ms] ease-out',
            isPanelOpen ? 'translate-x-0' : '-translate-x-full',
            isResizing && 'select-none'
          )}
        >
        {/* Resize Handle (right edge) */}
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            'absolute top-0 bottom-0 right-0 w-1 cursor-col-resize z-20',
            'hover:bg-primary/20 active:bg-primary/30',
            'transition-colors duration-150'
          )}
        />

        {/* Panel Header - minimal with actions */}
        <div className="flex items-center justify-between px-2 py-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {/* Close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setActivePanel(null)}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Close <kbd className="ml-1 opacity-60">⌘B</kbd></p>
              </TooltipContent>
            </Tooltip>

            {/* Panel title with count */}
            <span className="text-sm font-medium text-foreground/70 capitalize">
              {activePanel}
              {activePanel === 'scenes' && scenes.length > 0 && (
                <span className="ml-1 text-muted-foreground">({scenes.length})</span>
              )}
              {activePanel === 'characters' && characters.length > 0 && (
                <span className="ml-1 text-muted-foreground">({characters.length})</span>
              )}
              {activePanel === 'shotlist' && scenesWithShots.length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  ({scenesWithShots.reduce((acc, s) => acc + s.shots.length, 0)})
                </span>
              )}
            </span>
          </div>

          {/* Actions: View link and Add button */}
          <div className="flex items-center gap-1">
            {/* View full page link */}
            {activePanel === 'scenes' && screenplayId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/cards/${screenplayId}`}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Cards</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Open index cards</p>
                </TooltipContent>
              </Tooltip>
            )}
            {activePanel === 'shotlist' && screenplayId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/shotlist/${screenplayId}`}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Full page</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Open shotlist in full page</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Add button */}
            {activePanel === 'scenes' && onAddScene && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={onAddScene}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Add scene</p>
                </TooltipContent>
              </Tooltip>
            )}
            {activePanel === 'characters' && onAddCharacter && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={onAddCharacter}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Add character</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Panel Content with Crossfade */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
                  screenplayId={screenplayId}
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
      </div>
    </TooltipProvider>
  );
}
