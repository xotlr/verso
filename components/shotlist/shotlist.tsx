"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SceneWithShots, Shot, DetectedShot } from "@/types/shotlist";
import { getShotDisplayName, type DetectedShotType } from "@/lib/screenplay/patterns";
import { useSettings } from "@/contexts/settings-context";
import { formatShotLabel } from "@/lib/shotlist/format";
import { useDetectedShots } from "@/hooks/shotlist";
import { Badge } from "@/components/ui/badge";
import { SortableShotCard } from "./sortable-shot-card";
import { ShotEditor } from "./shot-editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Clapperboard,
  Camera,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShotlistProps {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  detectedShots?: DetectedShot[];
  onShotsChange: (shots: Shot[]) => void;
  onSceneClick: (sceneId: string) => void;
}

export function Shotlist({
  screenplayId,
  scenesWithShots,
  detectedShots = [],
  onShotsChange,
  onSceneClick,
}: ShotlistProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
    new Set(scenesWithShots.map((s) => s.sceneId))
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [addingToScene, setAddingToScene] = useState<string | null>(null);
  const [deletingShot, setDeletingShot] = useState<Shot | null>(null);
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  const { settings } = useSettings();
  const { numberFormat, detection } = settings.shotlist;
  const showDetectedShots = detection.enabled && detection.showSuggestions;

  // Detected shots management
  const {
    getDetectedShotsForScene,
    isAlreadySaved,
    handleAddDetectedShot,
    unsavedCount: unsavedDetectedCount,
    handleApplyAllDetected: applyAllDetected,
  } = useDetectedShots({
    screenplayId,
    scenesWithShots,
    detectedShots,
    onShotsChange,
  });

  // Wrap apply all with loading state
  const handleApplyAllDetected = useCallback(async () => {
    setIsApplyingAll(true);
    try {
      await applyAllDetected();
    } finally {
      setIsApplyingAll(false);
    }
  }, [applyAllDetected]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering shots within a scene
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      // Find which scene the shot belongs to
      const scene = scenesWithShots.find((s) =>
        s.shots.some((shot) => shot.id === active.id)
      );

      if (!scene) return;

      const oldIndex = scene.shots.findIndex((shot) => shot.id === active.id);
      const newIndex = scene.shots.findIndex((shot) => shot.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically update the UI
      const reorderedShots = arrayMove(scene.shots, oldIndex, newIndex);
      const updatedSceneShots = reorderedShots.map((shot, index) => ({
        ...shot,
        shotNumber: index + 1,
      }));

      // Update all shots with the new order
      const allShots = scenesWithShots.flatMap((s) =>
        s.sceneId === scene.sceneId ? updatedSceneShots : s.shots
      );
      onShotsChange(allShots);

      // Persist to database
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots/reorder`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sceneId: scene.sceneId,
              shotIds: reorderedShots.map((s) => s.id),
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save order");
        }
      } catch {
        // Revert on error
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange(allShots);
        toast.error("Failed to reorder shots");
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  // Create a map of global shot indices for global-sequential format
  const globalShotIndices = useMemo(() => {
    const indices = new Map<string, number>();
    let globalIndex = 1;
    for (const scene of scenesWithShots) {
      for (const shot of scene.shots) {
        indices.set(shot.id, globalIndex);
        globalIndex++;
      }
    }
    return indices;
  }, [scenesWithShots]);

  // Format shot number based on settings
  const getDisplayNumber = useCallback(
    (shot: Shot, sceneNumber: number) => {
      if (numberFormat === 'global-sequential') {
        const globalIndex = globalShotIndices.get(shot.id) ?? shot.shotNumber;
        return String(globalIndex);
      }
      return formatShotLabel(shot.shotNumber, sceneNumber, numberFormat);
    },
    [numberFormat, globalShotIndices]
  );

  const toggleScene = useCallback((sceneId: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  }, []);

  const handleAddShot = useCallback((sceneId: string) => {
    setAddingToScene(sceneId);
    setEditingShot(null);
    setEditorOpen(true);
  }, []);

  const handleEditShot = useCallback((shot: Shot) => {
    setEditingShot(shot);
    setAddingToScene(null);
    setEditorOpen(true);
  }, []);

  const handleSaveShot = useCallback(
    async (shotData: Partial<Shot>) => {
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update shot");
        }

        const updatedShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        const newShots = allShots.map((s) =>
          s.id === updatedShot.id ? updatedShot : s
        );
        onShotsChange(newShots);
        toast.success("Shot updated");
      } else if (addingToScene) {
        // Create new shot
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...shotData,
              sceneId: addingToScene,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create shot");
        }

        const newShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange([...allShots, newShot]);
        toast.success("Shot added");
      }

      setEditorOpen(false);
      setEditingShot(null);
      setAddingToScene(null);
    },
    [screenplayId, editingShot, addingToScene, scenesWithShots, onShotsChange]
  );

  const confirmDeleteShot = useCallback(async () => {
    if (!deletingShot) return;

    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/shots/${deletingShot.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete shot");
      }

      const allShots = scenesWithShots.flatMap((s) => s.shots);
      onShotsChange(allShots.filter((s) => s.id !== deletingShot.id));
      toast.success("Shot deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete shot";
      toast.error(message);
    } finally {
      setDeletingShot(null);
    }
  }, [screenplayId, scenesWithShots, onShotsChange, deletingShot]);

  const handleDuplicateShot = useCallback(
    async (shot: Shot) => {
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
              status: "planned",
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to duplicate shot");
        }

        const newShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange([...allShots, newShot]);
        toast.success("Shot duplicated");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to duplicate shot";
        toast.error(message);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  // Get effective count for display (only when feature is enabled)
  const displayedUnsavedCount = showDetectedShots ? unsavedDetectedCount : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Screen reader instructions for drag-and-drop */}
      <div id="shotlist-drag-instructions" className="sr-only">
        Press Space or Enter to start dragging. Use arrow keys to move. Press Space or Enter to drop, or Escape to cancel.
      </div>

      {/* Apply All for detected shots */}
      {showDetectedShots && displayedUnsavedCount > 0 && (
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {displayedUnsavedCount} shot{displayedUnsavedCount !== 1 ? 's' : ''} detected from script
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleApplyAllDetected}
            disabled={isApplyingAll}
            className="gap-1.5"
          >
            {isApplyingAll ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add All
              </>
            )}
          </Button>
        </div>
      )}

      {/* Scene list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {scenesWithShots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg border border-border/60">
              <Clapperboard className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="font-semibold text-foreground">
                No scenes found in this screenplay
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add scene headings in the Editor to organize shots.
              </p>
            </div>
          ) : (
            scenesWithShots.map((scene) => (
              <Collapsible
                key={scene.sceneId}
                open={expandedScenes.has(scene.sceneId)}
                onOpenChange={() => toggleScene(scene.sceneId)}
              >
                <div className="bg-card rounded-lg border border-border/60 hover:border-border hover:shadow-sm transition-all duration-300 overflow-hidden">
                  {/* Scene header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        {expandedScenes.has(scene.sceneId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <button
                      onClick={() => onSceneClick(scene.sceneId)}
                      className="flex-1 text-left hover:text-primary transition-colors"
                    >
                      <span className="font-bold text-sm uppercase">
                        Scene {scene.sceneNumber}
                      </span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {scene.sceneHeading}
                      </span>
                    </button>
                    <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      {scene.shots.length} shot{scene.shots.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddShot(scene.sceneId)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {/* Shots */}
                  <CollapsibleContent>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {scene.shots.length === 0 && getDetectedShotsForScene(scene.sceneId).length === 0 ? (
                        <button
                          onClick={() => handleAddShot(scene.sceneId)}
                          className={cn(
                            "col-span-full py-8 border-2 border-dashed rounded-lg",
                            "text-muted-foreground hover:text-foreground",
                            "hover:border-primary/50 transition-colors",
                            "flex flex-col items-center gap-2"
                          )}
                        >
                          <Plus className="h-5 w-5" />
                          <span className="text-sm">Add first shot</span>
                        </button>
                      ) : (
                        <>
                          {/* Saved shots - sortable */}
                          <SortableContext
                            items={scene.shots.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {scene.shots.map((shot) => (
                              <SortableShotCard
                                key={shot.id}
                                shot={shot}
                                displayNumber={getDisplayNumber(shot, scene.sceneNumber)}
                                onEdit={() => handleEditShot(shot)}
                                onDelete={() => setDeletingShot(shot)}
                                onDuplicate={() => handleDuplicateShot(shot)}
                              />
                            ))}
                          </SortableContext>

                          {/* Detected shots (suggestions) */}
                          {showDetectedShots && getDetectedShotsForScene(scene.sceneId).filter(
                            detected => !isAlreadySaved(detected, scene.shots)
                          ).length > 0 && (
                            <div className="col-span-full mt-4 pt-4 border-t border-dashed border-border/50">
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium text-muted-foreground">
                                  Detected from script
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {getDetectedShotsForScene(scene.sceneId)
                                  .filter(detected => !isAlreadySaved(detected, scene.shots))
                                  .map((detected) => (
                                    <div
                                      key={detected.id}
                                      className={cn(
                                        'flex items-start gap-3 p-3 rounded-lg',
                                        'border border-dashed border-amber-500/30',
                                        'bg-amber-500/5 hover:bg-amber-500/10',
                                        'transition-colors group'
                                      )}
                                    >
                                      {/* Shot type icon */}
                                      <div className="w-8 h-8 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <Camera className="h-4 w-4 text-amber-600" />
                                      </div>

                                      {/* Shot content */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm break-words line-clamp-2">
                                          {detected.subject || detected.lineContent}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <Badge
                                            variant="outline"
                                            className="text-xs px-2 py-0 border-amber-500/30 text-amber-600"
                                          >
                                            {getShotDisplayName(detected.shotType as DetectedShotType)}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Add button */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 gap-1 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50"
                                        onClick={() => handleAddDetectedShot(detected)}
                                      >
                                        <Plus className="h-3 w-3" />
                                        Add
                                      </Button>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
          </div>
        </ScrollArea>
      </DndContext>

      {/* Shot editor dialog */}
      <ShotEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        shot={editingShot}
        onSave={handleSaveShot}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingShot} onOpenChange={(open) => !open && setDeletingShot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete shot #{deletingShot?.shotNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteShot} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
