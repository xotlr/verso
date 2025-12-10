'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  X,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CharacterInfo } from '@/hooks/editor/useProseMirrorEditor';

export type CharacterRole = 'Protagonist' | 'Antagonist' | 'Supporting' | 'Minor';

interface CharactersPanelProps {
  characters: CharacterInfo[];
  screenplayId?: string;
  onAddCharacter?: () => void;
  className?: string;
}

/**
 * Characters panel showing character list with role management.
 */
export function CharactersPanel({
  characters,
  screenplayId,
  onAddCharacter,
  className,
}: CharactersPanelProps) {
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

  const updateCharacterRole = useCallback((charId: string, role: CharacterRole) => {
    setCharacterRoles(prev => {
      const next = new Map(prev);
      next.set(charId, role);
      return next;
    });
  }, []);

  const cycleRole = useCallback((charId: string) => {
    const roles: CharacterRole[] = ['Protagonist', 'Antagonist', 'Supporting', 'Minor'];
    const currentRole = characterRoles.get(charId) || 'Supporting';
    const currentIndex = roles.indexOf(currentRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    updateCharacterRole(charId, roles[nextIndex]);
  }, [characterRoles, updateCharacterRole]);

  const getRoleLabel = (role: CharacterRole) => {
    switch (role) {
      case 'Protagonist': return 'LEAD';
      case 'Antagonist': return 'ANTAG';
      case 'Supporting': return 'SUPPORT';
      case 'Minor': return 'MINOR';
    }
  };

  const getFilterLabel = (role: CharacterRole | 'all') => {
    switch (role) {
      case 'all': return 'All';
      case 'Protagonist': return 'Lead';
      case 'Antagonist': return 'Antag';
      default: return role;
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Characters</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {characters.length}
        </span>
        {onAddCharacter && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddCharacter}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Content */}
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
                  {getFilterLabel(role)}
                </button>
              ))}
            </div>
          </div>

          {/* Character List - Scrollable */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1.5">
              {isLoadingRoles && (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  Loading...
                </div>
              )}
              {!isLoadingRoles && filteredCharacters.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No characters match your filter.
                </div>
              ) : (
                filteredCharacters.map((char, index) => {
                  const role = characterRoles.get(char.id) || 'Supporting';
                  const isProtagonist = role === 'Protagonist';

                  return (
                    <div
                      key={char.id}
                      className={cn(
                        'p-2 rounded-lg transition-colors group',
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
                          onClick={() => cycleRole(char.id)}
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
                          {getRoleLabel(role)}
                        </button>

                        {/* Character actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-6 w-6 opacity-0 group-hover:opacity-100',
                                isProtagonist && 'text-primary-foreground hover:bg-primary-foreground/20'
                              )}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem>
                              <UserCircle className="h-3.5 w-3.5 mr-2" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="h-3.5 w-3.5 mr-2" />
                              Edit name
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
  );
}
