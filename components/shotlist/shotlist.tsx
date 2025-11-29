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
  ArrowLeft,
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
  onBackToEditor: () => void;
}

export function Shotlist({
  screenplayId,
  scenesWithShots,
  onShotsChange,
  onSceneClick,
  onBackToEditor,
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

  const totalShots = scenesWithShots.reduce(
    (acc, scene) => acc + scene.shots.length,
    0
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToEditor}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Script
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-semibold">Shotlist</h1>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalShots} shot{totalShots !== 1 ? "s" : ""} across{" "}
          {scenesWithShots.length} scene{scenesWithShots.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Scene list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {scenesWithShots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clapperboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No scenes found in this screenplay.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
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
                <div className="border rounded-lg overflow-hidden">
                  {/* Scene header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {expandedScenes.has(scene.sceneId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <button
                      onClick={() => onSceneClick(scene.sceneId)}
                      className="flex-1 text-left hover:underline"
                    >
                      <span className="font-medium text-sm">
                        Scene {scene.sceneNumber}
                      </span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {scene.sceneHeading}
                      </span>
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {scene.shots.length} shot{scene.shots.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddShot(scene.sceneId)}
                      className="h-7 gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {/* Shots */}
                  <CollapsibleContent>
                    <div className="p-3 space-y-2">
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
