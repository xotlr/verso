import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { SceneWithShots, Shot, DetectedShot } from '@/types/shotlist';

interface UseDetectedShotsOptions {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  detectedShots: DetectedShot[];
  onShotsChange: (shots: Shot[]) => void;
}

interface UseDetectedShotsReturn {
  /** Get detected shots for a specific scene */
  getDetectedShotsForScene: (sceneId: string) => DetectedShot[];
  /** Check if a detected shot is already saved */
  isAlreadySaved: (detected: DetectedShot, savedShots: Shot[]) => boolean;
  /** Add a single detected shot to the database */
  handleAddDetectedShot: (detected: DetectedShot) => Promise<void>;
  /** Get all unsaved detected shots */
  getUnsavedDetectedShots: () => DetectedShot[];
  /** Add all detected shots at once */
  handleApplyAllDetected: () => Promise<void>;
  /** Count of unsaved detected shots */
  unsavedCount: number;
  /** Whether batch add is in progress */
  isApplyingAll: boolean;
  /** Set applying all state */
  setIsApplyingAll: (value: boolean) => void;
}

/**
 * Hook for managing detected shots from script analysis.
 * Handles comparison with saved shots and batch/individual addition.
 */
export function useDetectedShots({
  screenplayId,
  scenesWithShots,
  detectedShots,
  onShotsChange,
}: UseDetectedShotsOptions): Omit<UseDetectedShotsReturn, 'isApplyingAll' | 'setIsApplyingAll'> & {
  isApplyingAll: boolean;
  setIsApplyingAll: React.Dispatch<React.SetStateAction<boolean>>;
} {
  // Get detected shots for a specific scene
  const getDetectedShotsForScene = useCallback(
    (sceneId: string) => {
      return detectedShots.filter((s) => s.sceneId === sceneId);
    },
    [detectedShots]
  );

  // Check if a detected shot is already saved (by comparing content)
  const isAlreadySaved = useCallback(
    (detected: DetectedShot, savedShots: Shot[]) => {
      return savedShots.some(
        (saved) =>
          saved.description
            ?.toLowerCase()
            .includes(detected.lineContent.toLowerCase().slice(0, 30)) ||
          detected.lineContent
            .toLowerCase()
            .includes(saved.description?.toLowerCase() || '')
      );
    },
    []
  );

  // Add a detected shot to the database
  const handleAddDetectedShot = useCallback(
    async (detected: DetectedShot) => {
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneId: detected.sceneId,
              description: detected.subject || detected.lineContent,
              shotType: detected.shotType,
              status: 'planned',
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to add shot');
        }

        const newShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange([...allShots, newShot]);
        toast.success('Shot added from script');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to add shot';
        toast.error(message);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  // Get all unsaved detected shots (not already in database)
  const getUnsavedDetectedShots = useCallback(() => {
    const allSavedShots = scenesWithShots.flatMap((s) => s.shots);
    return detectedShots.filter((detected) => {
      if (!detected.sceneId) return false;
      const sceneShots = allSavedShots.filter(
        (s) => s.sceneId === detected.sceneId
      );
      return !isAlreadySaved(detected, sceneShots);
    });
  }, [detectedShots, scenesWithShots, isAlreadySaved]);

  // Memoized count of unsaved shots
  const unsavedCount = useMemo(
    () => getUnsavedDetectedShots().length,
    [getUnsavedDetectedShots]
  );

  // Add all detected shots at once (requires external state for isApplyingAll)
  const handleApplyAllDetected = useCallback(async () => {
    const unsavedShots = getUnsavedDetectedShots();
    if (unsavedShots.length === 0) {
      toast.info('No new shots to add');
      return;
    }

    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/shots/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shots: unsavedShots.map((detected) => ({
              sceneId: detected.sceneId,
              description: detected.subject || detected.lineContent,
              shotType: detected.shotType,
              status: 'planned',
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add shots');
      }

      const { shots: newShots, count } = await response.json();
      const allShots = scenesWithShots.flatMap((s) => s.shots);
      onShotsChange([...allShots, ...newShots]);
      toast.success(`Added ${count} shot${count !== 1 ? 's' : ''} from script`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add shots';
      toast.error(message);
    }
  }, [screenplayId, scenesWithShots, onShotsChange, getUnsavedDetectedShots]);

  return {
    getDetectedShotsForScene,
    isAlreadySaved,
    handleAddDetectedShot,
    getUnsavedDetectedShots,
    handleApplyAllDetected,
    unsavedCount,
    // These need to be managed by the consuming component
    isApplyingAll: false,
    setIsApplyingAll: () => {},
  };
}
