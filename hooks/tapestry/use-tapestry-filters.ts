/**
 * Tapestry Filters Hook
 *
 * Provides filter matching logic for tapestry nodes.
 */

import { useCallback } from 'react';
import type { TapestryNode, TapestryNodeType } from '@/types/tapestry';
import type { Scene } from '@/types/screenplay';

export interface TapestryFilters {
  types: TapestryNodeType[];
  search: string;
  characters: string[];
}

interface UseTapestryFiltersOptions {
  filters: TapestryFilters;
  scenes: Scene[];
}

interface UseTapestryFiltersReturn {
  nodeMatchesFilters: (node: TapestryNode) => boolean;
}

/**
 * Provides a filter matching function for tapestry nodes.
 */
export function useTapestryFilters({
  filters,
  scenes,
}: UseTapestryFiltersOptions): UseTapestryFiltersReturn {
  const nodeMatchesFilters = useCallback((node: TapestryNode): boolean => {
    // Type filter
    if (!filters.types.includes(node.type || 'note')) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = node.title?.toLowerCase().includes(searchLower);
      const matchesContent = node.content?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesContent) {
        return false;
      }
    }

    // Character filter (only applies to scenes that contain the character)
    if (filters.characters.length > 0) {
      if (node.type === 'scene') {
        // Get scene info to check characters
        const scene = scenes.find(s => s.id === node.sceneId);
        if (scene) {
          const hasCharacter = filters.characters.some(c =>
            scene.characters?.includes(c)
          );
          if (!hasCharacter) {
            return false;
          }
        }
      } else if (node.type === 'character') {
        // Character nodes match if they're in the filter list
        if (!filters.characters.includes(node.title)) {
          return false;
        }
      }
      // Other node types pass through when character filter is active
    }

    return true;
  }, [filters, scenes]);

  return { nodeMatchesFilters };
}
