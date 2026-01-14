'use client';

import React from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GroupHeader } from './GroupHeader';
import type { CardGroup, GroupColor, CardStatus, IndexCard } from '@/types/index-cards';
import type { Scene } from '@/types/screenplay';

interface GroupSectionProps {
  group: CardGroup;
  cards: IndexCard[];
  scenes: Scene[];
  characterRankings?: Map<string, number>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onGroupRename: (newName: string) => void;
  onGroupChangeColor: (color: GroupColor) => void;
  onGroupUngroup: () => void;
  onGroupDelete?: () => void;
  onCardContextMenu: (e: React.MouseEvent, cardId: string, sceneId: string) => void;
  onCardStatusChange: (cardId: string, status: CardStatus) => void;
  selectedCardIds: Set<string>;
  onCardSelect: (cardId: string, isMulti: boolean) => void;
  renderCard: (scene: Scene, card: IndexCard) => React.ReactNode;
}

/**
 * GroupSection - Collapsible section with grouped index cards
 * Displays a group header and a grid of cards in the group
 */
export function GroupSection({
  group,
  cards,
  scenes,
  isCollapsed,
  onToggleCollapse,
  onGroupRename,
  onGroupChangeColor,
  onGroupUngroup,
  onGroupDelete,
  onCardContextMenu,
  selectedCardIds,
  onCardSelect,
  renderCard,
}: GroupSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      groupId: group.id,
    },
  });

  // Get scene data for each card
  const cardsWithScenes = cards
    .map((card) => {
      const scene = scenes.find((s) => s.id === card.sceneId);
      return scene ? { card, scene } : null;
    })
    .filter((item): item is { card: IndexCard; scene: Scene } => item !== null);

  // Get color classes for custom groups
  const getGroupBorderClass = () => {
    if (group.type === 'act') {
      return 'border-blue-500/20';
    }
    if (group.color) {
      return `border-${group.color}-500/20`;
    }
    return 'border-border';
  };

  const getDropHighlightClass = () => {
    if (!isOver) return '';
    if (group.type === 'act') {
      return 'ring-2 ring-blue-500/30 bg-blue-500/5';
    }
    if (group.color) {
      return `ring-2 ring-${group.color}-500/30 bg-${group.color}-500/5`;
    }
    return 'ring-2 ring-primary/30 bg-primary/5';
  };

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        getGroupBorderClass(),
        getDropHighlightClass()
      )}
    >
      {/* Group Header */}
      <GroupHeader
        group={group}
        cardCount={cards.length}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onRename={onGroupRename}
        onChangeColor={onGroupChangeColor}
        onUngroup={onGroupUngroup}
        onDelete={onGroupDelete}
      />

      {/* Cards Grid (Collapsible) */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={cn(
            'p-4 transition-all',
            group.type === 'custom' && group.color && `bg-${group.color}-500/5`,
            group.type === 'act' && 'bg-blue-500/5'
          )}
        >
          {cardsWithScenes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No cards in this group
            </div>
          ) : (
            <SortableContext
              items={cardsWithScenes.map((item) => item.scene.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className={cn(
                  'grid gap-2',
                  'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                )}
              >
                {cardsWithScenes.map(({ card, scene }) => (
                  <div
                    key={scene.id}
                    onContextMenu={(e) => onCardContextMenu(e, card.sceneId, scene.id)}
                    className={cn(
                      'transition-all',
                      selectedCardIds.has(card.sceneId) &&
                        'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    {renderCard(scene, card)}
                  </div>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
