'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ProseMirrorEditor } from '@/components/prosemirror/ProseMirrorEditor';
import { MobileSceneCharacterSheet } from '@/components/editor/MobileSceneCharacterSheet';
import { ReadOnlyScenesPanel } from './read-only-scenes-panel';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReadOnlyScreenplayViewerProps {
  content: string;
  className?: string;
  onScenesSheetOpenChange?: (open: boolean) => void;
  scenesSheetOpen?: boolean;
}

export function ReadOnlyScreenplayViewer({
  content,
  className,
  onScenesSheetOpenChange,
  scenesSheetOpen = false,
}: ReadOnlyScreenplayViewerProps) {
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [view, setView] = useState<EditorView | null>(null);
  const isMobile = useIsMobile();

  const handleScenesChange = useCallback((newScenes: SceneInfo[], newCharacters: CharacterInfo[]) => {
    setScenes(newScenes);
    setCharacters(newCharacters);
  }, []);

  const handleViewReady = useCallback((editorView: EditorView) => {
    setView(editorView);
  }, []);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Desktop: Scenes panel on left */}
      {!isMobile && (
        <div className="hidden md:flex w-64 shrink-0 border-r border-border bg-sidebar">
          <ReadOnlyScenesPanel
            scenes={scenes}
            view={view}
            currentSceneId={currentSceneId}
          />
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 min-w-0">
        <ProseMirrorEditor
          content={content}
          editable={false}
          showElementIndicator={false}
          showStats={false}
          scenes={scenes}
          characters={characters}
          onScenesChange={handleScenesChange}
          onCurrentSceneChange={setCurrentSceneId}
          onViewReady={handleViewReady}
        />
      </div>

      {/* Mobile: Scenes sheet */}
      {isMobile && (
        <MobileSceneCharacterSheet
          open={scenesSheetOpen}
          onOpenChange={onScenesSheetOpenChange || (() => {})}
          scenes={scenes}
          characters={characters}
          view={view}
          currentSceneId={currentSceneId}
        />
      )}
    </div>
  );
}
