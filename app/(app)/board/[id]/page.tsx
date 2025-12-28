"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { BeatBoard } from "@/components/beat-board";
import { PageLayout } from "@/components/layouts/page-layout";
import { Scene, Location } from "@/types/screenplay";
import { ActId, SceneMeta, ActConfig, DEFAULT_ACTS } from "@/types/beat-board";
import { deserializeFromStorage } from "@/lib/prosemirror/serialization";
import { extractScenes } from "@/hooks/editor/document-extractors";
import type { SceneInfo } from "@/hooks/editor/types";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";

// Convert SceneInfo from document extractor to Scene type
function convertToScene(info: SceneInfo, index: number): Scene {
  const locationType = (info.type || 'INT') as 'INT' | 'EXT' | 'INT/EXT';
  const location: Location = {
    id: `loc-${info.id}`,
    name: info.location || 'UNKNOWN',
    type: locationType,
    color: '#888888',
  };

  const heading = `${locationType}. ${info.location || 'UNKNOWN'}${info.timeOfDay ? ` - ${info.timeOfDay}` : ''}`;
  const normalizedTime = normalizeTimeOfDay(info.timeOfDay);

  return {
    id: info.id,
    number: info.sceneNumber ? parseInt(info.sceneNumber) : index + 1,
    heading,
    location,
    timeOfDay: normalizedTime,
    elements: [],
    characters: [],
  };
}

function normalizeTimeOfDay(time: string | undefined): 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' {
  if (!time) return 'DAY';
  const upper = time.toUpperCase();
  if (upper.includes('NIGHT')) return 'NIGHT';
  if (upper.includes('DAWN') || upper.includes('MORNING')) return 'DAWN';
  if (upper.includes('DUSK') || upper.includes('EVENING') || upper.includes('SUNSET')) return 'DUSK';
  if (upper.includes('CONTINUOUS') || upper.includes('CONT')) return 'CONTINUOUS';
  return 'DAY';
}

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneMetas, setSceneMetas] = useState<Record<string, SceneMeta>>({});
  const [acts, setActs] = useState<ActConfig[]>(DEFAULT_ACTS);
  const [title, setTitle] = useState("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch screenplay and scene metadata
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch screenplay
        const screenplayResponse = await fetch(`/api/screenplays/${id}`);
        if (!screenplayResponse.ok) throw new Error('Failed to fetch screenplay');

        const data = await screenplayResponse.json();
        setTitle(data.title || "Untitled Screenplay");

        // Parse content and extract scenes
        if (data.content) {
          const doc = deserializeFromStorage(data.content);
          const sceneInfos = extractScenes(doc);
          const parsedScenes = sceneInfos.map((info, index) => convertToScene(info, index));
          setScenes(parsedScenes);
        }

        // Fetch all scene metadata
        const metaResponse = await fetch(`/api/screenplays/${id}/scenes/meta`);
        if (metaResponse.ok) {
          const metas = await metaResponse.json();
          setSceneMetas(metas);
        }

        // Fetch acts configuration
        const actsResponse = await fetch(`/api/screenplays/${id}/acts`);
        if (actsResponse.ok) {
          const actsData = await actsResponse.json();
          if (Array.isArray(actsData) && actsData.length > 0) {
            setActs(actsData);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setTitle("Untitled Screenplay");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Dispatch title update for app header
  useEffect(() => {
    if (title && title !== "Loading...") {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title }
      }));
    }
  }, [title]);

  // Handle act changes - update database
  const handleActChange = useCallback(async (sceneId: string, act: ActId | null) => {
    // Optimistic update
    setSceneMetas(prev => ({
      ...prev,
      [sceneId]: {
        ...prev[sceneId],
        color: prev[sceneId]?.color || null,
        notes: prev[sceneId]?.notes || null,
        mood: prev[sceneId]?.mood || null,
        act,
      }
    }));

    // Save to database
    try {
      await fetch(`/api/screenplays/${id}/scenes/${sceneId}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ act }),
      });
    } catch (error) {
      console.error('Failed to save act change:', error);
      // Could revert optimistic update here if needed
    }
  }, [id]);

  // Handle acts configuration changes - update database
  const handleActsChange = useCallback(async (newActs: ActConfig[]) => {
    // Optimistic update
    setActs(newActs);

    // Save to database
    try {
      await fetch(`/api/screenplays/${id}/acts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActs),
      });
    } catch (error) {
      console.error('Failed to save acts change:', error);
      // Could revert optimistic update here if needed
    }
  }, [id]);

  const handleSceneClick = useCallback((sceneId: string) => {
    router.push(`/screenplay/${id}?scene=${sceneId}`);
  }, [router, id]);

  const handleBackToEditor = useCallback(() => {
    router.push(`/screenplay/${id}`);
  }, [router, id]);

  // Count scenes by act for stats
  const actCounts = scenes.reduce((counts, scene) => {
    const act = sceneMetas[scene.id]?.act || 'unassigned';
    counts[act] = (counts[act] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const assignedCount = scenes.length - (actCounts.unassigned || 0);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Structure"
        description="Organize your scenes into acts"
        backHref={`/screenplay/${id}`}
        stats={<span>{assignedCount} of {scenes.length} scene{scenes.length !== 1 ? 's' : ''} assigned</span>}
      />

      {/* Board Content */}
      {scenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-2">No scenes found in this screenplay</p>
          <p className="text-sm text-muted-foreground">
            Add scene headings (e.g., INT. LOCATION - DAY) in the editor first
          </p>
        </div>
      ) : (
        <BeatBoard
          scenes={scenes}
          sceneMetas={sceneMetas}
          acts={acts}
          onActChange={handleActChange}
          onActsChange={handleActsChange}
          onSceneClick={handleSceneClick}
        />
      )}
    </PageLayout>
  );
}
