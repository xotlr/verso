'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Users,
  MoreHorizontal,
  Edit2,
  Trash2,
  GripVertical,
  Copy,
  MessageSquare,
  Play,
  Clipboard,
} from 'lucide-react';
import { usePanelVirtualization } from '@/hooks/use-panel-virtualization';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import { PanelContainer } from './PanelContainer';
import { PanelSearch } from './PanelSearch';
import { PanelEmptyState } from './PanelEmptyState';
import { PanelSkeleton } from './PanelSkeleton';
import { usePanelDndSensors } from './use-panel-dnd';

export type CharacterRole = 'Protagonist' | 'Antagonist' | 'Supporting' | 'Minor';

// Pure helper functions - defined outside component for stable references
const getRoleLabel = (role: CharacterRole): string => {
  switch (role) {
    case 'Protagonist': return 'LEAD';
    case 'Antagonist': return 'ANTAG';
    case 'Supporting': return 'SUPPORT';
    case 'Minor': return 'MINOR';
  }
};

const getFilterLabel = (role: CharacterRole | 'all'): string => {
  switch (role) {
    case 'all': return 'All';
    case 'Protagonist': return 'Lead';
    case 'Antagonist': return 'Antag';
    default: return role;
  }
};

interface CharactersPanelProps {
  characters: CharacterInfo[];
  screenplayId?: string;
  view?: EditorView | null;
  className?: string;
}

// Sortable character item component - memoized to prevent re-renders
interface SortableCharacterItemProps {
  char: CharacterInfo;
  index: number;
  role: CharacterRole;
  isProtagonist: boolean;
  cycleRole: (charId: string) => void;
  onGoToFirstAppearance: (charName: string) => void;
  onGoToFirstDialogue: (charName: string) => void;
  onCopyName: (charName: string) => void;
}

