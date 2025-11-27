// Quill Delta types for rich text storage
export interface DeltaOperation {
  insert?: string | Record<string, unknown>;
  delete?: number;
  retain?: number;
  attributes?: Record<string, unknown>;
}

export interface Delta {
  ops: DeltaOperation[];
}

// Content format discriminator
export type ContentFormat = 'plain' | 'delta';

export type CharacterAppearance = {
  characterId: string;
  sceneId: string;
  dialogueCount: number;
  actionCount: number;
};

export type Character = {
  id: string;
  name: string;
  color: string;
  description?: string;
  appearances: CharacterAppearance[];
};

export type Location = {
  id: string;
  name: string;
  type: 'INT' | 'EXT' | 'INT/EXT';
  description?: string;
  color: string;
};

export type SceneElement = {
  id: string;
  type: 'action' | 'dialogue' | 'parenthetical' | 'transition' | 'scene-heading' | 'character';
  content: string;
  characterId?: string;
  // Dual dialogue support
  isDualDialogue?: boolean;
  // Lyrics (for musical screenplays)
  isLyrics?: boolean;
};

export type Scene = {
  id: string;
  number: number;
  heading: string;
  location: Location;
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS';
  elements: SceneElement[];
  characters: string[];
  duration?: number;
  synopsis?: string;
};

export type Screenplay = {
  id?: string;
  title?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  // Rich text content storage
  content?: string;           // Plain text (for parsing and legacy compatibility)
  richContent?: Delta;        // Quill Delta format (rich text with formatting)
  contentFormat?: ContentFormat; // Discriminator for which format is source of truth
  metadata?: {
    genre?: string;
    logline?: string;
    synopsis?: string;
  };
};