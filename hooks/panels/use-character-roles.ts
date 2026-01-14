import { useState, useCallback, useEffect, useRef } from 'react';
import type { CharacterInfo } from '@/hooks/editor/types';

export type CharacterRole = 'Protagonist' | 'Antagonist' | 'Supporting' | 'Minor';

interface UseCharacterRolesOptions {
  screenplayId?: string;
  characters: CharacterInfo[];
}

/**
 * Hook for managing character roles with persistence.
 * Handles loading from localStorage/API, auto-assignment, and saving.
 */
export function useCharacterRoles({
  screenplayId,
  characters,
}: UseCharacterRolesOptions) {
  const [characterRoles, setCharacterRoles] = useState<Map<string, CharacterRole>>(new Map());
  const [loadComplete, setLoadComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Ref to access characterRoles without causing callback recreation
  const characterRolesRef = useRef(characterRoles);
  characterRolesRef.current = characterRoles;

  // Ref to track characters for auto-assign (avoids dependency on prop)
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  // Storage key for localStorage
  const storageKey = screenplayId ? `character-roles-${screenplayId}` : null;

  // Load character roles from localStorage and API on mount
  useEffect(() => {
    if (!screenplayId) {
      setIsLoading(false);
      return;
    }

    const loadRoles = async () => {
      setIsLoading(true);
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
        isInitialLoadRef.current = false;
        setLoadComplete(true);
        setIsLoading(false);
      }
    };

    loadRoles();
  }, [screenplayId, storageKey]);

  // Auto-assign roles based on dialogue count when no roles exist
  // Only runs once after load completes, if no roles were loaded
  useEffect(() => {
    // Wait for load to complete
    if (!loadComplete) return;
    // Only auto-assign if no roles assigned yet
    if (characterRoles.size > 0) return;

    const chars = charactersRef.current;
    if (chars.length === 0) return;

    // Sort characters by dialogue count (highest first)
    const sortedChars = [...chars].sort((a, b) => b.dialogueCount - a.dialogueCount);

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
  }, [loadComplete, characterRoles.size]);

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

  const updateCharacterRole = useCallback((charId: string, role: CharacterRole) => {
    setCharacterRoles(prev => {
      const next = new Map(prev);
      next.set(charId, role);
      return next;
    });
  }, []);

  // Cycle through roles: Protagonist → Antagonist → Supporting → Minor → Protagonist
  const cycleRole = useCallback((charId: string) => {
    const roles: CharacterRole[] = ['Protagonist', 'Antagonist', 'Supporting', 'Minor'];
    const currentRole = characterRolesRef.current.get(charId) || 'Supporting';
    const currentIndex = roles.indexOf(currentRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    updateCharacterRole(charId, roles[nextIndex]);
  }, [updateCharacterRole]);

  const getRole = useCallback((charId: string): CharacterRole => {
    return characterRolesRef.current.get(charId) || 'Supporting';
  }, []);

  return {
    characterRoles,
    characterRolesRef,
    isLoading,
    updateCharacterRole,
    cycleRole,
    getRole,
  };
}

export type CharacterRolesReturn = ReturnType<typeof useCharacterRoles>;