const SortableCharacterItem = React.memo(function SortableCharacterItem({
  char,
  index,
  role,
  isProtagonist,
  cycleRole,
  onGoToFirstAppearance,
  onGoToFirstDialogue,
  onCopyName,
}: SortableCharacterItemProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: char.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'px-2.5 py-2 rounded-lg transition-all duration-150 group',
        isProtagonist
          ? 'bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-md'
          : 'hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-sm',
        isDragging && 'bg-accent shadow-lg'
      )}
    >
      <div className="flex items-center gap-1.5">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Clickable character info with navigation popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity">
              <div className="relative shrink-0">
                <div className={cn(
                  'h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold',
                  isProtagonist
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-foreground/10 text-foreground'
                )}>
                  {char.name.charAt(0)}
                </div>
                {/* Rank indicator for top 3 */}
                {index < 3 && (
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-md flex items-center justify-center text-[9px] font-bold border',
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
                  'font-medium text-xs break-words',
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
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <button
              onClick={() => {
                onGoToFirstAppearance(char.name);
                setPopoverOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              First appearance
            </button>
            <button
              onClick={() => {
                onGoToFirstDialogue(char.name);
                setPopoverOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              First dialogue
            </button>
          </PopoverContent>
        </Popover>

        <button
          onClick={() => cycleRole(char.id)}
          className={cn(
            'text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-all hover:opacity-80 shrink-0',
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

        {/* Character actions - improved context menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 opacity-0 group-hover:opacity-100',
                  isProtagonist && 'text-primary-foreground hover:bg-primary-foreground/20'
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onGoToFirstAppearance(char.name)}>
                <Play className="h-3.5 w-3.5 mr-2" />
                Go to first appearance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGoToFirstDialogue(char.name)}>
                <MessageSquare className="h-3.5 w-3.5 mr-2" />
                Go to first dialogue
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onCopyName(char.name)}>
                <Clipboard className="h-3.5 w-3.5 mr-2" />
                Copy name
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Merge with...
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Remove from script
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});

/**
 * Characters panel showing character list with role management.
 * Wrapped in React.memo to prevent re-renders when parent state changes.
 */
export const CharactersPanel = React.memo(function CharactersPanel({
  characters,
  screenplayId,
  view,
  className,
}: CharactersPanelProps) {

  const [characterRoles, setCharacterRoles] = useState<Map<string, CharacterRole>>(new Map());
  const [characterFilter, setCharacterFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'all'>('all');
  const [loadComplete, setLoadComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Ref to access characterRoles without causing callback recreation
  const characterRolesRef = useRef(characterRoles);
  characterRolesRef.current = characterRoles;

  // Navigate to first appearance of character (any mention)
  const goToFirstAppearance = useCallback((charName: string) => {
    if (!view) {
      toast.error('Editor not ready');
      return;
    }

    const { doc, tr } = view.state;
    let foundPos: number | null = null;
    const charNameUpper = charName.toUpperCase();

    // Search through all nodes for character name
    doc.descendants((node, pos) => {
      if (foundPos !== null) return false; // Stop if already found

      // Check character nodes (dialogue attribution)
      if (node.type.name === 'character') {
        const text = node.textContent.trim().toUpperCase();
        if (text === charNameUpper || text.startsWith(charNameUpper + ' (')) {
          foundPos = pos;
          return false;
        }
      }

      // Check action and other text nodes for mentions
      if (node.isText && node.text) {
        const text = node.text.toUpperCase();
        const idx = text.indexOf(charNameUpper);
        if (idx !== -1) {
          foundPos = pos + idx;
          return false;
        }
      }

      return true;
    });

    if (foundPos !== null) {
      const selection = TextSelection.create(doc, foundPos);
      view.dispatch(tr.setSelection(selection).scrollIntoView());
      view.focus();
      toast.success(`Jumped to ${charName}'s first appearance`);
    } else {
      toast.error(`${charName} not found in script`);
    }
  }, [view]);

  // Navigate to first dialogue line of character
  const goToFirstDialogue = useCallback((charName: string) => {
    if (!view) {
      toast.error('Editor not ready');
      return;
    }

    const { doc, tr } = view.state;
    let foundPos: number | null = null;
    const charNameUpper = charName.toUpperCase();

    // Search for character nodes followed by dialogue
    doc.descendants((node, pos) => {
      if (foundPos !== null) return false;

      if (node.type.name === 'character') {
        const text = node.textContent.trim().toUpperCase();
        if (text === charNameUpper || text.startsWith(charNameUpper + ' (')) {
          foundPos = pos;
          return false;
        }
      }

      return true;
    });

    if (foundPos !== null) {
      const selection = TextSelection.create(doc, foundPos);
      view.dispatch(tr.setSelection(selection).scrollIntoView());
      view.focus();
      toast.success(`Jumped to ${charName}'s first dialogue`);
    } else {
      toast.error(`${charName} has no dialogue`);
    }
  }, [view]);

  // Copy character name to clipboard
  const copyName = useCallback((charName: string) => {
    navigator.clipboard.writeText(charName);
    toast.success(`Copied "${charName}" to clipboard`);
  }, []);

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

  // Ref to track characters for auto-assign (avoids dependency on prop)
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

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

  // Sort characters by dialogue count (most talkative first) and filter
  // Uses ref for characterRoles to avoid recreating array when Map changes
  const filteredCharacters = useMemo(() => {
    return [...characters]
      .sort((a, b) => b.dialogueCount - a.dialogueCount)
      .filter(char => {
        const matchesName = char.name.toLowerCase().includes(characterFilter.toLowerCase());
        const matchesRole = roleFilter === 'all' || characterRolesRef.current.get(char.id) === roleFilter;
        return matchesName && matchesRole;
      });
  }, [characters, characterFilter, roleFilter]);

  // Memoize item IDs for SortableContext to prevent re-renders
  const sortableItemIds = useMemo(
    () => filteredCharacters.map(c => c.id),
    [filteredCharacters]
  );

  const updateCharacterRole = useCallback((charId: string, role: CharacterRole) => {
    setCharacterRoles(prev => {
      const next = new Map(prev);
      next.set(charId, role);
      return next;
    });
  }, []);

  // Use ref pattern to avoid depending on characterRoles Map directly
  // This keeps the callback stable and prevents child re-renders
  const cycleRole = useCallback((charId: string) => {
    const roles: CharacterRole[] = ['Protagonist', 'Antagonist', 'Supporting', 'Minor'];
    const currentRole = characterRolesRef.current.get(charId) || 'Supporting';
    const currentIndex = roles.indexOf(currentRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    updateCharacterRole(charId, roles[nextIndex]);
  }, [updateCharacterRole]);

  // Sensors for drag & drop
  const sensors = usePanelDndSensors();

  // Virtualization for large character lists
  const { parentRef, isVirtualized, virtualItems, totalSize, getItem, allItems } =
    usePanelVirtualization({
    items: filteredCharacters,
    estimateSize: 52, // Approximate height of each character item
    overscan: 5,
    getItemKey: (char) => char.id,
    minItemsForVirtualization: 20,
  });

  // Handle drag end - log reorder for now
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredCharacters.findIndex(c => c.id === active.id);
      const newIndex = filteredCharacters.findIndex(c => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // TODO: Implement actual character reordering persistence
      }
    }
  }, [filteredCharacters]);

  return (
    <PanelContainer className={className}>
      {/* Loading state */}
      {isLoading && characters.length === 0 ? (
        <PanelSkeleton variant="characters" />
      ) : characters.length === 0 ? (
        <PanelEmptyState
          icon={Users}
          title="No characters yet"
          description="Characters appear as you add dialogue."
        />
      ) : (
        <>
          {/* Search and Filter - Fixed at top */}
          <div className="p-3 space-y-2 shrink-0">
            <PanelSearch
              value={characterFilter}
              onChange={setCharacterFilter}
              placeholder="Search characters..."
            />
            <div className="flex gap-1 flex-wrap">
              {(['all', 'Protagonist', 'Antagonist', 'Supporting', 'Minor'] as const).map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRoleFilter(role)}
                  className="h-7 px-2 text-[10px]"
                >
                  {getFilterLabel(role)}
                </Button>
              ))}
            </div>
          </div>

          {/* Character List - Scrollable with Drag & Drop (Virtualized) */}
          <ScrollArea className="flex-1 min-h-0" viewportRef={parentRef}>
            <div className="p-3">
              {filteredCharacters.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No characters match your filter.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  {/* SortableContext needs ALL item IDs for drag calculations */}
                  <SortableContext
                    items={sortableItemIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {isVirtualized && virtualItems ? (
                      // Virtualized rendering for large lists
                      <div
                        style={{
                          height: totalSize,
                          position: 'relative',
                        }}
                      >
                        {virtualItems.map((virtualItem) => {
                          const char = getItem(virtualItem);
                          const role = characterRolesRef.current.get(char.id) || 'Supporting';
                          const isProtagonist = role === 'Protagonist';

                          return (
                            <div
                              key={virtualItem.key}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                              }}
                            >
                              <SortableCharacterItem
                                char={char}
                                index={virtualItem.index}
                                role={role}
                                isProtagonist={isProtagonist}
                                cycleRole={cycleRole}
                                onGoToFirstAppearance={goToFirstAppearance}
                                onGoToFirstDialogue={goToFirstDialogue}
                                onCopyName={copyName}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Regular rendering for small lists
                      <div className="space-y-1.5">
                        {allItems.map((char, index) => {
                          const role = characterRolesRef.current.get(char.id) || 'Supporting';
                          const isProtagonist = role === 'Protagonist';

                          return (
                            <SortableCharacterItem
                              key={char.id}
                              char={char}
                              index={index}
                              role={role}
                              isProtagonist={isProtagonist}
                              cycleRole={cycleRole}
                              onGoToFirstAppearance={goToFirstAppearance}
                              onGoToFirstDialogue={goToFirstDialogue}
                              onCopyName={copyName}
                            />
                          );
                        })}
                      </div>
                    )}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </PanelContainer>
  );
});
