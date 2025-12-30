"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageLayout } from "@/components/layouts/page-layout";
import { Shotlist } from "@/components/shotlist/shotlist";
import { deserializeFromStorage } from "@/lib/prosemirror/serialization";
import { extractScenes, extractDetectedShotsFromDocument } from "@/hooks/editor/document-extractors";
import type { SceneInfo } from "@/hooks/editor/use-prosemirror-editor";
import { Shot, SceneWithShots, DetectedShot } from "@/types/shotlist";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";

export default function ShotlistPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("Untitled Screenplay");
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [detectedShots, setDetectedShots] = useState<DetectedShot[]>([]);

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

        // Parse scenes from ProseMirror content
        const doc = deserializeFromStorage(screenplay.content);
        const parsedScenes = extractScenes(doc);
        setScenes(parsedScenes);

        // Detect shots from document
        const detected = extractDetectedShotsFromDocument(doc, parsedScenes);
        setDetectedShots(detected);

        // Load shots
        if (shotsRes.ok) {
          const shotsData = await shotsRes.json();
          setShots(shotsData.shots || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Dispatch title update for app header
  useEffect(() => {
    if (documentTitle && documentTitle !== "Untitled Screenplay") {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title: documentTitle }
      }));
    }
  }, [documentTitle]);

  const handleShotsChange = useCallback((newShots: Shot[]) => {
    setShots(newShots);
  }, []);

  const handleSceneClick = useCallback((sceneId: string) => {
    router.push(`/screenplay/${id}?scene=${sceneId}`);
  }, [router, id]);

  // Group shots by scene
  const scenesWithShots: SceneWithShots[] = scenes.map((scene, index) => ({
    sceneId: scene.id,
    sceneHeading: `${scene.type}. ${scene.location}${scene.timeOfDay ? ` - ${scene.timeOfDay}` : ''}`,
    sceneNumber: scene.sceneNumber ? parseInt(scene.sceneNumber, 10) || (index + 1) : (index + 1),
    shots: shots.filter((shot) => shot.sceneId === scene.id),
  }));

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Try again
          </button>
        </div>
      </PageLayout>
    );
  }

  const totalShots = shots.length;

  return (
    <PageLayout>
      <PageHeader
        title="Shotlist"
        description="Plan and organize your shots by scene"
        backHref={`/screenplay/${id}`}
        backLabel="Back to Script"
        stats={
          <span>
            {totalShots} shot{totalShots !== 1 ? 's' : ''} across {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
          </span>
        }
      />
      <Shotlist
        screenplayId={id}
        scenesWithShots={scenesWithShots}
        detectedShots={detectedShots}
        onShotsChange={handleShotsChange}
        onSceneClick={handleSceneClick}
      />
    </PageLayout>
  );
}
