import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { CustomCardGroup, GroupColor } from '@/types/index-cards';

interface UseCardGroupsOptions {
  screenplayId: string;
  enabled?: boolean;
}

interface UseCardGroupsResult {
  groups: CustomCardGroup[];
  isLoading: boolean;
  error: Error | null;
  createGroup: (name: string, color?: GroupColor) => Promise<CustomCardGroup | null>;
  updateGroup: (groupId: string, updates: Partial<Pick<CustomCardGroup, 'name' | 'color' | 'order'>>) => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  reorderGroups: (groups: CustomCardGroup[]) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing custom card groups
 * Handles CRUD operations and caching
 */
export function useCardGroups({ screenplayId, enabled = true }: UseCardGroupsOptions): UseCardGroupsResult {
  const [groups, setGroups] = useState<CustomCardGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch groups from API
  const fetchGroups = useCallback(async () => {
    if (!enabled || !screenplayId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/card-groups`);

      if (!response.ok) {
        throw new Error('Failed to fetch card groups');
      }

      const data = await response.json();
      setGroups(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to fetch card groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, [screenplayId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Create a new group
  const createGroup = useCallback(
    async (name: string, color: GroupColor = 'blue'): Promise<CustomCardGroup | null> => {
      if (!screenplayId) return null;

      try {
        const maxOrder = groups.length > 0 ? Math.max(...groups.map((g) => g.order)) : -1;

        const response = await fetch(`/api/screenplays/${screenplayId}/card-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            color,
            order: maxOrder + 1,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create card group');
        }

        const newGroup = await response.json();

        // Optimistically update local state
        setGroups((prev) => [...prev, newGroup]);

        toast.success(`Created "${name}" group`);

        return newGroup;
      } catch (err) {
        console.error('Failed to create card group:', err);
        toast.error('Failed to create group');
        return null;
      }
    },
    [screenplayId, groups]
  );

  // Update a group
  const updateGroup = useCallback(
    async (
      groupId: string,
      updates: Partial<Pick<CustomCardGroup, 'name' | 'color' | 'order'>>
    ): Promise<boolean> => {
      if (!screenplayId) return false;

      // Optimistic update
      const previousGroups = [...groups];
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                ...updates,
                updatedAt: new Date(),
              }
            : g
        )
      );

      try {
        const response = await fetch(`/api/screenplays/${screenplayId}/card-groups/${groupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update card group');
        }

        const updatedGroup = await response.json();

        // Update with server response
        setGroups((prev) => prev.map((g) => (g.id === groupId ? updatedGroup : g)));

        return true;
      } catch (err) {
        console.error('Failed to update card group:', err);

        // Rollback on error
        setGroups(previousGroups);

        toast.error('Failed to update group');

        return false;
      }
    },
    [screenplayId, groups]
  );

  // Delete a group
  const deleteGroup = useCallback(
    async (groupId: string): Promise<boolean> => {
      if (!screenplayId) return false;

      // Optimistic update
      const previousGroups = [...groups];
      setGroups((prev) => prev.filter((g) => g.id !== groupId));

      try {
        const response = await fetch(`/api/screenplays/${screenplayId}/card-groups/${groupId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete card group');
        }

        toast.success('Group deleted');

        return true;
      } catch (err) {
        console.error('Failed to delete card group:', err);

        // Rollback on error
        setGroups(previousGroups);

        toast.error('Failed to delete group');

        return false;
      }
    },
    [screenplayId, groups]
  );

  // Reorder groups (bulk update)
  const reorderGroups = useCallback(
    async (reorderedGroups: CustomCardGroup[]): Promise<boolean> => {
      if (!screenplayId) return false;

      // Optimistic update
      const previousGroups = [...groups];
      setGroups(reorderedGroups);

      try {
        const updates = reorderedGroups.map((group, index) => ({
          id: group.id,
          order: index,
        }));

        const response = await fetch(`/api/screenplays/${screenplayId}/card-groups`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to reorder card groups');
        }

        return true;
      } catch (err) {
        console.error('Failed to reorder card groups:', err);

        // Rollback on error
        setGroups(previousGroups);

        toast.error('Failed to reorder groups');

        return false;
      }
    },
    [screenplayId, groups]
  );

  return {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    refresh: fetchGroups,
  };
}
