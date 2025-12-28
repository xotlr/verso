"use client";

import { useState, useCallback } from "react";
import { SceneWithShots, Shot } from "@/types/shotlist";
import { ShotCard } from "./shot-card";
import { ShotEditor } from "./shot-editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Clapperboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShotlistProps {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  onShotsChange: (shots: Shot[]) => void;
  onSceneClick: (sceneId: string) => void;
}

export function Shotlist({
  screenplayId,
  scenesWithShots,
  onShotsChange,
  onSceneClick,
}: ShotlistProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
    new Set(scenesWithShots.map((s) => s.sceneId))
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [addingToScene, setAddingToScene] = useState<string | null>(null);

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
          const allShots = scenesWithShots.flatMap((s) => s.shots);
          const newShots = allShots.map((s) =>
            s.id === updatedShot.id ? updatedShot : s
          );
          onShotsChange(newShots);
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

          if (!response.ok) throw new Error("Failed to create shot");

          const newShot = await response.json();
          const allShots = scenesWithShots.flatMap((s) => s.shots);
          onShotsChange([...allShots, newShot]);
        }

        setEditorOpen(false);
        setEditingShot(null);
        setAddingToScene(null);
      } catch (error) {
        console.error("Error saving shot:", error);
      }
    },
    [screenplayId, editingShot, addingToScene, scenesWithShots, onShotsChange]
  );

  const handleDeleteShot = useCallback(
    async (shotId: string) => {
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots/${shotId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) throw new Error("Failed to delete shot");

        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange(allShots.filter((s) => s.id !== shotId));
      } catch (error) {
        console.error("Error deleting shot:", error);
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

        if (!response.ok) throw new Error("Failed to duplicate shot");

        const newShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange([...allShots, newShot]);
      } catch (error) {
        console.error("Error duplicating shot:", error);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Scene list */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {scenesWithShots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg border border-border/60">
              <Clapperboard className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="font-semibold text-foreground">
                No scenes found in this screenplay
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add scene headings to your script to organize shots.
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
                    <div className="p-4 space-y-3">
                      {scene.shots.length === 0 ? (
                        <button
                          onClick={() => handleAddShot(scene.sceneId)}
                          className={cn(
                            "w-full py-8 border-2 border-dashed rounded-lg",
                            "text-muted-foreground hover:text-foreground",
                            "hover:border-primary/50 transition-colors",
                            "flex flex-col items-center gap-2"
                          )}
                        >
                          <Plus className="h-5 w-5" />
                          <span className="text-sm">Add first shot</span>
                        </button>
                      ) : (
                        scene.shots.map((shot) => (
                          <ShotCard
                            key={shot.id}
                            shot={shot}
                            onEdit={() => handleEditShot(shot)}
                            onDelete={() => handleDeleteShot(shot.id)}
                            onDuplicate={() => handleDuplicateShot(shot)}
                          />
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Shot editor dialog */}
      <ShotEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        shot={editingShot}
        onSave={handleSaveShot}
      />
    </div>
  );
}
