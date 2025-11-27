'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scene, Character } from '@/types/screenplay';
import { getSceneConnections } from '@/lib/screenplay-utils';
import { cn } from '@/lib/utils';

interface SceneFlowProps {
  scenes: Scene[];
  characters: Character[];
  onSceneClick?: (scene: Scene) => void;
  selectedSceneId?: string;
}

export function SceneFlow({ 
  scenes, 
  characters,
  onSceneClick,
  selectedSceneId
}: SceneFlowProps) {
  const connections = getSceneConnections({ 
    scenes, 
    characters, 
    locations: []
  } as any);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Scene Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-8">
          {scenes.map((scene, index) => {
            const nextConnection = connections.find(c => c.from === scene.number);
            const isSelected = selectedSceneId === scene.id;
            
            return (
              <div key={scene.id} className="relative">
                <div
                  className={cn(
                    "cursor-pointer transition-opacity",
                    selectedSceneId && !isSelected && "opacity-60"
                  )}
                  onClick={() => onSceneClick?.(scene)}
                >
                  <div 
                    className="p-4 rounded-lg border-2"
                    style={{ 
                      borderColor: scene.location.color,
                      backgroundColor: `${scene.location.color}20`
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">
                          Scene {scene.number}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {scene.location.name} - {scene.timeOfDay}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary"
                        style={{ backgroundColor: scene.location.color }}
                      >
                        {scene.location.type}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      {scene.characters.map(charId => {
                        const character = characters.find(c => c.id === charId);
                        return character ? (
                          <div
                            key={charId}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: character.color }}
                            title={character.name}
                          >
                            {character.name.charAt(0)}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>

                {nextConnection && index < scenes.length - 1 && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 mb-2">
                    <svg width="2" height="40" className="mx-auto">
                      <line 
                        x1="1" 
                        y1="0" 
                        x2="1" 
                        y2="40" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="text-muted-foreground"
                      />
                    </svg>
                    <div className="flex justify-center -mt-6">
                      <div className="bg-background px-2">
                        <div className="flex gap-1">
                          {nextConnection.characters.map(charId => {
                            const character = characters.find(c => c.id === charId);
                            return character ? (
                              <div
                                key={charId}
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: character.color }}
                                title={`${character.name} continues`}
                              />
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Flow Legend</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary" />
              <span>Character continues to next scene</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                A
              </div>
              <span>Character initial (hover for full name)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}