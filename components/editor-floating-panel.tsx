'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Character, Location, Scene } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Users,
  MapPin,
  List,
  X,
  PanelRightClose,
  Palette,
} from 'lucide-react';

interface EditorFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  selectedScene?: Scene;
  onSceneClick?: (scene: Scene) => void;
  onOpenSceneWorkspace?: (scene: Scene) => void;
}

type PanelSection = 'scenes' | 'overview' | 'characters' | 'locations' | 'scene';

export function EditorFloatingPanel({
  isOpen,
  onClose,
  characters,
  locations,
  scenes,
  selectedScene,
  onSceneClick,
  onOpenSceneWorkspace,
}: EditorFloatingPanelProps) {
  const [activeSection, setActiveSection] = useState<PanelSection>('scenes');

  const totalDialogueLines = scenes.reduce((acc, scene) =>
    acc + scene.elements.filter(e => e.type === 'dialogue').length, 0
  );

  const characterStats = characters.map(char => {
    const appearances = scenes.filter(scene =>
      scene.characters.includes(char.id)
    ).length;

    const dialogueLines = scenes.reduce((acc, scene) =>
      acc + scene.elements.filter(e =>
        e.type === 'dialogue' && e.characterId === char.id
      ).length, 0
    );

    return {
      ...char,
      appearances,
      dialogueLines,
      dialoguePercentage: totalDialogueLines > 0
        ? Math.round((dialogueLines / totalDialogueLines) * 100)
        : 0
    };
  }).sort((a, b) => b.dialogueLines - a.dialogueLines);

  const locationStats = locations.map(loc => {
    const sceneCount = scenes.filter(scene =>
      scene.location.id === loc.id
    ).length;

    return {
      ...loc,
      sceneCount,
      percentage: scenes.length > 0 ? Math.round((sceneCount / scenes.length) * 100) : 0
    };
  }).sort((a, b) => b.sceneCount - a.sceneCount);

  const sections = [
    { id: 'scenes' as const, icon: List, label: 'Scenes' },
    { id: 'overview' as const, icon: LayoutGrid, label: 'Stats' },
    { id: 'characters' as const, icon: Users, label: 'Characters' },
    { id: 'locations' as const, icon: MapPin, label: 'Locations' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Floating Panel */}
      <div
        className={cn(
          "fixed right-4 top-20 bottom-4 w-80 z-50",
          "bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transform transition-all duration-300 ease-out",
          isOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-[120%] opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Script Info</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 bg-muted/30">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 text-xs gap-1.5",
                activeSection === section.id && "bg-background shadow-sm"
              )}
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{section.label}</span>
            </Button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {activeSection === 'scenes' && (
              <div className="space-y-2">
                {scenes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No scenes yet. Start writing!
                  </p>
                ) : (
                  scenes.map((scene) => {
                    const isSelected = selectedScene?.id === scene.id;
                    return (
                      <div
                        key={scene.id}
                        className={cn(
                          "group w-full text-left p-3 rounded-lg transition-all",
                          "hover:bg-accent/50 border border-transparent",
                          isSelected && "bg-accent border-primary/20"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onSceneClick?.(scene)}
                            className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded hover:bg-muted-foreground/20"
                          >
                            {scene.number}
                          </button>
                          <button
                            onClick={() => onSceneClick?.(scene)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-medium truncate">
                              {scene.heading}
                            </p>
                            {scene.synopsis && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {scene.synopsis}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {scene.characters.slice(0, 3).map((charId) => {
                                const char = characters.find(c => c.id === charId);
                                return char ? (
                                  <Badge
                                    key={charId}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-5"
                                  >
                                    {char.name}
                                  </Badge>
                                ) : null;
                              })}
                              {scene.characters.length > 3 && (
                                <span className="text-[10px] text-muted-foreground self-center">
                                  +{scene.characters.length - 3}
                                </span>
                              )}
                            </div>
                          </button>
                          {onOpenSceneWorkspace && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSceneWorkspace(scene);
                              }}
                              title="Open scene workspace"
                            >
                              <Palette className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeSection === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{scenes.length}</p>
                    <p className="text-xs text-muted-foreground">Scenes</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{characters.length}</p>
                    <p className="text-xs text-muted-foreground">Characters</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{locations.length}</p>
                    <p className="text-xs text-muted-foreground">Locations</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{totalDialogueLines}</p>
                    <p className="text-xs text-muted-foreground">Lines</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'characters' && (
              <div className="space-y-3">
                {characterStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No characters yet
                  </p>
                ) : (
                  characterStats.map((char) => (
                    <div key={char.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{char.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {char.dialoguePercentage}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{char.appearances} scenes</span>
                        <span>{char.dialogueLines} lines</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${char.dialoguePercentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === 'locations' && (
              <div className="space-y-3">
                {locationStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No locations yet
                  </p>
                ) : (
                  locationStats.map((loc) => (
                    <div key={loc.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary/60" />
                          <span className="font-medium text-sm">{loc.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {loc.type}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pl-4">
                        <span>{loc.sceneCount} scenes</span>
                        <span>{loc.percentage}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{scenes.length} scenes</span>
            <span>{characters.length} characters</span>
            <span>{locations.length} locations</span>
          </div>
        </div>
      </div>
    </>
  );
}
