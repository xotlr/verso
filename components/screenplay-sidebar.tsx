'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Character, Location, Scene } from '@/types/screenplay';
import {
  LayoutGrid,
  Users,
  MapPin,
  Film,
  List,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar';

interface ScreenplaySidebarProps {
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  selectedScene?: Scene;
  onSceneClick?: (scene: Scene) => void;
}

type SidebarSection = 'scenes' | 'overview' | 'characters' | 'locations' | 'scene';

export function ScreenplaySidebar({
  characters,
  locations,
  scenes,
  selectedScene,
  onSceneClick,
}: ScreenplaySidebarProps) {
  const [activeSection, setActiveSection] = useState<SidebarSection>('scenes');

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

  const sidebarSections = [
    { id: 'scenes' as const, icon: List, label: 'Scenes' },
    { id: 'overview' as const, icon: LayoutGrid, label: 'Overview' },
    { id: 'characters' as const, icon: Users, label: 'Characters' },
    { id: 'locations' as const, icon: MapPin, label: 'Locations' },
    { id: 'scene' as const, icon: Film, label: 'Current Scene' },
  ];

  return (
    <Sidebar
      side="right"
      variant="sidebar"
      collapsible="icon"
      className="border-l border-sidebar-border"
    >
      <SidebarHeader className="border-b border-sidebar-border flex-shrink-0">
        <SidebarMenu>
          {sidebarSections.map((section) => (
            <SidebarMenuItem key={section.id}>
              <SidebarMenuButton
                onClick={() => setActiveSection(section.id)}
                isActive={activeSection === section.id}
                tooltip={section.label}
              >
                <section.icon className="h-4 w-4" />
                <span>{section.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup className="h-full">
          <SidebarGroupContent className="h-full">
            {activeSection === 'scenes' && (
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {scenes.length === 0 ? (
                    <p className="text-sm text-sidebar-foreground/70 text-center py-4">
                      No scenes yet
                    </p>
                  ) : (
                    scenes.map((scene) => {
                      const isSelected = selectedScene?.id === scene.id;
                      return (
                        <button
                          key={scene.id}
                          onClick={() => onSceneClick?.(scene)}
                          className={`w-full text-left p-2 rounded-md transition-colors hover:bg-sidebar-accent ${
                            isSelected ? 'bg-sidebar-accent border-l-2 border-sidebar-primary' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-sidebar-foreground/60 w-6">
                              {scene.number}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-sidebar-foreground truncate">
                                {scene.heading}
                              </p>
                              {scene.synopsis && (
                                <p className="text-xs text-sidebar-foreground/60 truncate mt-0.5">
                                  {scene.synopsis}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5 ml-8">
                            {scene.characters.slice(0, 3).map((charId) => {
                              const char = characters.find(c => c.id === charId);
                              return char ? (
                                <Badge
                                  key={charId}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 rounded"
                                >
                                  {char.name}
                                </Badge>
                              ) : null;
                            })}
                            {scene.characters.length > 3 && (
                              <span className="text-[10px] text-sidebar-foreground/50">
                                +{scene.characters.length - 3}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}

            {activeSection === 'overview' && (
              <div className="space-y-3 p-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-sidebar-foreground/70">Total Scenes</span>
                    <span className="font-semibold text-sidebar-foreground">{scenes.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-sidebar-foreground/70">Characters</span>
                    <span className="font-semibold text-sidebar-foreground">{characters.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-sidebar-foreground/70">Locations</span>
                    <span className="font-semibold text-sidebar-foreground">{locations.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-sidebar-foreground/70">Dialogue Lines</span>
                    <span className="font-semibold text-sidebar-foreground">{totalDialogueLines}</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'characters' && (
              <div className="p-2 space-y-3">
                {characterStats.length === 0 ? (
                  <p className="text-sm text-sidebar-foreground/70 text-center py-4">
                    No characters yet
                  </p>
                ) : (
                  characterStats.map((char) => (
                    <div key={char.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-sidebar-foreground">
                          {char.name}
                        </span>
                        <Badge variant="secondary" className="text-xs rounded-lg">
                          {char.dialoguePercentage}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-sidebar-foreground/70">
                        <span>{char.appearances} scenes</span>
                        <span>{char.dialogueLines} lines</span>
                      </div>
                      <div className="w-full bg-sidebar-accent rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all bg-sidebar-primary"
                          style={{ width: `${char.dialoguePercentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === 'locations' && (
              <div className="p-2 space-y-3">
                {locationStats.length === 0 ? (
                  <p className="text-sm text-sidebar-foreground/70 text-center py-4">
                    No locations yet
                  </p>
                ) : (
                  locationStats.map((loc) => (
                    <div key={loc.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-sidebar-primary/50" />
                          <span className="font-medium text-sm text-sidebar-foreground">{loc.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs rounded-lg">
                          {loc.type}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-sidebar-foreground/70 pl-4">
                        <span>{loc.sceneCount} scenes</span>
                        <span>{loc.percentage}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection === 'scene' && (
              <div className="p-2">
                {selectedScene ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-sidebar-foreground">Scene {selectedScene.number}</span>
                    </div>
                    <div>
                      <span className="text-xs text-sidebar-foreground/70">Location: </span>
                      <span className="text-xs text-sidebar-foreground">{selectedScene.location.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedScene.characters.map(charId => {
                        const character = characters.find(c => c.id === charId);
                        return character ? (
                          <Badge
                            key={charId}
                            variant="outline"
                            className="text-xs rounded-lg"
                          >
                            {character.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-sidebar-foreground/70 text-center py-4">
                    No scene selected
                  </p>
                )}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-center gap-1 text-xs text-sidebar-foreground/70 p-2">
          <span className="font-semibold text-sidebar-foreground">{scenes.length}</span>
          <span>scenes</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
