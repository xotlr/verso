import { useMemo } from 'react';
import type { IndexCard, CardGroup, GroupedCards, CustomCardGroup } from '@/types/index-cards';
import type { ActConfig } from '@/types/beat-board';

interface UseGroupedCardsOptions {
  cards: IndexCard[];
  customGroups: CustomCardGroup[];
  acts: ActConfig[];
  collapsedGroupIds?: Set<string>;
}

/**
 * Hook to organize index cards into groups
 * Groups can be either acts (from beat board) or custom user-created groups
 * Cards are first organized by custom groups, then by acts, with ungrouped cards at the end
 */
export function useGroupedCards({
  cards,
  customGroups,
  acts,
  collapsedGroupIds = new Set(),
}: UseGroupedCardsOptions): GroupedCards {
  return useMemo(() => {
    const result: GroupedCards = {
      groups: [],
      ungrouped: [],
    };

    // Create maps for quick lookup
    const customGroupMap = new Map(customGroups.map((g) => [g.id, g]));
    const actMap = new Map(acts.map((a) => [a.id, a]));

    // Group cards
    const customGroupCards = new Map<string, IndexCard[]>();
    const actGroupCards = new Map<string, IndexCard[]>();
    const ungroupedCards: IndexCard[] = [];

    for (const card of cards) {
      // Priority 1: Custom group
      if (card.customGroupId && customGroupMap.has(card.customGroupId)) {
        if (!customGroupCards.has(card.customGroupId)) {
          customGroupCards.set(card.customGroupId, []);
        }
        customGroupCards.get(card.customGroupId)!.push(card);
        continue;
      }

      // Priority 2: Act group
      if (card.act && actMap.has(card.act)) {
        if (!actGroupCards.has(card.act)) {
          actGroupCards.set(card.act, []);
        }
        actGroupCards.get(card.act)!.push(card);
        continue;
      }

      // Priority 3: Ungrouped
      ungroupedCards.push(card);
    }

    // Build custom groups (ordered by order field)
    const sortedCustomGroups = [...customGroups].sort((a, b) => a.order - b.order);
    for (const customGroup of sortedCustomGroups) {
      const groupCards = customGroupCards.get(customGroup.id) || [];
      if (groupCards.length > 0) {
        const cardGroup: CardGroup = {
          id: customGroup.id,
          name: customGroup.name,
          type: 'custom',
          color: customGroup.color as any, // Type assertion needed due to Prisma string vs enum
          order: customGroup.order,
          isCollapsed: collapsedGroupIds.has(customGroup.id),
        };

        result.groups.push({
          group: cardGroup,
          cards: groupCards,
        });
      }
    }

    // Build act groups (ordered by act definition order)
    for (const act of acts) {
      const groupCards = actGroupCards.get(act.id) || [];
      if (groupCards.length > 0) {
        const cardGroup: CardGroup = {
          id: act.id,
          name: act.label,
          type: 'act',
          order: result.groups.length, // Acts come after custom groups
          isCollapsed: collapsedGroupIds.has(act.id),
        };

        result.groups.push({
          group: cardGroup,
          cards: groupCards,
        });
      }
    }

    // Add ungrouped cards
    result.ungrouped = ungroupedCards;

    return result;
  }, [cards, customGroups, acts, collapsedGroupIds]);
}
