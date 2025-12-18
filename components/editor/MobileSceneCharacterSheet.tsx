'use client';

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Film, Users, MessageSquare } from 'lucide-react';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';

interface MobileSceneCharacterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
}

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface SceneListItemProps {
  scene: SceneInfo;
  index: number;
  isActive: boolean;
  onNavigate: (scene: SceneInfo) => void;
  formatHeading: (scene: SceneInfo) => string;
}

function SceneListItem({
  scene,
  index,
  isActive,
  onNavigate,
  formatHeading,
}: SceneListItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active scene
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  return (
    <button
      ref={itemRef}
      onClick={() => onNavigate(scene)}
      className={cn(
        'w-full flex items-center gap-3 min-h-[44px]',
        'px-3 py-2 rounded-lg',
        'text-left text-sm',
        'transition-all',
        'touch-manipulation',
        isActive
          ? 'bg-primary/10 border-l-2 border-primary'
          : 'hover:bg-accent active:scale-[0.98]'
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary'
        )}
      >
        {index + 1}
      </span>
      <span className="flex-1 truncate">{formatHeading(scene)}</span>
      {scene.timeOfDay && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {scene.timeOfDay}
        </span>
      )}
    </button>
  );
}

/**
 * Mobile-friendly sheet for accessing scenes and characters.
 * Opens from the left side as a slide-in panel.
 */
export function MobileSceneCharacterSheet({
  open,
  onOpenChange,
  scenes,
  characters,
  view,
  currentSceneId,
}: MobileSceneCharacterSheetProps) {
  // Group scenes into acts (every 10 scenes)
  const acts = useMemo(() => {
    if (scenes.length === 0) return [];

    const actsData: Act[] = [];
    let currentAct: Act | null = null;
    let actIndex = 0;

    scenes.forEach((scene, idx) => {
      if (idx === 0 || idx % 10 === 0) {
        actIndex++;
        currentAct = {
          id: `act-${actIndex}`,
          name: `Act ${actIndex}`,
          scenes: [],
        };
        actsData.push(currentAct);
      }
      if (currentAct) {
        currentAct.scenes.push(scene);
      }
    });

    return actsData;
  }, [scenes]);

  // Sort characters by dialogue count
  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => b.dialogueCount - a.dialogueCount);
  }, [characters]);

  const navigateToScene = useCallback((scene: SceneInfo) => {
    if (!view) return;

    let found = false;
    let targetPos = 0;

    view.state.doc.forEach((node, offset) => {
      if (!found && node.type.name === 'scene_heading') {
        if (offset === scene.position) {
          targetPos = offset + 1;
          found = true;
        }
      }
    });

    if (found) {
      const tr = view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(targetPos))
      );
      view.dispatch(tr.scrollIntoView());
      view.focus();
    }

    // Close the sheet after navigation
    onOpenChange(false);
  }, [view, onOpenChange]);

  const formatSceneHeading = (scene: SceneInfo) => {
    const type = scene.type || 'INT';
    const location = scene.location || 'UNKNOWN';
    return `${type}. ${location}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-base">Story Elements</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="scenes" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger
              value="scenes"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              <Film className="h-4 w-4 mr-2" />
              Scenes
              <span className="ml-2 text-xs text-muted-foreground">
                {scenes.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="characters"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              <Users className="h-4 w-4 mr-2" />
              Characters
              <span className="ml-2 text-xs text-muted-foreground">
                {characters.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scenes" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                {acts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <Film className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No scenes yet</p>
                    <p className="text-xs mt-1">
                      Start writing to see your story structure.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {scenes.map((scene, idx) => {
                      const isActive = scene.id === currentSceneId;
                      return (
                        <SceneListItem
                          key={scene.id}
                          scene={scene}
                          index={idx}
                          isActive={isActive}
                          onNavigate={navigateToScene}
                          formatHeading={formatSceneHeading}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="characters" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                {sortedCharacters.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No characters yet</p>
                    <p className="text-xs mt-1">
                      Add character elements to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sortedCharacters.map((character) => (
                      <div
                        key={character.id}
                        className={cn(
                          'flex items-center gap-3 min-h-[44px]',
                          'px-3 py-2 rounded-lg',
                          'text-sm bg-accent/30'
                        )}
                      >
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium flex items-center justify-center">
                          {character.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 font-medium truncate">
                          {character.name}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <MessageSquare className="h-3 w-3" />
                          {character.dialogueCount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
