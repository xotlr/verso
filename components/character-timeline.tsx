'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Character, Scene } from '@/types/screenplay';
import { cn } from '@/lib/utils';

interface CharacterTimelineProps {
  characters: Character[];
  scenes: Scene[];
  onSceneClick?: (scene: Scene) => void;
  selectedSceneId?: string;
}

export function CharacterTimeline({ 
  characters, 
  scenes,
  onSceneClick,
  selectedSceneId
}: CharacterTimelineProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Character Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-6">
            <div className="relative">
              <div className="grid grid-cols-[200px_1fr] gap-4">
                <div className="sticky left-0 bg-background z-10">
                  <div className="h-8 mb-2" />
                  {characters.map((character) => (
                    <div
                      key={character.id}
                      className="h-12 flex items-center font-medium text-sm"
                      style={{ color: character.color }}
                    >
                      {character.name}
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <div className="flex gap-2 min-w-max">
                    {scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={cn(
                          "flex flex-col gap-2 cursor-pointer",
                          selectedSceneId === scene.id && "opacity-100",
                          selectedSceneId && selectedSceneId !== scene.id && "opacity-50"
                        )}
                        onClick={() => onSceneClick?.(scene)}
                      >
                        <div className="w-20 text-center">
                          <div className="text-xs font-medium mb-1">
                            Scene {scene.number}
                          </div>
                          <div 
                            className="text-xs px-2 py-1 rounded"
                            style={{ backgroundColor: scene.location.color }}
                          >
                            {scene.location.name.substring(0, 8)}...
                          </div>
                        </div>

                        {characters.map((character) => (
                          <div
                            key={character.id}
                            className="h-12 w-20 flex items-center justify-center"
                          >
                            {scene.characters.includes(character.id) && (
                              <div
                                className="w-16 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                                style={{ backgroundColor: character.color }}
                              >
                                {scene.elements.filter(
                                  e => e.type === 'dialogue' && e.characterId === character.id
                                ).length || '✓'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute left-[200px] top-0 bottom-0 w-px bg-border" />
            </div>

            <div className="mt-8 space-y-2">
              <h4 className="text-sm font-medium mb-3">Legend</h4>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-12 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground">
                  5
                </div>
                <span>Number of dialogue lines in scene</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-12 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground">
                  ✓
                </div>
                <span>Character appears in scene (no dialogue)</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}