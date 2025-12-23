"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { IndexCards, IndexCard } from "@/components/index-cards";
import { PageLayout } from "@/components/layouts/page-layout";
import { Scene, Location } from "@/types/screenplay";
import { deserializeFromStorage } from "@/lib/prosemirror/serialization";
import { extractScenes } from "@/hooks/editor/document-extractors";
import type { SceneInfo } from "@/hooks/editor/types";
import { Loader2 } from "lucide-react";

// Default colors for cards
const DEFAULT_CARD_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

// Convert SceneInfo from document extractor to Scene type for IndexCards
function convertToScene(info: SceneInfo, index: number): Scene {
  const locationType = (info.type || 'INT') as 'INT' | 'EXT' | 'INT/EXT';
  const location: Location = {
    id: `loc-${info.id}`,
    name: info.location || 'UNKNOWN',
    type: locationType,
    color: '#888888',
  };

  // Build heading string
  const heading = `${locationType}. ${info.location || 'UNKNOWN'}${info.timeOfDay ? ` - ${info.timeOfDay}` : ''}`;

  // Normalize timeOfDay to expected values
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

// Local storage key for cards persistence
function getCardsStorageKey(screenplayId: string): string {
  return `verso-cards-${screenplayId}`;
}

export default function CardsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [cards, setCards] = useState<IndexCard[]>([]);
  const [title, setTitle] = useState("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch screenplay and extract scenes
  useEffect(() => {
    async function loadScreenplay() {
      try {
        const response = await fetch(`/api/screenplays/${id}`);
        if (!response.ok) throw new Error('Failed to fetch screenplay');

        const data = await response.json();
        setTitle(data.title || "Untitled Screenplay");

        // Parse content and extract scenes
        if (data.content) {
          const doc = deserializeFromStorage(data.content);
          const sceneInfos = extractScenes(doc);

          // Convert to Scene format
          const parsedScenes = sceneInfos.map((info, index) => convertToScene(info, index));
          setScenes(parsedScenes);

          // Load saved cards from localStorage or initialize new ones
          const savedCardsJson = localStorage.getItem(getCardsStorageKey(id));
          if (savedCardsJson) {
            try {
              const savedCards = JSON.parse(savedCardsJson) as IndexCard[];
              // Merge with current scenes (handle added/removed scenes)
              const mergedCards = parsedScenes.map((scene, index) => {
                const existingCard = savedCards.find(c => c.sceneId === scene.id);
                if (existingCard) return existingCard;
                // New scene - create default card
                return {
                  sceneId: scene.id,
                  color: DEFAULT_CARD_COLORS[index % DEFAULT_CARD_COLORS.length],
                  status: 'draft' as const,
                  summary: '',
                };
              });
              setCards(mergedCards);
            } catch {
              // Invalid saved data, initialize fresh
              initializeCards(parsedScenes);
            }
          } else {
            initializeCards(parsedScenes);
          }
        } else {
          setScenes([]);
          setCards([]);
        }
      } catch (error) {
        console.error('Error loading screenplay:', error);
        setTitle("Untitled Screenplay");
      } finally {
        setIsLoading(false);
      }
    }

    function initializeCards(scenes: Scene[]) {
      const newCards = scenes.map((scene, index) => ({
        sceneId: scene.id,
        color: DEFAULT_CARD_COLORS[index % DEFAULT_CARD_COLORS.length],
        status: 'draft' as const,
        summary: '',
      }));
      setCards(newCards);
    }

    loadScreenplay();
  }, [id]);

  // Dispatch title update for app header
  useEffect(() => {
    if (title && title !== "Loading...") {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title }
      }));
    }
  }, [title]);

  const handleCardsChange = useCallback((newCards: IndexCard[]) => {
    setCards(newCards);
    // Persist to localStorage
    localStorage.setItem(getCardsStorageKey(id), JSON.stringify(newCards));
  }, [id]);

  const handleScenesReorder = useCallback((newScenes: Scene[]) => {
    setScenes(newScenes);
  }, []);

  const handleSceneClick = useCallback((sceneId: string) => {
    router.push(`/screenplay/${id}?scene=${sceneId}`);
  }, [router, id]);

  const handleSceneEdit = useCallback((scene: Scene) => {
    router.push(`/screenplay/${id}?scene=${scene.id}&edit=true`);
  }, [router, id]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (scenes.length === 0) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-2">No scenes found in this screenplay.</p>
          <p className="text-sm text-muted-foreground">
            Add scene headings (e.g., INT. LOCATION - DAY) in the editor to see them here.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <IndexCards
        scenes={scenes}
        cards={cards}
        onCardsChange={handleCardsChange}
        onScenesReorder={handleScenesReorder}
        onSceneClick={handleSceneClick}
        onSceneEdit={handleSceneEdit}
      />
    </PageLayout>
  );
}
