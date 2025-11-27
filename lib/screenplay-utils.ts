import { Character, Scene, Screenplay, Location } from '@/types/screenplay';

export const CHARACTER_COLORS = [
  '#000000', '#1F2937', '#374151', '#4B5563', '#6B7280',
  '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB'
];

export const LOCATION_COLORS = [
  '#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF',
  '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'
];

export function generateCharacterColor(index: number): string {
  return CHARACTER_COLORS[index % CHARACTER_COLORS.length];
}

export function generateLocationColor(index: number): string {
  return LOCATION_COLORS[index % LOCATION_COLORS.length];
}

export function parseScreenplayText(text: string): Partial<Screenplay> {
  const lines = text.split('\n');
  const scenes: Scene[] = [];
  const characters = new Map<string, Character>();
  const locations = new Map<string, Location>();
  
  let currentScene: Scene | null = null;
  let sceneNumber = 0;
  let inDialogue = false;
  let currentCharacterId: string | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    
    // Skip empty lines
    if (!trimmed) {
      inDialogue = false;
      continue;
    }
    
    // Scene headings
    if (trimmed.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i)) {
      if (currentScene) {
        scenes.push(currentScene);
      }
      
      sceneNumber++;
      const parts = trimmed.toUpperCase().split(' - ');
      const locationPart = parts[0];
      const timeOfDay = parts[1] || 'DAY';
      
      const locationType = locationPart.startsWith('INT.') ? 'INT' : 
                          locationPart.startsWith('EXT.') ? 'EXT' : 'INT/EXT';
      const locationName = locationPart.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/, '').trim();
      
      const locationId = locationName.toLowerCase().replace(/\s+/g, '-');
      if (!locations.has(locationId)) {
        locations.set(locationId, {
          id: locationId,
          name: locationName,
          type: locationType,
          color: generateLocationColor(locations.size)
        });
      }
      
      currentScene = {
        id: `scene-${sceneNumber}`,
        number: sceneNumber,
        heading: trimmed.toUpperCase(),
        location: locations.get(locationId)!,
        timeOfDay: timeOfDay as any,
        elements: [{
          id: `${sceneNumber}-heading`,
          type: 'scene-heading',
          content: trimmed.toUpperCase()
        }],
        characters: []
      };
      inDialogue = false;
      currentCharacterId = null;
    } 
    // Character names (with extensions)
    else if (currentScene && 
             trimmed === trimmed.toUpperCase() && 
             trimmed.length > 1 && 
             trimmed.length < 50 &&
             !trimmed.match(/^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|END|THE END|CONTINUED)/) &&
             !trimmed.includes('.') &&
             (nextLine && !nextLine.match(/^[A-Z\s]+$/))) {
      
      // Extract character name and extension
      const extensionMatch = trimmed.match(/^(.+?)\s*(\((?:V\.O\.|O\.S\.|CONT'D)\))$/);
      const characterName = extensionMatch ? extensionMatch[1].trim() : trimmed;
      const extension = extensionMatch ? extensionMatch[2] : '';
      
      const characterId = characterName.toLowerCase().replace(/\s+/g, '-');
      
      if (!characters.has(characterId)) {
        characters.set(characterId, {
          id: characterId,
          name: characterName,
          color: generateCharacterColor(characters.size),
          appearances: []
        });
      }
      
      if (!currentScene.characters.includes(characterId)) {
        currentScene.characters.push(characterId);
      }
      
      currentScene.elements.push({
        id: `${currentScene.id}-${currentScene.elements.length}`,
        type: 'character',
        content: trimmed,
        characterId
      });
      
      inDialogue = true;
      currentCharacterId = characterId;
    }
    // Parentheticals
    else if (currentScene && trimmed.startsWith('(') && trimmed.endsWith(')') && inDialogue) {
      currentScene.elements.push({
        id: `${currentScene.id}-${currentScene.elements.length}`,
        type: 'parenthetical',
        content: trimmed
      });
    }
    // Dialogue
    else if (currentScene && inDialogue && currentCharacterId) {
      currentScene.elements.push({
        id: `${currentScene.id}-${currentScene.elements.length}`,
        type: 'dialogue',
        content: trimmed,
        characterId: currentCharacterId
      });
      
      // Check if dialogue continues
      if (!nextLine || nextLine === '' || 
          (nextLine === nextLine.toUpperCase() && !nextLine.startsWith('('))) {
        inDialogue = false;
        currentCharacterId = null;
      }
    }
    // Transitions
    else if (currentScene && trimmed.match(/^(FADE|CUT|DISSOLVE|MATCH CUT|SMASH CUT|TIME CUT|FREEZE FRAME|END|THE END).*:/i)) {
      currentScene.elements.push({
        id: `${currentScene.id}-${currentScene.elements.length}`,
        type: 'transition',
        content: trimmed.toUpperCase()
      });
      inDialogue = false;
      currentCharacterId = null;
    }
    // Action lines
    else if (currentScene) {
      currentScene.elements.push({
        id: `${currentScene.id}-${currentScene.elements.length}`,
        type: 'action',
        content: line // Preserve original formatting
      });
      inDialogue = false;
      currentCharacterId = null;
    }
  }
  
  if (currentScene) {
    scenes.push(currentScene);
  }
  
  return {
    scenes,
    characters: Array.from(characters.values()),
    locations: Array.from(locations.values())
  };
}

export function getCharacterScenePresence(screenplay: Screenplay): Map<string, Set<number>> {
  const presence = new Map<string, Set<number>>();
  
  screenplay.scenes.forEach(scene => {
    scene.characters.forEach(characterId => {
      if (!presence.has(characterId)) {
        presence.set(characterId, new Set());
      }
      presence.get(characterId)!.add(scene.number);
    });
  });
  
  return presence;
}

export function getSceneConnections(screenplay: Screenplay): Array<{from: number, to: number, characters: string[]}> {
  const connections: Array<{from: number, to: number, characters: string[]}> = [];
  
  for (let i = 0; i < screenplay.scenes.length - 1; i++) {
    const currentScene = screenplay.scenes[i];
    const nextScene = screenplay.scenes[i + 1];
    
    const sharedCharacters = currentScene.characters.filter(c => 
      nextScene.characters.includes(c)
    );
    
    if (sharedCharacters.length > 0) {
      connections.push({
        from: currentScene.number,
        to: nextScene.number,
        characters: sharedCharacters
      });
    }
  }
  
  return connections;
}