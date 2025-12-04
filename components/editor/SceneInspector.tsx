'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Camera,
  StickyNote,
  Plus,
  X,
  User,
  MessageSquare,
} from 'lucide-react';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';

interface SceneInspectorProps {
  currentScene: SceneInfo | null;
  allScenes: SceneInfo[];
  characters: CharacterInfo[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const SHOT_TYPES = [
  'WIDE', 'MEDIUM', 'CLOSE-UP', 'ECU', 'OTS', 'POV', 'TWO-SHOT', 'INSERT',
] as const;

type ShotType = typeof SHOT_TYPES[number];

interface Shot {
  id: string;
  type: ShotType;
  description: string;
}

type CharacterRole = 'Protagonist' | 'Antagonist' | 'Supporting' | 'Minor';

/**
 * Floating overlay panel showing scene details and character info.
 */
export function SceneInspector({
  currentScene,
  allScenes,
  characters,
  isOpen,
  onClose,
  className,
}: SceneInspectorProps) {
  const [activeTab, setActiveTab] = useState<'scene' | 'characters'>('scene');
  const [synopsis, setSynopsis] = useState('');
  const [notes, setNotes] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [characterMeta, setCharacterMeta] = useState<Map<string, { role: CharacterRole; description: string }>>(new Map());

  const addShot = useCallback(() => {
    setShots(prev => [...prev, {
      id: `shot-${Date.now()}`,
      type: 'WIDE',
      description: '',
    }]);
  }, []);

  const removeShot = useCallback((shotId: string) => {
    setShots(prev => prev.filter(s => s.id !== shotId));
  }, []);

  const updateShot = useCallback((shotId: string, updates: Partial<Shot>) => {
    setShots(prev => prev.map(s =>
      s.id === shotId ? { ...s, ...updates } : s
    ));
  }, []);

  const updateCharacterMeta = useCallback((charId: string, updates: Partial<{ role: CharacterRole; description: string }>) => {
    setCharacterMeta(prev => {
      const next = new Map(prev);
      const existing = next.get(charId) || { role: 'Supporting' as CharacterRole, description: '' };
      next.set(charId, { ...existing, ...updates });
      return next;
    });
  }, []);

  const formatSceneHeading = (scene: SceneInfo) => {
    return `${scene.type || 'INT'}. ${scene.location || 'UNKNOWN'} - ${scene.timeOfDay || 'DAY'}`;
  };

  const sceneIndex = currentScene
    ? allScenes.findIndex(s => s.id === currentScene.id) + 1
    : 0;

  const roleColors: Record<CharacterRole, string> = {
    Protagonist: 'bg-blue-500',
    Antagonist: 'bg-red-500',
    Supporting: 'bg-purple-500',
    Minor: 'bg-zinc-500',
  };

  return (
    <div
      className={cn(
        'fixed top-14 bottom-0 right-4 z-30 w-80',
        'flex flex-col bg-card border border-border shadow-2xl rounded-l-lg',
        'transition-all duration-300 ease-in-out',
        isOpen
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0 pointer-events-none',
        className
      )}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-sm">Inspector</h2>
          <div className="w-7" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'scene' | 'characters')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-3 mt-2 h-9">
            <TabsTrigger value="scene" className="gap-1.5 text-xs flex-1">
              <FileText className="h-3.5 w-3.5" />
              Scene
            </TabsTrigger>
            <TabsTrigger value="characters" className="gap-1.5 text-xs flex-1">
              <Users className="h-3.5 w-3.5" />
              Cast
            </TabsTrigger>
          </TabsList>

          {/* Scene Tab */}
          <TabsContent value="scene" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {currentScene ? (
                  <>
                    {/* Scene header */}
                    <div className="p-3 bg-accent/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {currentScene.sceneNumber || sceneIndex}
                        </Badge>
                        <span className="text-xs text-muted-foreground uppercase">
                          {currentScene.timeOfDay || 'DAY'}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm">
                        {formatSceneHeading(currentScene)}
                      </h3>
                    </div>

                    {/* Synopsis */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <StickyNote className="h-3.5 w-3.5" />
                        Synopsis
                      </label>
                      <Textarea
                        placeholder="What happens in this scene..."
                        value={synopsis}
                        onChange={(e) => setSynopsis(e.target.value)}
                        className="resize-none text-sm"
                        rows={3}
                      />
                    </div>

                    {/* Shotlist */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5" />
                          Shots
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addShot}
                          className="h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {shots.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">
                            No shots planned yet.
                          </p>
                        ) : (
                          shots.map((shot) => (
                            <div
                              key={shot.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-accent/50"
                            >
                              <select
                                value={shot.type}
                                onChange={(e) => updateShot(shot.id, { type: e.target.value as ShotType })}
                                className="text-xs bg-transparent border-none p-0 font-medium w-20"
                              >
                                {SHOT_TYPES.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Description..."
                                value={shot.description}
                                onChange={(e) => updateShot(shot.id, { description: e.target.value })}
                                className="flex-1 text-xs bg-transparent border-none p-0"
                              />
                              <button
                                onClick={() => removeShot(shot.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <StickyNote className="h-3.5 w-3.5" />
                        Notes
                      </label>
                      <Textarea
                        placeholder="Production notes, reminders..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="resize-none text-sm"
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No scene selected</p>
                    <p className="text-xs mt-1">
                      Click on a scene heading to inspect it.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Characters Tab */}
          <TabsContent value="characters" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {characters.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No characters yet</p>
                    <p className="text-xs mt-1">
                      Characters will appear as you add dialogue.
                    </p>
                  </div>
                ) : (
                  characters.map((char) => {
                    const meta = characterMeta.get(char.id);
                    const role = meta?.role || 'Supporting';

                    return (
                      <div
                        key={char.id}
                        className="p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{char.name}</h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                {char.dialogueCount} lines
                              </div>
                            </div>
                          </div>
                          <select
                            value={role}
                            onChange={(e) => updateCharacterMeta(char.id, { role: e.target.value as CharacterRole })}
                            className={cn(
                              'text-xs px-2 py-1 rounded text-white border-none',
                              roleColors[role]
                            )}
                          >
                            <option value="Protagonist">Lead</option>
                            <option value="Antagonist">Antag</option>
                            <option value="Supporting">Support</option>
                            <option value="Minor">Minor</option>
                          </select>
                        </div>
                        <Textarea
                          placeholder="Character bio..."
                          value={meta?.description || ''}
                          onChange={(e) => updateCharacterMeta(char.id, { description: e.target.value })}
                          className="resize-none text-xs"
                          rows={2}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
    </div>
  );
}
