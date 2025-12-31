'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tapestry } from '@/components/tapestry';
import { Scene, Location } from '@/types/screenplay';
import { deserializeFromStorage } from '@/lib/prosemirror/serialization';
import { extractScenes, extractCharacters } from '@/hooks/editor/document-extractors';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/types';
import { normalizeTimeOfDay } from '@/lib/prosemirror/utils/time-detection';
import { ErrorBoundary } from '@/components/error-boundary';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScreenplayData {
  id: string;
  title: string;
  content: string;
}

// Convert SceneInfo from document extractor to Scene type
function convertToScene(info: SceneInfo, index: number): Scene {
  const locationType = (info.type || 'INT') as 'INT' | 'EXT' | 'INT/EXT';
  const location: Location = {
    id: `loc-${info.id}`,
    name: info.location || 'UNKNOWN',
    type: locationType,
    color: '#888888',
  };
  const heading = `${locationType}. ${info.location || 'UNKNOWN'}`;
  const normalizedTime = normalizeTimeOfDay(info.timeOfDay);

  return {
    id: info.id,
    number: info.sceneNumber ? parseInt(info.sceneNumber) : index + 1,
    heading,
    location,
    timeOfDay: normalizedTime,
    elements: [],
    characters: info.characters || [],
  };
}

export default function TapestryPage() {
  const params = useParams();
  const router = useRouter();
  const screenplayId = params.id as string;

  const [screenplay, setScreenplay] = useState<ScreenplayData | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const screenplayRes = await fetch(`/api/screenplays/${screenplayId}`);
      if (!screenplayRes.ok) {
        if (screenplayRes.status === 404) {
          setError('Screenplay not found');
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${screenplayRes.status}`);
      }
      const screenplayData = await screenplayRes.json();
      setScreenplay(screenplayData);

      // Parse content and extract scenes, characters, and locations
      if (screenplayData.content) {
        const doc = deserializeFromStorage(screenplayData.content);
        const sceneInfos = extractScenes(doc);
        const parsedScenes = sceneInfos.map((info, index) => convertToScene(info, index));
        setScenes(parsedScenes);

        // Extract characters (sorted by dialogue count)
        const characterInfos = extractCharacters(doc);
        setCharacters(characterInfos);

        // Extract unique locations from scenes
        const locationMap = new Map<string, Location>();
        for (const scene of parsedScenes) {
          if (scene.location && !locationMap.has(scene.location.name)) {
            locationMap.set(scene.location.name, scene.location);
          }
        }
        setLocations(Array.from(locationMap.values()));
      }
    } catch (err) {
      console.error('Error loading tapestry data:', err);
      setError(
        err instanceof Error
          ? `Failed to load: ${err.message}`
          : 'Failed to load screenplay data'
      );
    } finally {
      setLoading(false);
    }
  }, [screenplayId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dispatch title update for app header
  useEffect(() => {
    if (screenplay?.title) {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title: screenplay.title }
      }));
    }
  }, [screenplay?.title]);

  const handleSceneClick = (sceneId: string) => {
    router.push(`/screenplay/${screenplayId}?scene=${sceneId}`);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {error === 'Screenplay not found' ? 'Not Found' : 'Error Loading'}
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/home')}>
              Go Home
            </Button>
            {error !== 'Screenplay not found' && (
              <Button onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!screenplay) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Screenplay not found</p>
          <Button variant="outline" onClick={() => router.push('/home')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-muted/30">
      <ErrorBoundary componentName="Tapestry">
        <Tapestry
          screenplayId={screenplayId}
          screenplayTitle={screenplay.title}
          scenes={scenes}
          characters={characters}
          locations={locations}
          onSceneClick={handleSceneClick}
        />
      </ErrorBoundary>
    </div>
  );
}
