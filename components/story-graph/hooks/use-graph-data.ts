'use client';

import { useMemo } from 'react';
import {
  GraphInputData,
  GraphOutputData,
  StoryNode,
  GraphLink,
  GraphFilterState,
  SceneNode,
  CharacterNode,
  BeatNode,
  LocationNode,
} from '@/types/graph';
import { useVisualizationColors } from '@/lib/visualization-colors';
import { sanitizeForD3Text } from '@/lib/utils';

export function useGraphData(
  data: GraphInputData,
  filters: GraphFilterState
): GraphOutputData {
  const vizColors = useVisualizationColors();

  return useMemo(() => {
    const nodes: StoryNode[] = [];
    const links: GraphLink[] = [];

    // Safely extract data with fallbacks
    const scenes = data.scenes ?? [];
    const characters = data.characters ?? [];
    const beats = data.beats ?? [];

    // Early return if no data
    if (scenes.length === 0 && characters.length === 0 && beats.length === 0) {
      return { nodes, links };
    }

    // Create scene nodes
    if (filters.showScenes && scenes.length > 0) {
      scenes.forEach((scene, index) => {
        // Skip invalid scenes
        if (!scene?.id) return;

        const sceneNode: SceneNode = {
          id: `scene-${scene.id}`,
          type: 'scene',
          label: sanitizeForD3Text(`Scene ${index + 1}`, 20),
          sceneNumber: index + 1,
          heading: scene.heading ?? '',
          location: scene.location?.name ?? '',
          timeOfDay: scene.timeOfDay ?? '',
          characterIds: Array.isArray(scene.characters) ? scene.characters : [],
          color: vizColors.sceneColors[index % vizColors.sceneColors.length],
        };
        nodes.push(sceneNode);

        // Create scene-to-scene story links
        if (index > 0 && scenes[index - 1]?.id) {
          const link: GraphLink = {
            id: `story-${scenes[index - 1].id}-${scene.id}`,
            source: `scene-${scenes[index - 1].id}`,
            target: `scene-${scene.id}`,
            type: 'story',
            strength: 1,
          };
          links.push(link);
        }
      });
    }

    // Create character nodes
    if (filters.showCharacters && characters.length > 0) {
      characters.forEach((character, index) => {
        // Skip invalid characters
        if (!character?.name) return;

        // Find scenes where this character appears
        const characterSceneIds = scenes
          .filter(s => s?.id && Array.isArray(s.characters) && s.characters.includes(character.name))
          .map(s => s.id);

        const charNode: CharacterNode = {
          id: `character-${character.name}`,
          type: 'character',
          label: sanitizeForD3Text(character.name, 20),
          name: character.name,
          sceneIds: characterSceneIds,
          dialogueCount: Array.isArray(character.appearances)
            ? character.appearances.reduce((sum, app) => sum + (app?.dialogueCount ?? 0), 0)
            : 0,
          color: vizColors.characterColors[index % vizColors.characterColors.length],
        };
        nodes.push(charNode);

        // Create character-to-scene links
        if (filters.showScenes) {
          characterSceneIds.forEach(sceneId => {
            const link: GraphLink = {
              id: `char-${character.name}-scene-${sceneId}`,
              source: `character-${character.name}`,
              target: `scene-${sceneId}`,
              type: 'character',
              color: vizColors.characterColors[index % vizColors.characterColors.length],
              strength: 0.3,
            };
            links.push(link);
          });
        }
      });
    }

    // Create beat nodes
    if (filters.showBeats && beats.length > 0) {
      beats.forEach((beat, index) => {
        // Skip invalid beats
        if (!beat?.id) return;

        const beatSceneIds = Array.isArray(beat.sceneIds) ? beat.sceneIds : [];

        const beatNode: BeatNode = {
          id: `beat-${beat.id}`,
          type: 'beat',
          label: sanitizeForD3Text(beat.title ?? 'Untitled', 20),
          title: beat.title ?? 'Untitled',
          description: beat.description ?? '',
          act: beat.act,
          sceneIds: beatSceneIds,
          color: beat.color || vizColors.beatColors[index % vizColors.beatColors.length],
        };
        nodes.push(beatNode);

        // Create beat-to-scene links
        if (filters.showScenes) {
          beatSceneIds.forEach(sceneId => {
            // Only create link if scene exists in nodes
            if (nodes.some(n => n.id === `scene-${sceneId}`)) {
              const link: GraphLink = {
                id: `beat-${beat.id}-scene-${sceneId}`,
                source: `beat-${beat.id}`,
                target: `scene-${sceneId}`,
                type: 'beat',
                color: beat.color || vizColors.beatColors[index % vizColors.beatColors.length],
                strength: 0.5,
              };
              links.push(link);
            }
          });
        }
      });
    }

    // Create location nodes
    if (filters.showLocations && scenes.length > 0) {
      const locationMap = new Map<string, { name: string; intExt: 'INT' | 'EXT' | 'INT/EXT'; sceneIds: string[] }>();

      scenes.forEach(scene => {
        if (!scene?.id) return;

        const locName = scene.location?.name ?? 'Unknown';
        const heading = scene.heading ?? '';
        const existing = locationMap.get(locName);

        if (existing) {
          existing.sceneIds.push(scene.id);
        } else {
          let intExt: 'INT' | 'EXT' | 'INT/EXT' = 'INT';
          if (heading.includes('EXT.')) intExt = 'EXT';
          if (heading.includes('INT/EXT') || heading.includes('I/E')) intExt = 'INT/EXT';

          locationMap.set(locName, {
            name: locName,
            intExt,
            sceneIds: [scene.id],
          });
        }
      });

      let locIndex = 0;
      locationMap.forEach((loc, locName) => {
        const locNode: LocationNode = {
          id: `location-${locName}`,
          type: 'location',
          label: sanitizeForD3Text(locName, 20),
          name: locName,
          intExt: loc.intExt,
          sceneIds: loc.sceneIds,
          color: vizColors.locationColors[locIndex % vizColors.locationColors.length],
        };
        nodes.push(locNode);
        locIndex++;
      });
    }

    return { nodes, links };
  }, [data, filters, vizColors]);
}
