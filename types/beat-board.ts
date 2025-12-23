import { Scene } from '@/types/screenplay';

// Dynamic act ID (string instead of fixed enum)
export type ActId = string;

// Act configuration
export interface ActConfig {
  id: string;
  label: string;
}

// Default acts (3-act structure)
export const DEFAULT_ACTS: ActConfig[] = [
  { id: 'act1', label: 'Act 1' },
  { id: 'act2', label: 'Act 2' },
  { id: 'act3', label: 'Act 3' },
];

// Scene metadata from the database
export interface SceneMeta {
  color: string | null;
  notes: string | null;
  mood: string | null;
  act: string | null;
}

// Scene with act assignment (used in beat board)
export interface SceneWithAct extends Scene {
  act: string | null;
}

export interface BeatBoardProps {
  scenes: Scene[];
  sceneMetas: Record<string, SceneMeta>;
  acts: ActConfig[];
  onActChange: (sceneId: string, act: string | null) => void;
  onActsChange: (acts: ActConfig[]) => void;
  onSceneClick?: (sceneId: string) => void;
}

// Legacy Beat type (kept for backwards compatibility)
export interface Beat {
  id: string;
  title: string;
  description: string;
  color: string;
  act: string;
  sceneIds: string[];
  order: number;
}
