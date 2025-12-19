import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { StackItem, ScreenplayItem } from './use-workspace-data';

interface UseStackOperationsProps {
  screenplays: ScreenplayItem[];
  stacks: StackItem[];
  setScreenplays: React.Dispatch<React.SetStateAction<ScreenplayItem[]>>;
  setStacks: React.Dispatch<React.SetStateAction<StackItem[]>>;
  loadData: () => Promise<void>;
}

interface UseStackOperationsReturn {
  createStackFromDrop: (draggedId: string, targetId: string) => Promise<StackItem | null>;
  addToStack: (screenplayId: string, stackId: string) => Promise<void>;
  removeFromStack: (screenplayId: string, stackId: string) => Promise<void>;
  dissolveStack: (stackId: string) => Promise<void>;
  renameStack: (stackId: string, name: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for managing stack operations with optimistic updates
 */
export function useStackOperations({
  screenplays,
  stacks,
  setScreenplays,
  setStacks,
  loadData,
}: UseStackOperationsProps): UseStackOperationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Create a stack from drag-and-drop (dragging one screenplay onto another)
   */
  const createStackFromDrop = useCallback(
    async (draggedId: string, targetId: string): Promise<StackItem | null> => {
      setIsLoading(true);
      setError(null);

      // Find the screenplays
      const draggedScreenplay = screenplays.find((s) => s.id === draggedId);
      const targetScreenplay = screenplays.find((s) => s.id === targetId);

      if (!draggedScreenplay || !targetScreenplay) {
        setError(new Error('Screenplay not found'));
        setIsLoading(false);
        return null;
      }

      // Check if target is already in a stack - if so, just add to that stack
      if (targetScreenplay.stackId) {
        await addToStack(draggedId, targetScreenplay.stackId);
        setIsLoading(false);
        return stacks.find((s) => s.id === targetScreenplay.stackId) || null;
      }

      // Optimistic update: create a temp stack in UI
      const tempStackId = `temp-${Date.now()}`;
      const tempStack: StackItem = {
        id: tempStackId,
        name: `${targetScreenplay.title} Stack`,
        updatedAt: new Date().toISOString(),
        screenplays: [
          { id: draggedId, title: draggedScreenplay.title, wordCount: draggedScreenplay.wordCount },
          { id: targetId, title: targetScreenplay.title, wordCount: targetScreenplay.wordCount },
        ],
        _count: { screenplays: 2 },
      };

      // Remove both screenplays from list and add temp stack
      setScreenplays((prev) =>
        prev.filter((s) => s.id !== draggedId && s.id !== targetId)
      );
      setStacks((prev) => [tempStack, ...prev]);

      try {
        const response = await fetch('/api/stacks/create-from-drop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draggedId, targetId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create stack');
        }

        const result = await response.json();

        // Replace temp stack with real one
        setStacks((prev) =>
          prev.map((s) => (s.id === tempStackId ? result.stack : s))
        );

        toast.success('Stack created');
        return result.stack;
      } catch (err) {
        // Rollback: restore screenplays and remove temp stack
        setStacks((prev) => prev.filter((s) => s.id !== tempStackId));
        setScreenplays((prev) => [...prev, draggedScreenplay, targetScreenplay]);

        const error = err instanceof Error ? err : new Error('Failed to create stack');
        setError(error);
        toast.error(error.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [screenplays, stacks, setScreenplays, setStacks]
  );

  /**
   * Add a screenplay to an existing stack
   */
  const addToStack = useCallback(
    async (screenplayId: string, stackId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      const screenplay = screenplays.find((s) => s.id === screenplayId);
      if (!screenplay) {
        setError(new Error('Screenplay not found'));
        setIsLoading(false);
        return;
      }

      // Optimistic update
      setScreenplays((prev) => prev.filter((s) => s.id !== screenplayId));
      setStacks((prev) =>
        prev.map((stack) => {
          if (stack.id === stackId) {
            return {
              ...stack,
              screenplays: [
                ...(stack.screenplays || []),
                { id: screenplayId, title: screenplay.title, wordCount: screenplay.wordCount },
              ],
              _count: { screenplays: (stack._count?.screenplays || 0) + 1 },
              updatedAt: new Date().toISOString(),
            };
          }
          return stack;
        })
      );

      try {
        const response = await fetch(`/api/stacks/${stackId}/screenplays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screenplayIds: [screenplayId] }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add to stack');
        }

        toast.success('Added to stack');
      } catch (err) {
        // Rollback
        setScreenplays((prev) => [...prev, screenplay]);
        setStacks((prev) =>
          prev.map((stack) => {
            if (stack.id === stackId) {
              return {
                ...stack,
                screenplays: (stack.screenplays || []).filter((s) => s.id !== screenplayId),
                _count: { screenplays: Math.max((stack._count?.screenplays || 1) - 1, 0) },
              };
            }
            return stack;
          })
        );

        const error = err instanceof Error ? err : new Error('Failed to add to stack');
        setError(error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [screenplays, setScreenplays, setStacks]
  );

  /**
   * Remove a screenplay from a stack
   */
  const removeFromStack = useCallback(
    async (screenplayId: string, stackId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      const stack = stacks.find((s) => s.id === stackId);
      const screenplay = stack?.screenplays?.find((s) => s.id === screenplayId);

      if (!stack || !screenplay) {
        setError(new Error('Stack or screenplay not found'));
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stacks/${stackId}/screenplays`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screenplayIds: [screenplayId] }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove from stack');
        }

        const result = await response.json();

        // Check if stack was dissolved
        if (result.dissolved) {
          // Reload data to get correct state
          await loadData();
          toast.success('Stack dissolved');
        } else {
          // Update local state
          await loadData();
          toast.success('Removed from stack');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove from stack');
        setError(error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [stacks, loadData]
  );

  /**
   * Dissolve a stack (ungroup all screenplays)
   */
  const dissolveStack = useCallback(
    async (stackId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      const stack = stacks.find((s) => s.id === stackId);
      if (!stack) {
        setError(new Error('Stack not found'));
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stacks/${stackId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to dissolve stack');
        }

        // Reload data to get screenplays back as standalone
        await loadData();
        toast.success('Stack dissolved');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to dissolve stack');
        setError(error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [stacks, loadData]
  );

  /**
   * Rename a stack
   */
  const renameStack = useCallback(
    async (stackId: string, name: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      // Optimistic update
      const originalName = stacks.find((s) => s.id === stackId)?.name;
      setStacks((prev) =>
        prev.map((stack) => (stack.id === stackId ? { ...stack, name } : stack))
      );

      try {
        const response = await fetch(`/api/stacks/${stackId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to rename stack');
        }

        toast.success('Stack renamed');
      } catch (err) {
        // Rollback
        if (originalName) {
          setStacks((prev) =>
            prev.map((stack) =>
              stack.id === stackId ? { ...stack, name: originalName } : stack
            )
          );
        }

        const error = err instanceof Error ? err : new Error('Failed to rename stack');
        setError(error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [stacks, setStacks]
  );

  return {
    createStackFromDrop,
    addToStack,
    removeFromStack,
    dissolveStack,
    renameStack,
    isLoading,
    error,
  };
}
