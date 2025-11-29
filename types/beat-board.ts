import { Scene } from '@/types/screenplay';

// Beat/Card types
export interface Beat {
  id: string;
  title: string;
  description: string;
  color: string;
  act: ActId;
  sceneIds: string[];
  order: number;
}

export type ActId = 'act1' | 'act2a' | 'act2b' | 'act3';

export interface BeatBoardProps {
  scenes: Scene[];
  beats: Beat[];
  onBeatsChange: (beats: Beat[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onBackToEditor?: () => void;
}

// Act configuration (labels only - colors come from theme)
export const ACTS_CONFIG: { id: ActId; label: string }[] = [
  { id: 'act1', label: 'Act 1 - Setup' },
  { id: 'act2a', label: 'Act 2A - Confrontation' },
  { id: 'act2b', label: 'Act 2B - Complications' },
  { id: 'act3', label: 'Act 3 - Resolution' },
];
