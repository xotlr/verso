import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { DetectedShot, Shot } from "@/types/shotlist";

interface UseShotManagementOptions {
  screenplayId: string;
  initialShots?: Shot[];
}

interface UseShotManagementReturn {
  shots: Shot[];
  setShots: React.Dispatch<React.SetStateAction<Shot[]>>;
  shotEditorOpen: boolean;
  setShotEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingShot: Shot | null;
  addingToScene: string | null;
  pendingDetectedShot: DetectedShot | null;
  handleShotsChange: (updatedShots: Shot[]) => void;
  handleAddShot: (sceneId: string) => void;
  handleEditShot: (shot: Shot) => void;
  handleAddDetectedShot: (detected: DetectedShot) => void;
  handleSaveShot: (shotData: Partial<Shot>) => Promise<void>;
}

export function useShotManagement({
  screenplayId,
  initialShots = [],
}: UseShotManagementOptions): UseShotManagementReturn {
  const [shots, setShots] = useState<Shot[]>(initialShots);
  const [shotEditorOpen, setShotEditorOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [addingToScene, setAddingToScene] = useState<string | null>(null);
  const [pendingDetectedShot, setPendingDetectedShot] = useState<DetectedShot | null>(null);

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

  // Handle saving a shot (create or update)
  const handleSaveShot = useCallback(
    async (shotData: Partial<Shot>) => {
      try {
        if (editingShot) {
          // Update existing shot
          const response = await fetch(
            `/api/screenplays/${screenplayId}/shots/${editingShot.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(shotData),
            }
          );
          if (!response.ok) throw new Error("Failed to update shot");
          const updatedShot = await response.json();
          setShots((prev) => prev.map((s) => (s.id === updatedShot.id ? updatedShot : s)));
          toast.success("Shot updated");
        } else if (addingToScene) {
          // Create new shot
          const response = await fetch(`/api/screenplays/${screenplayId}/shots`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...shotData, sceneId: addingToScene }),
          });
          if (!response.ok) throw new Error("Failed to create shot");
          const newShot = await response.json();
          setShots((prev) => [...prev, newShot]);
          toast.success("Shot added");
        }
        setShotEditorOpen(false);
        setEditingShot(null);
        setAddingToScene(null);
        setPendingDetectedShot(null);
      } catch (error) {
        console.error("Error saving shot:", error);
        toast.error("Failed to save shot");
      }
    },
    [screenplayId, editingShot, addingToScene]
  );

  return {
    shots,
    setShots,
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
  };
}
