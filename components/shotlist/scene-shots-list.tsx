"use client";

import { useState, useEffect, useCallback } from "react";
import { Shot, SHOT_STATUS_COLORS, ShotStatus } from "@/types/shotlist";
import { ShotEditor } from "./shot-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clapperboard, Plus, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SceneShotsListProps {
  screenplayId: string;
  sceneId: string;
}

export function SceneShotsList({ screenplayId, sceneId }: SceneShotsListProps) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);

  // Fetch shots for this scene
  const fetchShots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/screenplays/${screenplayId}/shots`);
      if (response.ok) {
        const data = await response.json();
        const sceneShots = (data.shots || []).filter(
          (s: Shot) => s.sceneId === sceneId
        );
        setShots(sceneShots);
      }
    } catch (error) {
      console.error("Error fetching shots:", error);
    } finally {
      setLoading(false);
    }
  }, [screenplayId, sceneId]);

  useEffect(() => {
    fetchShots();
  }, [fetchShots]);

  const handleAddShot = () => {
    setEditingShot(null);
    setEditorOpen(true);
  };

  const handleEditShot = (shot: Shot) => {
    setEditingShot(shot);
    setEditorOpen(true);
  };

  const handleSaveShot = async (shotData: Partial<Shot>) => {
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
        if (response.ok) {
          const updatedShot = await response.json();
          setShots((prev) =>
            prev.map((s) => (s.id === updatedShot.id ? updatedShot : s))
          );
        }
      } else {
        // Create new shot
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...shotData,
              sceneId,
            }),
          }
        );
        if (response.ok) {
          const newShot = await response.json();
          setShots((prev) => [...prev, newShot]);
        }
      }
      setEditorOpen(false);
      setEditingShot(null);
    } catch (error) {
      console.error("Error saving shot:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Shots</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {shots.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-7" onClick={handleAddShot}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {shots.length === 0 ? (
        <button
          onClick={handleAddShot}
          className={cn(
            "w-full py-4 border border-dashed rounded-lg",
            "text-sm text-muted-foreground hover:text-foreground",
            "hover:border-primary/50 transition-colors"
          )}
        >
          No shots yet. Click to add one.
        </button>
      ) : (
        <div className="space-y-1.5">
          {shots.slice(0, 5).map((shot) => (
            <button
              key={shot.id}
              onClick={() => handleEditShot(shot)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-md text-left",
                "bg-muted/50 hover:bg-muted transition-colors"
              )}
            >
              <span className="flex-shrink-0 w-5 h-5 rounded bg-background flex items-center justify-center text-xs font-medium">
                {shot.shotNumber}
              </span>
              <span className="flex-1 text-sm truncate">{shot.description}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs h-5",
                  SHOT_STATUS_COLORS[shot.status as ShotStatus]
                )}
              >
                {shot.status}
              </Badge>
            </button>
          ))}
          {shots.length > 5 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              +{shots.length - 5} more shots
            </p>
          )}
        </div>
      )}

      <Link
        href={`/shotlist/${screenplayId}`}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-2",
          "text-sm text-muted-foreground hover:text-foreground",
          "border rounded-md hover:bg-muted/50 transition-colors"
        )}
      >
        <ExternalLink className="h-3 w-3" />
        Open full shotlist
      </Link>

      <ShotEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        shot={editingShot}
        onSave={handleSaveShot}
      />
    </div>
  );
}
