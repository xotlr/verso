import { Scene, Character, Location } from '@/types/screenplay';

export interface ProductionReportsProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  screenplayTitle: string;
}

export interface SceneBreakdownItem {
  sceneNumber: string;
  heading: string;
  location: string;
  timeOfDay: string;
  pageCount: number;
  characters: string[];
  synopsis: string;
}

export interface CastBreakdownItem {
  characterName: string;
  totalScenes: number;
  scenes: number[];
  firstAppearance: number;
  lastAppearance: number;
  dialogueLines: number;
  pageCount: number;
  screenTime: number;
  screenTimePercentage: number;
}

export interface LocationBreakdownItem {
  name: string;
  type: string;
  totalScenes: number;
  scenes: number[];
}

export interface DayNightBreakdownItem {
  timeOfDay: string;
  totalScenes: number;
  scenes: number[];
  pageCount: number;
  percentage: number;
}

export interface IntExtBreakdownItem {
  locationType: string;
  totalScenes: number;
  scenes: number[];
  pageCount: number;
  uniqueLocations: number;
  percentage: number;
}

export interface ReportTabProps {
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  totalPages: number;
}
