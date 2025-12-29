'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { DetectedShot, Shot, SceneWithShots } from '@/types/shotlist';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';

interface UseShotManagementOptions {
  screenplayId: string;
  sceneInfos: SceneInfo[];
}

interface UseShotManagementReturn {
  shots: Shot[];
  setShots: React.Dispatch<React.SetStateAction<Shot[]>>;
  scenesWithShots: SceneWithShots[];
  shotEditorOpen: boolean;
  setShotEditorOpen: (open: boolean) => void;
  editingShot: Shot | null;
  addingToScene: string | null;
  pendingDetectedShot: DetectedShot | null;
  handleShotsChange: (updatedShots: Shot[]) => void;
  handleAddShot: (sceneId: string) => void;
  handleEditShot: (shot: Shot) => void;
  handleAddDetectedShot: (detected: DetectedShot) => void;
  handleSaveShot: (shotData: Partial<Shot>) => Promise<void>;
  closeShotEditor: () => void;
}

/**
 * Helper to group shots by scene
 */
function groupShotsByScene(scenes: SceneInfo[], shots: Shot[]): SceneWithShots[] {
  return scenes.map((scene, index) => ({
    sceneId: scene.id,
    sceneHeading: `${scene.type}. ${scene.location} - ${scene.timeOfDay}`,
    sceneNumber: index + 1,
    shots: shots.filter(shot => shot.sceneId === scene.id),
  }));
}

/**
 * Custom hook for managing shots in a screenplay.
 * Handles CRUD operations, shot editor state, and grouping shots by scene.
 */
export function useShotManagement({
  screenplayId,
  sceneInfos,
}: UseShotManagementOptions): UseShotManagementReturn {
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotEditorOpen, setShotEditorOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [addingToScene, setAddingToScene] = useState<string | null>(null);
  const [pendingDetectedShot, setPendingDetectedShot] = useState<DetectedShot | null>(null);

  // Derive scenesWithShots from sceneInfos and shots (no state needed)
  // Using useMemo instead of state+effect eliminates a render cycle
  const scenesWithShots = useMemo(() => {
    if (sceneInfos.length === 0) return [];
    return groupShotsByScene(sceneInfos, shots);
  }, [sceneInfos, shots]);

  // Handle shots changes from the shotlist panel
  const handleShotsChange = useCallback((updatedShots: Shot[]) => {
    setShots(updatedShots);
  }, []);

  // Handle adding a new shot
  const handleAddShot = useCallback((sceneId: string) => {
    setAddingToScene(sceneId);
    setEditingShot(null);
    setPendingDetectedShot(null);
    setShotEditorOpen(true);
  }, []);

  // Handle editing an existing shot
  const handleEditShot = useCallback((shot: Shot) => {
    setEditingShot(shot);
    setAddingToScene(null);
    setPendingDetectedShot(null);
    setShotEditorOpen(true);
  }, []);

  // Handle adding a detected shot (opens editor with pre-filled data)
  const handleAddDetectedShot = useCallback((detected: DetectedShot) => {
    setAddingToScene(detected.sceneId);
    setPendingDetectedShot(detected);
    setEditingShot(null);
    setShotEditorOpen(true);
  }, []);

  // Close the shot editor and reset state
  const closeShotEditor = useCallback(() => {
    setShotEditorOpen(false);
    setEditingShot(null);
    setAddingToScene(null);
    setPendingDetectedShot(null);
  }, []);

  // Handle saving a shot (create or update)
  const handleSaveShot = useCallback(async (shotData: Partial<Shot>) => {
    try {
      if (editingShot) {
        // Update existing shot
        const response = await fetch(`/api/screenplays/${screenplayId}/shots/${editingShot.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shotData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update shot");
        }
        const updatedShot = await response.json();
        setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));
        toast.success("Shot updated");
      } else if (addingToScene) {
        // Create new shot
        const response = await fetch(`/api/screenplays/${screenplayId}/shots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...shotData, sceneId: addingToScene }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create shot");
        }
        const newShot = await response.json();
        setShots(prev => [...prev, newShot]);
        toast.success("Shot added");
      }
      closeShotEditor();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save shot";
      toast.error(message);
    }
  }, [screenplayId, editingShot, addingToScene, closeShotEditor]);

  return {
    shots,
    setShots,
    scenesWithShots,
    shotEditorOpen,
    setShotEditorOpen,
    editingShot,
    addingToScene,
    pendingDetectedShot,
    handleShotsChange,
    handleAddShot,
    handleEditShot,
    handleAddDetectedShot,
    handleSaveShot,
    closeShotEditor,
  };
}
