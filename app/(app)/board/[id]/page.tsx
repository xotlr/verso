"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { BeatBoard, Beat } from "@/components/beat-board";
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
];

// Demo beats for testing
const DEMO_BEATS: Beat[] = [
  {
    id: 'beat-1',
    title: 'Meet Cute',
    description: 'Our protagonists meet in an unexpected way.',
    color: '#3B82F6',
    act: 'act1',
    sceneIds: ['scene-1'],
    order: 0,
  },
  {
    id: 'beat-2',
    title: 'Inciting Incident',
    description: 'Something happens that changes everything.',
    color: '#10B981',
    act: 'act1',
    sceneIds: ['scene-2'],
    order: 1,
  },
  {
    id: 'beat-3',
    title: 'First Turning Point',
    description: 'The protagonist commits to the journey.',
    color: '#F59E0B',
    act: 'act2a',
    sceneIds: ['scene-3'],
    order: 0,
  },
  {
    id: 'beat-4',
    title: 'Midpoint',
    description: 'A major revelation or confrontation.',
    color: '#EF4444',
    act: 'act2b',
    sceneIds: ['scene-4'],
    order: 0,
  },
  {
    id: 'beat-5',
    title: 'Resolution',
    description: 'The story reaches its conclusion.',
    color: '#8B5CF6',
    act: 'act3',
    sceneIds: ['scene-5'],
    order: 0,
  },
];

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [beats, setBeats] = useState<Beat[]>(DEMO_BEATS);
  const [scenes] = useState<Scene[]>(DEMO_SCENES);

  const handleBeatsChange = useCallback((newBeats: Beat[]) => {
    setBeats(newBeats);
    console.log('Beats updated:', newBeats);
  }, []);

  const handleSceneClick = useCallback((sceneId: string) => {
    router.push(`/editor/${id}?scene=${sceneId}`);
  }, [router, id]);

  const handleBackToEditor = useCallback(() => {
    router.push(`/editor/${id}`);
  }, [router, id]);

  return (
    <ProjectLayout
      projectId={id}
      projectTitle="Untitled Screenplay"
    >
      <BeatBoard
        scenes={scenes}
        beats={beats}
        onBeatsChange={handleBeatsChange}
        onSceneClick={handleSceneClick}
        onBackToEditor={handleBackToEditor}
      />
    </ProjectLayout>
  );
}
