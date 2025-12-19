import { downloadFile } from '@/lib/dom-utils';
import { Scene, Character, Location } from '@/types/screenplay';
import {
  SceneBreakdownItem,
  CastBreakdownItem,
  LocationBreakdownItem,
  DayNightBreakdownItem,
  IntExtBreakdownItem,
} from './types';

export function downloadCSV<T extends object>(data: T[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const value = (row as Record<string, unknown>)[h];
      if (Array.isArray(value)) return `"${value.join(', ')}"`;
      return `"${value}"`;
    }).join(','))
  ].join('\n');

  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

export function calculateSceneBreakdown(scenes: Scene[]): SceneBreakdownItem[] {
  return scenes.map((scene, index) => ({
    sceneNumber: `${index + 1}`,
    heading: scene.heading,
    location: scene.location.name,
    timeOfDay: scene.timeOfDay,
    pageCount: Math.ceil(scene.elements.length / 10),
    characters: scene.characters,
    synopsis: scene.synopsis || 'No synopsis',
  }));
}

export function calculateTotalPages(scenes: Scene[]): number {
  return scenes.reduce((sum, scene) => sum + Math.ceil(scene.elements.length / 10), 0);
}

export function calculateCastBreakdown(
  characters: Character[],
  scenes: Scene[],
  totalPages: number
): CastBreakdownItem[] {
  return characters.map((character) => {
    const characterScenes = scenes.filter(s => s.characters.includes(character.name));
    const pageCount = characterScenes.reduce((sum, scene) =>
      sum + Math.ceil(scene.elements.length / 10), 0
    );
    const screenTime = pageCount;
    const screenTimePercentage = totalPages > 0
      ? Math.round((pageCount / totalPages) * 100)
      : 0;

    return {
      characterName: character.name,
      totalScenes: characterScenes.length,
      scenes: characterScenes.map((s) => scenes.indexOf(s) + 1),
      firstAppearance: characterScenes.length > 0 ? scenes.indexOf(characterScenes[0]) + 1 : 0,
      lastAppearance: characterScenes.length > 0 ? scenes.indexOf(characterScenes[characterScenes.length - 1]) + 1 : 0,
      dialogueLines: character.appearances.reduce((sum, app) => sum + app.dialogueCount, 0),
      pageCount,
      screenTime,
      screenTimePercentage,
    };
  }).sort((a, b) => b.pageCount - a.pageCount);
}

export function calculateLocationBreakdown(
  locations: Location[],
  scenes: Scene[]
): LocationBreakdownItem[] {
  return locations.map((location) => {
    const locationScenes = scenes.filter(s => s.location.name === location.name);
    return {
      name: location.name,
      type: location.type,
      totalScenes: locationScenes.length,
      scenes: locationScenes.map((s) => scenes.indexOf(s) + 1),
    };
  }).sort((a, b) => b.totalScenes - a.totalScenes);
}

export function calculateDayNightBreakdown(scenes: Scene[]): DayNightBreakdownItem[] {
  const timeGroups: Record<string, { scenes: number[]; pageCount: number }> = {};

  scenes.forEach((scene, index) => {
    const time = scene.timeOfDay || 'UNKNOWN';
    if (!timeGroups[time]) {
      timeGroups[time] = { scenes: [], pageCount: 0 };
    }
    timeGroups[time].scenes.push(index + 1);
    timeGroups[time].pageCount += Math.ceil(scene.elements.length / 10);
  });

  return Object.entries(timeGroups)
    .map(([time, data]) => ({
      timeOfDay: time,
      totalScenes: data.scenes.length,
      scenes: data.scenes,
      pageCount: data.pageCount,
      percentage: Math.round((data.scenes.length / scenes.length) * 100) || 0,
    }))
    .sort((a, b) => b.totalScenes - a.totalScenes);
}

export function calculateIntExtBreakdown(scenes: Scene[]): IntExtBreakdownItem[] {
  const typeGroups: Record<string, { scenes: number[]; pageCount: number; locations: Set<string> }> = {};

  scenes.forEach((scene, index) => {
    const type = scene.location.type || 'UNKNOWN';
    if (!typeGroups[type]) {
      typeGroups[type] = { scenes: [], pageCount: 0, locations: new Set() };
    }
    typeGroups[type].scenes.push(index + 1);
    typeGroups[type].pageCount += Math.ceil(scene.elements.length / 10);
    typeGroups[type].locations.add(scene.location.name);
  });

  return Object.entries(typeGroups)
    .map(([type, data]) => ({
      locationType: type,
      totalScenes: data.scenes.length,
      scenes: data.scenes,
      pageCount: data.pageCount,
      uniqueLocations: data.locations.size,
      percentage: Math.round((data.scenes.length / scenes.length) * 100) || 0,
    }))
    .sort((a, b) => b.totalScenes - a.totalScenes);
}
