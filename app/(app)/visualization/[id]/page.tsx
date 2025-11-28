'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseScreenplayText } from '@/lib/screenplay-utils';
import { Screenplay } from '@/types/screenplay';

interface CharacterMovement {
  characterId: string;
  characterName: string;
  scenes: {
    sceneId: string;
    sceneNumber: number;
    location: string;
    hasDialogue: boolean;
    lineCount: number;
  }[];
}

export default function VisualizationPage() {
  const params = useParams();
  const id = params.id as string;
  const [screenplay, setScreenplay] = useState<Screenplay>({ scenes: [], characters: [], locations: [] });
  const [title, setTitle] = useState('');
  const [characterMovements, setCharacterMovements] = useState<CharacterMovement[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  useEffect(() => {
    // Load screenplay from localStorage
    const data = localStorage.getItem(`screenplay_${id}`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setTitle(parsed.title || 'Untitled Screenplay');
        const screenplayData = parseScreenplayText(parsed.content || '');
        const fullScreenplay: Screenplay = {
          scenes: screenplayData.scenes || [],
          characters: screenplayData.characters || [],
          locations: screenplayData.locations || [],
          ...screenplayData
        };
        setScreenplay(fullScreenplay);

        // Calculate character movements
        calculateCharacterMovements(fullScreenplay);
      } catch (e) {
        console.error('Error loading screenplay:', e);
        window.location.href = '/home';
      }
    } else {
      window.location.href = '/home';
    }
  }, [id]);

  const calculateCharacterMovements = (screenplay: Screenplay) => {
    const movements: CharacterMovement[] = [];
    
    // Track each character's appearances
    screenplay.characters.forEach(character => {
      const characterScenes: CharacterMovement['scenes'] = [];
      
      screenplay.scenes.forEach((scene, index) => {
        const hasCharacter = scene.characters.includes(character.id);
        if (hasCharacter) {
          const dialogueCount = scene.elements.filter(
            el => el.type === 'dialogue' && el.characterId === character.id
          ).length;
          
          characterScenes.push({
            sceneId: scene.id,
            sceneNumber: index + 1,
            location: scene.heading,
            hasDialogue: dialogueCount > 0,
            lineCount: dialogueCount
          });
        }
      });
      
      if (characterScenes.length > 0) {
        movements.push({
          characterId: character.id,
          characterName: character.name,
          scenes: characterScenes
        });
      }
    });
    
    // Sort by number of appearances
    movements.sort((a, b) => b.scenes.length - a.scenes.length);
    setCharacterMovements(movements);
  };

  const getCharacterColor = (characterName: string) => {
    // Generate consistent colors based on character name
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];
    const index = characterName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/editor/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-medium text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">Character Movement Visualization</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Character List */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Characters</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCharacter(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                selectedCharacter === null
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              )}
            >
              All Characters
            </button>
            {characterMovements.map(char => (
              <button
                key={char.characterId}
                onClick={() => setSelectedCharacter(char.characterId)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
                  selectedCharacter === char.characterId
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                )}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getCharacterColor(char.characterName) }}
                />
                {char.characterName}
                <span className="text-xs opacity-70">({char.scenes.length} scenes)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-6">Character Timeline</h3>
          
          {/* Scene numbers header */}
          <div className="flex items-center mb-4">
            <div className="w-32 shrink-0"></div>
            <div className="flex-1 flex gap-2 overflow-x-auto pb-2">
              {screenplay.scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className="flex-shrink-0 w-12 text-center text-xs text-gray-500"
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Character timelines */}
          <div className="space-y-3">
            {characterMovements
              .filter(char => !selectedCharacter || char.characterId === selectedCharacter)
              .map(char => (
                <div key={char.characterId} className="flex items-center">
                  <div className="w-32 shrink-0 pr-4">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {char.characterName}
                    </div>
                  </div>
                  <div className="flex-1 flex gap-2 overflow-x-auto">
                    {screenplay.scenes.map((scene, sceneIndex) => {
                      const appearance = char.scenes.find(s => s.sceneNumber === sceneIndex + 1);
                      
                      return (
                        <div
                          key={scene.id}
                          className="flex-shrink-0 w-12 h-8 relative group"
                        >
                          {appearance ? (
                            <div
                              className="absolute inset-0 rounded flex items-center justify-center text-xs font-medium text-white cursor-pointer"
                              style={{ backgroundColor: getCharacterColor(char.characterName) }}
                              title={`${scene.heading} - ${appearance.lineCount} lines`}
                            >
                              {appearance.lineCount > 0 ? appearance.lineCount : '•'}
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-gray-100 rounded" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-xs text-white font-medium">
                  5
                </div>
                <span>Number indicates dialogue lines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-xs text-white font-medium">
                  •
                </div>
                <span>Present but no dialogue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded" />
                <span>Not in scene</span>
              </div>
            </div>
          </div>
        </div>

        {/* Character Journey Details */}
        {selectedCharacter && (
          <div className="mt-8 bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold mb-4">
              {characterMovements.find(c => c.characterId === selectedCharacter)?.characterName}&apos;s Journey
            </h3>
            <div className="space-y-4">
              {characterMovements
                .find(c => c.characterId === selectedCharacter)
                ?.scenes.map((scene) => (
                  <div key={scene.sceneId} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                      {scene.sceneNumber}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{scene.location}</h4>
                      <p className="text-sm text-muted-foreground">
                        {scene.hasDialogue
                          ? `${scene.lineCount} line${scene.lineCount > 1 ? 's' : ''} of dialogue`
                          : 'Present in scene (no dialogue)'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Character Interactions Matrix */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Character Interactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-gray-900 p-2">Character</th>
                  {characterMovements.map(char => (
                    <th key={char.characterId} className="text-center text-sm font-medium text-gray-900 p-2 min-w-[100px]">
                      <div className="truncate">{char.characterName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characterMovements.map(char1 => (
                  <tr key={char1.characterId}>
                    <td className="text-sm font-medium text-gray-900 p-2">{char1.characterName}</td>
                    {characterMovements.map(char2 => {
                      if (char1.characterId === char2.characterId) {
                        return (
                          <td key={char2.characterId} className="text-center p-2">
                            <div className="w-8 h-8 bg-gray-200 rounded mx-auto" />
                          </td>
                        );
                      }
                      
                      // Count shared scenes
                      const sharedScenes = char1.scenes.filter(s1 =>
                        char2.scenes.some(s2 => s2.sceneId === s1.sceneId)
                      ).length;
                      
                      return (
                        <td key={char2.characterId} className="text-center p-2">
                          {sharedScenes > 0 ? (
                            <div
                              className="w-8 h-8 rounded mx-auto flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                backgroundColor: getCharacterColor(char1.characterName),
                                opacity: Math.min(0.3 + (sharedScenes * 0.1), 1)
                              }}
                            >
                              {sharedScenes}
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Numbers indicate how many scenes characters share together
          </p>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}