"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { IndexCards, IndexCard } from "@/components/index-cards";
import { ProjectLayout } from "@/components/layouts/project-layout";
import { Scene } from "@/types/screenplay";

// Demo scenes for testing
const DEMO_SCENES: Scene[] = [
  {
    id: 'scene-1',
    number: 1,
    heading: 'INT. COFFEE SHOP - DAY',
    location: { id: 'loc-1', name: 'COFFEE SHOP', type: 'INT', color: '#888' },
    timeOfDay: 'DAY',
    characters: ['SARAH', 'MIKE'],
    elements: [],
    synopsis: 'Sarah and Mike meet for the first time.',
  },
  {
    id: 'scene-2',
    number: 2,
    heading: 'EXT. CITY STREET - NIGHT',
    location: { id: 'loc-2', name: 'CITY STREET', type: 'EXT', color: '#888' },
    timeOfDay: 'NIGHT',
    characters: ['SARAH'],
    elements: [],
    synopsis: 'Sarah walks home alone, thinking.',
  },
  {
    id: 'scene-3',
    number: 3,
    heading: 'INT. SARAH\'S APARTMENT - NIGHT',
    location: { id: 'loc-3', name: "SARAH'S APARTMENT", type: 'INT', color: '#888' },
    timeOfDay: 'NIGHT',
    characters: ['SARAH'],
    elements: [],
    synopsis: 'Sarah makes a decision.',
  },
  {
    id: 'scene-4',
    number: 4,
    heading: 'INT. OFFICE - DAY',
    location: { id: 'loc-4', name: 'OFFICE', type: 'INT', color: '#888' },
    timeOfDay: 'DAY',
    characters: ['SARAH', 'BOSS'],
    elements: [],
    synopsis: 'Sarah confronts her boss.',
  },
  {
    id: 'scene-5',
    number: 5,
    heading: 'EXT. PARK - DAY',
    location: { id: 'loc-5', name: 'PARK', type: 'EXT', color: '#888' },
    timeOfDay: 'DAY',
    characters: ['SARAH', 'MIKE'],
    elements: [],
    synopsis: 'The reunion.',
  },
  {
    id: 'scene-6',
    number: 6,
    heading: 'INT. RESTAURANT - NIGHT',
    location: { id: 'loc-6', name: 'RESTAURANT', type: 'INT', color: '#888' },
    timeOfDay: 'NIGHT',
    characters: ['SARAH', 'MIKE'],
    elements: [],
    synopsis: 'A romantic dinner.',
  },
  {
    id: 'scene-7',
    number: 7,
    heading: 'EXT. BEACH - DAWN',
    location: { id: 'loc-7', name: 'BEACH', type: 'EXT', color: '#888' },
    timeOfDay: 'DAWN',
    characters: ['SARAH'],
    elements: [],
    synopsis: 'Sarah watches the sunrise, reflecting.',
  },
  {
    id: 'scene-8',
    number: 8,
    heading: 'INT. HOSPITAL - DAY',
    location: { id: 'loc-8', name: 'HOSPITAL', type: 'INT', color: '#888' },
    timeOfDay: 'DAY',
    characters: ['SARAH', 'DOCTOR'],
    elements: [],
    synopsis: 'Sarah receives life-changing news.',
  },
];

// Demo cards for testing
const DEMO_CARDS: IndexCard[] = [
  { sceneId: 'scene-1', color: '#3B82F6', status: 'complete', summary: 'Opening scene - establishes main characters' },
  { sceneId: 'scene-2', color: '#10B981', status: 'complete', summary: 'Transition and character reflection' },
  { sceneId: 'scene-3', color: '#F59E0B', status: 'revision', summary: 'Key decision moment - needs more tension' },
  { sceneId: 'scene-4', color: '#EF4444', status: 'writing', summary: 'Confrontation scene' },
  { sceneId: 'scene-5', color: '#8B5CF6', status: 'outline', summary: 'Emotional payoff' },
  { sceneId: 'scene-6', color: '#EC4899', status: 'draft', summary: '' },
  { sceneId: 'scene-7', color: '#06B6D4', status: 'draft', summary: '' },
  { sceneId: 'scene-8', color: '#F97316', status: 'draft', summary: '' },
];

export default function CardsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [scenes, setScenes] = useState<Scene[]>(DEMO_SCENES);
  const [cards, setCards] = useState<IndexCard[]>(DEMO_CARDS);

  const handleCardsChange = useCallback((newCards: IndexCard[]) => {
    setCards(newCards);
    console.log('Cards updated:', newCards);
  }, []);

  const handleScenesReorder = useCallback((newScenes: Scene[]) => {
    setScenes(newScenes);
    console.log('Scenes reordered:', newScenes);
  }, []);

  const handleSceneClick = useCallback((sceneId: string) => {
    router.push(`/editor/${id}?scene=${sceneId}`);
  }, [router, id]);

  const handleSceneEdit = useCallback((scene: Scene) => {
    console.log('Edit scene:', scene);
    router.push(`/editor/${id}?scene=${scene.id}&edit=true`);
  }, [router, id]);

  return (
    <ProjectLayout
      projectId={id}
      projectTitle="Untitled Screenplay"
    >
      <IndexCards
        scenes={scenes}
        cards={cards}
        onCardsChange={handleCardsChange}
        onScenesReorder={handleScenesReorder}
        onSceneClick={handleSceneClick}
        onSceneEdit={handleSceneEdit}
      />
    </ProjectLayout>
  );
}
