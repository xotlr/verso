import { useState, useCallback } from 'react';

interface UseCardSelectionResult {
  selectedCardIds: Set<string>;
  isSelectionMode: boolean;
  toggleSelectionMode: () => void;
  selectCard: (cardId: string) => void;
  deselectCard: (cardId: string) => void;
  toggleCard: (cardId: string) => void;
  selectMultiple: (cardIds: string[]) => void;
  clearSelection: () => void;
  selectAll: (cardIds: string[]) => void;
  isSelected: (cardId: string) => boolean;
}

/**
 * Hook for managing card selection state
 * Handles multi-select mode and individual card selection/deselection
 */
export function useCardSelection(): UseCardSelectionResult {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    // Clear selection when exiting selection mode
    if (isSelectionMode) {
      setSelectedCardIds(new Set());
    }
  }, [isSelectionMode]);

  const selectCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
  }, []);

  const deselectCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  const toggleCard = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const selectMultiple = useCallback((cardIds: string[]) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      cardIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set());
  }, []);

  const selectAll = useCallback((cardIds: string[]) => {
    setSelectedCardIds(new Set(cardIds));
  }, []);

  const isSelected = useCallback(
    (cardId: string) => {
      return selectedCardIds.has(cardId);
    },
    [selectedCardIds]
  );

  return {
    selectedCardIds,
    isSelectionMode,
    toggleSelectionMode,
    selectCard,
    deselectCard,
    toggleCard,
    selectMultiple,
    clearSelection,
    selectAll,
    isSelected,
  };
}
