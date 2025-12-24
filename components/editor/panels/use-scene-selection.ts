import { useState, useCallback, useEffect } from 'react';

interface UseSceneSelectionOptions {
  sceneIds: string[];
}

export function useSceneSelection({ sceneIds }: UseSceneSelectionOptions) {
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Handle scene selection with shift/cmd modifiers
  const handleSelect = useCallback((sceneId: string, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedId) {
      // Range select
      const startIdx = sceneIds.indexOf(lastSelectedId);
      const endIdx = sceneIds.indexOf(sceneId);
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      const rangeIds = sceneIds.slice(from, to + 1);
      setSelectedScenes(new Set([...selectedScenes, ...rangeIds]));
    } else if (event.metaKey || event.ctrlKey) {
      // Toggle select
      const newSelection = new Set(selectedScenes);
      if (newSelection.has(sceneId)) {
        newSelection.delete(sceneId);
      } else {
        newSelection.add(sceneId);
      }
      setSelectedScenes(newSelection);
      setLastSelectedId(sceneId);
    } else {
      // Single select or clear
      if (selectedScenes.has(sceneId) && selectedScenes.size === 1) {
        // Clicking selected item clears selection
        setSelectedScenes(new Set());
        setLastSelectedId(null);
      } else {
        setSelectedScenes(new Set([sceneId]));
        setLastSelectedId(sceneId);
      }
    }
  }, [sceneIds, selectedScenes, lastSelectedId]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedScenes(new Set());
    setLastSelectedId(null);
  }, []);

  // Keyboard handler for Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedScenes.size > 0) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScenes.size, clearSelection]);

  return {
    selectedScenes,
    selectedCount: selectedScenes.size,
    isSelected: (sceneId: string) => selectedScenes.has(sceneId),
    handleSelect,
    clearSelection,
  };
}
