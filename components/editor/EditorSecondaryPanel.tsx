'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Film,
  Users,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  GripVertical,
  Search,
  X,
} from 'lucide-react';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { ActivityBar, type ActivityBarPanel } from './ActivityBar';

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface EditorSecondaryPanelProps {
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  screenplayId?: string;
  className?: string;
}

type CharacterRole = 'Protagonist' | 'Antagonist' | 'Supporting' | 'Minor';

/**
 * Secondary panel with activity bar for scenes and characters.
 * Activity bar (icons) + expandable panel.
 */
export function EditorSecondaryPanel({
  scenes,
  characters,
  view,
  screenplayId,
  className,
}: EditorSecondaryPanelProps) {
  const [activePanel, setActivePanel] = useState<ActivityBarPanel>('scenes');
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(['act-1']));
  const [characterRoles, setCharacterRoles] = useState<Map<string, CharacterRole>>(new Map());
  const [characterFilter, setCharacterFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'all'>('all');
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Storage key for localStorage
  const storageKey = screenplayId ? `character-roles-${screenplayId}` : null;

  // Load character roles from localStorage and API on mount
  useEffect(() => {
    if (!screenplayId) return;

    const loadRoles = async () => {
      // First try localStorage for immediate display
      const localData = localStorage.getItem(storageKey!);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setCharacterRoles(new Map(parsed));
        } catch (e) {
          console.error('Failed to parse character roles from localStorage:', e);
        }
      }

      // Then load from API for authoritative data
      setIsLoadingRoles(true);
      try {
        const res = await fetch(`/api/screenplays/${screenplayId}/characters`);
        if (res.ok) {
          const data = await res.json();
          if (data.roles && Object.keys(data.roles).length > 0) {
            const rolesMap = new Map<string, CharacterRole>(Object.entries(data.roles));
            setCharacterRoles(rolesMap);
            // Update localStorage with API data
            localStorage.setItem(storageKey!, JSON.stringify([...rolesMap]));
          }
        }
      } catch (e) {
        console.error('Failed to load character roles from API:', e);
      } finally {
        setIsLoadingRoles(false);
        isInitialLoadRef.current = false;
      }
    };

    loadRoles();
  }, [screenplayId, storageKey]);

  // Auto-assign roles based on dialogue count when no roles exist
  useEffect(() => {
    // Only run after initial load is complete
    if (isInitialLoadRef.current) return;
    // Only auto-assign if we have characters but no roles assigned
    if (characters.length === 0) return;
    if (characterRoles.size > 0) return;

    // Sort characters by dialogue count (highest first)
    const sortedChars = [...characters].sort((a, b) => b.dialogueCount - a.dialogueCount);

    // Auto-assign roles based on dialogue ranking
    const autoRoles = new Map<string, CharacterRole>();
    sortedChars.forEach((char, index) => {
      if (index === 0 && char.dialogueCount > 0) {
        // Top character with dialogue = Protagonist
        autoRoles.set(char.id, 'Protagonist');
      } else if (index <= 2 && char.dialogueCount > 0) {
        // #2-3 with dialogue = Supporting
        autoRoles.set(char.id, 'Supporting');
      } else {
        // Rest = Minor
        autoRoles.set(char.id, 'Minor');
      }
    });

    if (autoRoles.size > 0) {
      setCharacterRoles(autoRoles);
    }
  }, [characters, characterRoles.size]);

  // Save character roles to localStorage and API when they change
  useEffect(() => {
    if (!screenplayId || isInitialLoadRef.current) return;
    if (characterRoles.size === 0) return;

    // Save to localStorage immediately
    localStorage.setItem(storageKey!, JSON.stringify([...characterRoles]));

    // Debounce API save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/screenplays/${screenplayId}/characters`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles: Object.fromEntries(characterRoles) }),
        });
      } catch (e) {
        console.error('Failed to save character roles to API:', e);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [characterRoles, screenplayId, storageKey]);

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

  // Sort characters by dialogue count (most talkative first) and filter
  const filteredCharacters = useMemo(() => {
    return [...characters]
      .sort((a, b) => b.dialogueCount - a.dialogueCount)
      .filter(char => {
        const matchesName = char.name.toLowerCase().includes(characterFilter.toLowerCase());
        const matchesRole = roleFilter === 'all' || characterRoles.get(char.id) === roleFilter;
        return matchesName && matchesRole;
      });
  }, [characters, characterFilter, roleFilter, characterRoles]);

  const toggleAct = useCallback((actId: string) => {
    setExpandedActs(prev => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  }, []);

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
  }, [view]);

  const formatSceneHeading = (scene: SceneInfo) => {
    const type = scene.type || 'INT';
    const location = scene.location || 'UNKNOWN';
    return `${type}. ${location}`;
  };

  const updateCharacterRole = useCallback((charId: string, role: CharacterRole) => {
    setCharacterRoles(prev => {
      const next = new Map(prev);
      next.set(charId, role);
      return next;
    });
  }, []);

  const isPanelOpen = activePanel !== null;

  // Calculate total width for parent spacing
  const totalWidth = isPanelOpen ? 'calc(3rem + 16rem)' : '3rem'; // w-12 (3rem) + w-64 (16rem)

  return (
    <>
      {/* Spacer div to push content - matches the fixed sidebar width */}
      <div
        className="hidden md:block shrink-0 transition-all duration-200 ease-out"
        style={{ width: totalWidth }}
      />

      {/* Fixed sidebar container */}
      <div
        className={cn(
          'hidden md:flex fixed top-16 bottom-0 z-20',
          'left-[var(--sidebar-width)]',
          className
        )}
      >
        {/* Activity Bar - always visible on desktop */}
        <div className="h-full">
          <ActivityBar
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            scenesCount={scenes.length}
            charactersCount={characters.length}
          />
        </div>

        {/* Expandable Panel */}
        <div
          className={cn(
            'h-full',
            'bg-card border-r border-border overflow-hidden',
            'transition-all duration-200 ease-out',
            'shadow-sm',
            isPanelOpen ? 'w-64' : 'w-0'
          )}
        >
        {isPanelOpen && (
          <div className="w-64 h-full flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              {activePanel === 'scenes' ? (
                <>
                  <Film className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">Scenes</h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {scenes.length}
                  </span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">Characters</h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {characters.length}
                  </span>
                </>
              )}
            </div>

            {/* Panel Content */}
            {activePanel === 'scenes' ? (
              <ScrollArea className="flex-1">
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
                    acts.map((act) => (
                      <div key={act.id} className="mb-2">
                        {/* Act header */}
                        <button
                          onClick={() => toggleAct(act.id)}
                          className={cn(
                            'w-full flex items-center justify-between',
                            'px-2 py-2 rounded-lg',
                            'text-xs font-medium',
                            'hover:bg-accent',
                            'transition-colors'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Clapperboard className="h-3.5 w-3.5 text-muted-foreground" />
                            {act.name}
                            <span className="text-muted-foreground">
                              ({act.scenes.length})
                            </span>
                          </span>
                          {expandedActs.has(act.id) ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>

                        {/* Scenes list */}
                        {expandedActs.has(act.id) && (
                          <div className="ml-2 mt-1 space-y-0.5">
                            {act.scenes.map((scene) => (
                              <button
                                key={scene.id}
                                onClick={() => navigateToScene(scene)}
                                className={cn(
                                  'w-full flex items-center gap-2',
                                  'pl-3 pr-2 py-1.5 rounded-lg',
                                  'text-left text-xs',
                                  'hover:bg-accent',
                                  'transition-colors',
                                  'group'
                                )}
                              >
                                <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab" />
                                <span className="w-5 font-mono text-muted-foreground text-[10px]">
                                  {scene.sceneNumber || `${scenes.indexOf(scene) + 1}`}
                                </span>
                                <span className="flex-1 truncate">
                                  {formatSceneHeading(scene)}
                                </span>
                                {scene.timeOfDay && (
                                  <span className="text-[10px] text-muted-foreground/60 uppercase">
                                    {scene.timeOfDay.slice(0, 3)}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                  {characters.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm p-3">
                      <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No characters yet</p>
                      <p className="text-xs mt-1">
                        Characters appear as you add dialogue.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Search and Filter - Fixed at top */}
                      <div className="p-3 space-y-2 border-b border-border shrink-0">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Search characters..."
                            value={characterFilter}
                            onChange={(e) => setCharacterFilter(e.target.value)}
                            className="h-8 pl-8 pr-8 text-xs"
                          />
                          {characterFilter && (
                            <button
                              onClick={() => setCharacterFilter('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {(['all', 'Protagonist', 'Antagonist', 'Supporting', 'Minor'] as const).map((role) => (
                            <button
                              key={role}
                              onClick={() => setRoleFilter(role)}
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                                roleFilter === role
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-accent text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {role === 'all' ? 'All' : role === 'Protagonist' ? 'Lead' : role === 'Antagonist' ? 'Antag' : role}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Character List - Scrollable */}
                      <ScrollArea className="flex-1">
                        <div className="p-3 space-y-1.5">
                          {filteredCharacters.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-xs">
                              No characters match your filter.
                            </div>
                          ) : (
                            filteredCharacters.map((char, index) => {
                              const role = characterRoles.get(char.id) || 'Supporting';
                              const roles: CharacterRole[] = ['Protagonist', 'Antagonist', 'Supporting', 'Minor'];
                              const currentIndex = roles.indexOf(role);
                              const cycleRole = () => {
                                const nextIndex = (currentIndex + 1) % roles.length;
                                updateCharacterRole(char.id, roles[nextIndex]);
                              };
                              const isProtagonist = role === 'Protagonist';

                              return (
                                <div
                                  key={char.id}
                                  className={cn(
                                    'p-2 rounded-lg transition-colors',
                                    isProtagonist
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-accent/30'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="relative shrink-0">
                                      <div className={cn(
                                        'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                                        isProtagonist
                                          ? 'bg-primary-foreground text-primary'
                                          : 'bg-foreground/10 text-foreground'
                                      )}>
                                        {char.name.charAt(0)}
                                      </div>
                                      {/* Rank indicator for top 3 */}
                                      {index < 3 && (
                                        <div className={cn(
                                          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full flex items-center justify-center text-[8px] font-bold border',
                                          isProtagonist
                                            ? 'bg-primary-foreground text-primary border-primary'
                                            : index === 0
                                              ? 'bg-primary text-primary-foreground border-card'
                                              : 'bg-muted text-muted-foreground border-card'
                                        )}>
                                          {index + 1}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className={cn(
                                        'font-medium text-xs truncate',
                                        isProtagonist && 'text-primary-foreground'
                                      )}>
                                        {char.name}
                                      </h4>
                                      <span className={cn(
                                        'text-[10px]',
                                        isProtagonist ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                      )}>
                                        {char.dialogueCount} lines
                                      </span>
                                    </div>
                                    <button
                                      onClick={cycleRole}
                                      className={cn(
                                        'text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-all hover:opacity-80 shrink-0',
                                        isProtagonist
                                          ? 'bg-primary-foreground text-primary'
                                          : role === 'Antagonist'
                                            ? 'bg-destructive/15 text-destructive'
                                            : 'bg-muted text-muted-foreground'
                                      )}
                                      title="Click to cycle role"
                                    >
                                      {role === 'Protagonist' ? 'LEAD' : role === 'Antagonist' ? 'ANTAG' : role === 'Supporting' ? 'SUPPORT' : 'MINOR'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </div>
              )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
