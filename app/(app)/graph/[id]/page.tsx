'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StoryGraph } from '@/components/story-graph';
import { Scene, Character, Location } from '@/types/screenplay';
import { Beat } from '@/components/beat-board';
import { parseScreenplayText } from '@/lib/screenplay-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import { safeGetItem, getStorageErrorMessage } from '@/lib/storage';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScreenplayData {
  id: string;
  title: string;
  content: string;
}

// LocalStorage key for beats
const getBeatsStorageKey = (screenplayId: string) => `verso-beats-${screenplayId}`;

// Type guard for validating beats data
function isValidBeatsArray(data: unknown): data is Beat[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.act === 'string'
  );
}

export default function GraphPage() {
  const params = useParams();
  const router = useRouter();
  const screenplayId = params.id as string;

  const [screenplay, setScreenplay] = useState<ScreenplayData | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load screenplay
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

      // Parse screenplay content
      const parsed = parseScreenplayText(screenplayData.content || '');
      setScenes(parsed.scenes || []);
      setCharacters(parsed.characters || []);
      setLocations(parsed.locations || []);

      // Load beats from localStorage with safe handling
      const beatsResult = safeGetItem<Beat[]>(
        getBeatsStorageKey(screenplayId),
        isValidBeatsArray
      );

      if (beatsResult.success && beatsResult.data) {
        setBeats(beatsResult.data);
      } else if (beatsResult.error) {
        // Show a warning but don't block loading
        setStorageWarning(getStorageErrorMessage(beatsResult.error));
        setBeats([]);
      }
    } catch (err) {
      console.error('Error loading graph data:', err);
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

  const handleBackToEditor = () => {
    router.push(`/screenplay/${screenplayId}`);
  };

  const handleSceneClick = (sceneId: string) => {
    // Navigate to editor with scene selected
    router.push(`/screenplay/${screenplayId}?scene=${sceneId}`);
  };

  const dismissStorageWarning = () => {
    setStorageWarning(null);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border bg-card px-4 py-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-8 w-8 rounded-full mx-auto" />
            <Skeleton className="h-4 w-24 mt-2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
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
      <div className="h-full flex items-center justify-center">
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
    <ErrorBoundary componentName="Story Graph">
      {/* Storage warning banner */}
      {storageWarning && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>{storageWarning}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissStorageWarning}
            className="text-warning-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      )}
      <StoryGraph
        screenplayId={screenplayId}
        screenplayTitle={screenplay.title}
        scenes={scenes}
        characters={characters}
        locations={locations}
        beats={beats}
        onBackToEditor={handleBackToEditor}
        onSceneClick={handleSceneClick}
      />
    </ErrorBoundary>
  );
}
