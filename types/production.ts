// Production-related types for professional screenplay features

export type RevisionColor = 'white' | 'blue' | 'pink' | 'yellow' | 'green' | 'goldenrod' | 'buff' | 'salmon';

export interface SceneNumbering {
  enabled: boolean;
  startNumber: number;
  prefix?: string;
  suffix?: string;
  side: 'left' | 'right' | 'both';
}

export interface RevisionMark {
  line: number;
  color: RevisionColor;
  date: string;
  author?: string;
}

export interface LockedPage {
  pageNumber: number;
  content: string;
  lockedAt: string;
  lockedBy?: string;
}

export interface OmittedScene {
  sceneNumber: string;
  reason?: string;
  omittedAt: string;
}

export interface SceneLock {
  sceneId: string;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}

export interface ProductionStatus {
  status: 'not-started' | 'in-prep' | 'shooting' | 'completed' | 'omitted';
  color?: string;
  notes?: string;
}

export interface SceneBreakdown {
  sceneId: string;
  sceneNumber: string;
  heading: string;
  description: string;
  pageCount: number;
  eighths: number; // Page count in 1/8ths
  location: {
    name: string;
    type: 'INT' | 'EXT' | 'INT/EXT';
  };
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS';
  castMembers: string[];
  extras: string[];
  props: string[];
  wardrobe: string[];
  vehicles: string[];
  specialEffects: string[];
  sound: string[];
  notes: string;
  productionStatus: ProductionStatus;
}

export interface ShootingDay {
  dayNumber: number;
  date?: string;
  scenes: string[]; // Scene IDs
  location: string;
  estimatedPages: number;
  notes?: string;
}

export interface DayOutOfDays {
  characterName: string;
  days: {
    [dayNumber: number]: 'work' | 'travel' | 'hold' | 'off';
  };
  totalWorkDays: number;
  totalHoldDays: number;
}

export interface CastBreakdown {
  characterName: string;
  actor?: string;
  role: 'lead' | 'supporting' | 'day-player' | 'extra';
  scenes: string[]; // Scene IDs
  totalScenes: number;
  firstAppearance: string; // Scene number
  lastAppearance: string; // Scene number
  dialogueLines: number;
  notes?: string;
}

export interface LocationBreakdown {
  name: string;
  type: 'INT' | 'EXT' | 'INT/EXT';
  scenes: string[]; // Scene IDs
  totalScenes: number;
  totalPages: number;
  address?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
}

export interface PropsList {
  name: string;
  scenes: string[]; // Scene IDs
  quantity: number;
  source?: 'purchase' | 'rent' | 'on-hand' | 'build';
  responsible?: string;
  notes?: string;
}

export interface WardrobeList {
  character: string;
  item: string;
  scenes: string[]; // Scene IDs
  changes: number;
  notes?: string;
}

export interface ProductionReport {
  type: 'scene-breakdown' | 'cast-breakdown' | 'location-list' | 'day-out-of-days' | 'shooting-schedule' | 'props-list' | 'wardrobe-list';
  generatedAt: string;
  screenplay: {
    title: string;
    author?: string;
    totalPages: number;
    totalScenes: number;
  };
  data: any; // Type depends on report type
}
