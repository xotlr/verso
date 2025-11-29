"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProjectLayout } from "@/components/layouts/project-layout";
import { Shotlist } from "@/components/shotlist/shotlist";
import { parseScreenplayText } from "@/lib/screenplay-utils";
import { Shot, SceneWithShots } from "@/types/shotlist";
import { Scene } from "@/types/screenplay";
import { Loader2 } from "lucide-react";

export default function ShotlistPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("Untitled Screenplay");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);

  // Fetch screenplay and shots data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch screenplay data and shots in parallel
        const [screenplayRes, shotsRes] = await Promise.all([
          fetch(`/api/screenplays/${id}`),
          fetch(`/api/screenplays/${id}/shots`),
        ]);

        if (!screenplayRes.ok) {
          throw new Error("Failed to load screenplay");
        }

        const screenplay = await screenplayRes.json();
        setDocumentTitle(screenplay.title || "Untitled Screenplay");

        // Parse scenes from screenplay content
        const parsed = parseScreenplayText(screenplay.content || "");
        setScenes(parsed.scenes || []);

        // Load shots
        if (shotsRes.ok) {
          const shotsData = await shotsRes.json();
          setShots(shotsData.shots || []);
        }
      } catch (err) {
        console.error("Error loading shotlist data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleShotsChange = useCallback((newShots: Shot[]) => {
    setShots(newShots);
  }, []);

  const handleSceneClick = useCallback((sceneId: string) => {
    router.push(`/screenplay/${id}?scene=${sceneId}`);
  }, [router, id]);

  const handleBackToEditor = useCallback(() => {
    router.push(`/screenplay/${id}`);
  }, [router, id]);

  // Group shots by scene
  const scenesWithShots: SceneWithShots[] = scenes.map((scene) => ({
    sceneId: scene.id,
    sceneHeading: scene.heading,
    sceneNumber: scene.number,
    shots: shots.filter((shot) => shot.sceneId === scene.id),
  }));

  if (loading) {
    return (
      <ProjectLayout projectId={id} projectTitle={documentTitle}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProjectLayout>
    );
  }

  if (error) {
    return (
      <ProjectLayout projectId={id} projectTitle={documentTitle}>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Try again
          </button>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout projectId={id} projectTitle={documentTitle}>
      <Shotlist
        screenplayId={id}
        scenesWithShots={scenesWithShots}
        onShotsChange={handleShotsChange}
        onSceneClick={handleSceneClick}
        onBackToEditor={handleBackToEditor}
      />
    </ProjectLayout>
  );
}
