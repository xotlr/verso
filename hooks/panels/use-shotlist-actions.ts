import { useCallback } from 'react';
import type { Shot, SceneWithShots } from '@/types/shotlist';

interface UseShotlistActionsOptions {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  onShotsChange?: (shots: Shot[]) => void;
}

/**
 * Hook for shotlist CRUD actions.
 * Handles delete, duplicate, and reorder operations.
 */
export function useShotlistActions({
  screenplayId,
  scenesWithShots,
  onShotsChange,
}: UseShotlistActionsOptions) {
  const handleDeleteShot = useCallback(
    async (shotId: string) => {
      if (!confirm('Delete this shot?')) return;

      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots/${shotId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) throw new Error('Failed to delete shot');

        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange?.(allShots.filter((s) => s.id !== shotId));
      } catch (error) {
        console.error('Error deleting shot:', error);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  const handleDuplicateShot = useCallback(
    async (shot: Shot) => {
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneId: shot.sceneId,
              description: shot.description,
              shotType: shot.shotType,
              cameraAngle: shot.cameraAngle,
              movement: shot.movement,
              duration: shot.duration,
              lens: shot.lens,
              equipment: shot.equipment,
              lighting: shot.lighting,
              audio: shot.audio,
              notes: shot.notes,
              status: 'planned',
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to duplicate shot');

        const newShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange?.([...allShots, newShot]);
      } catch (error) {
        console.error('Error duplicating shot:', error);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  const reorderShots = useCallback(
    async (sceneId: string, oldIndex: number, newIndex: number) => {
      const scene = scenesWithShots.find((s) => s.sceneId === sceneId);
      if (!scene) return;

      // Reorder locally
      const reorderedShots = [...scene.shots];
      const [movedShot] = reorderedShots.splice(oldIndex, 1);
      reorderedShots.splice(newIndex, 0, movedShot);

      // Update shot numbers
      const updatedShots = reorderedShots.map((shot, idx) => ({
        ...shot,
        shotNumber: idx + 1,
      }));

      // Merge with other scenes' shots
      const allShots = scenesWithShots.flatMap((s) =>
        s.sceneId === sceneId ? updatedShots : s.shots
      );
      onShotsChange?.(allShots);

      // Persist to server
      try {
        await fetch(
          `/api/screenplays/${screenplayId}/scenes/${sceneId}/shots/reorder`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shotIds: updatedShots.map((s) => s.id),
            }),
          }
        );
      } catch (error) {
        console.error('Error reordering shots:', error);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  return {
    handleDeleteShot,
    handleDuplicateShot,
    reorderShots,
  };
}

export type ShotlistActions = ReturnType<typeof useShotlistActions>;
