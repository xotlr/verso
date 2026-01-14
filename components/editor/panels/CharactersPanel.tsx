'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Users } from 'lucide-react';
import { usePanelVirtualization } from '@/hooks/use-panel-virtualization';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EditorView } from 'prosemirror-view';
import type { CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import { useCharacterRoles, useCharacterNavigation, type CharacterRole } from '@/hooks/panels';
import { PanelContainer } from './PanelContainer';
import { PanelSearch } from './PanelSearch';
import { PanelEmptyState } from './PanelEmptyState';
import { PanelSkeleton } from './PanelSkeleton';
import { usePanelDndSensors } from './use-panel-dnd';
import { SortableCharacterItem } from './SortableCharacterItem';
import { CharacterRoleFilter, type RoleFilterValue } from './CharacterRoleFilter';

export type { CharacterRole };

interface CharactersPanelProps {
  characters: CharacterInfo[];
  screenplayId?: string;
  view?: EditorView | null;
  className?: string;
}

/**
 * Characters panel showing character list with role management.
 * Supports filtering, search, and drag-to-reorder.
 */
export const CharactersPanel = React.memo(function CharactersPanel({
  characters,
  screenplayId,
  view,
  className,
}: CharactersPanelProps) {
  const [characterFilter, setCharacterFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('all');

  // Character roles management
  const { characterRolesRef, isLoading, cycleRole } = useCharacterRoles({
    screenplayId,
    characters,
  });

  // Navigation actions
  const { goToFirstAppearance, goToFirstDialogue, copyName } = useCharacterNavigation({ view });

  // DnD sensors
  const sensors = usePanelDndSensors();

  // Sort by dialogue count and apply filters
  const filteredCharacters = useMemo(() => {
    return [...characters]
      .sort((a, b) => b.dialogueCount - a.dialogueCount)
      .filter(char => {
        const matchesName = char.name.toLowerCase().includes(characterFilter.toLowerCase());
        const matchesRole = roleFilter === 'all' || characterRolesRef.current.get(char.id) === roleFilter;
        return matchesName && matchesRole;
      });
  }, [characters, characterFilter, roleFilter, characterRolesRef]);

  // Item IDs for SortableContext
  const sortableItemIds = useMemo(
    () => filteredCharacters.map(c => c.id),
    [filteredCharacters]
  );

  // Virtualization for large lists
  const { parentRef, isVirtualized, virtualItems, totalSize, getItem, allItems } =
    usePanelVirtualization({
      items: filteredCharacters,
      estimateSize: 52,
      overscan: 5,
      getItemKey: (char) => char.id,
      minItemsForVirtualization: 20,
    });

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Character order is derived from dialogue count
      // Manual reordering not yet supported
    }
  }, []);

  // Render character item helper
  const renderCharacterItem = useCallback((char: CharacterInfo, index: number) => {
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
  }, [characterRolesRef, cycleRole, goToFirstAppearance, goToFirstDialogue, copyName]);

  // Loading state
  if (isLoading && characters.length === 0) {
    return (
      <PanelContainer className={className}>
        <PanelSkeleton variant="characters" />
      </PanelContainer>
    );
  }

  // Empty state
  if (characters.length === 0) {
    return (
      <PanelContainer className={className}>
        <PanelEmptyState
          icon={Users}
          title="No characters yet"
          description="Characters appear as you add dialogue."
        />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer className={className}>
      {/* Screen reader instructions */}
      <div id="character-drag-instructions" className="sr-only">
        Press Space or Enter to start dragging. Use arrow keys to move.
        Press Space or Enter again to drop. Press Escape to cancel.
      </div>

      {/* Search and Filter */}
      <div className="p-3 space-y-2 shrink-0">
        <PanelSearch
          value={characterFilter}
          onChange={setCharacterFilter}
          placeholder="Search characters..."
        />
        <CharacterRoleFilter value={roleFilter} onChange={setRoleFilter} />
      </div>

      {/* Character List */}
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
              <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                {isVirtualized && virtualItems ? (
                  <div style={{ height: totalSize, position: 'relative' }}>
                    {virtualItems.map((virtualItem) => {
                      const char = getItem(virtualItem);
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
                          {renderCharacterItem(char, virtualItem.index)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {allItems.map((char, index) => renderCharacterItem(char, index))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>
    </PanelContainer>
  );
});
