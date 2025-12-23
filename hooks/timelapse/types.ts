import type { PaginationResult } from '@/lib/verso';

export interface TimelapseOperation {
  id: string;
  operationType: 'insert' | 'delete' | 'replace';
  position: number | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  sequenceNumber: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface ScreenplayInfo {
  title: string;
  author: string;
  authorImage?: string;
}

export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10 | 20 | 50 | 100;

export interface TimelapsePlayerState {
  operations: TimelapseOperation[];
  currentIndex: number;
  currentContent: string;
  currentOperation: TimelapseOperation | null;
  isPlaying: boolean;
  isLoading: boolean;
  loadingProgress: number;
  loadingStatus: 'fetching' | 'computing' | 'done';
  error: string | null;
  speed: PlaybackSpeed;
  progress: number;
  totalCount: number;
  timelapseStarted: string | null;
  elapsedTime: number;
  totalDuration: number;
  paginationCache: Map<number, PaginationResult>;
}

export interface TimelapsePlayerActions {
  togglePlayback: () => void;
  stop: () => void;
  seekTo: (index: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  changeSpeed: (speed: PlaybackSpeed) => void;
  reload: () => void;
}

export interface FetchOperationsResult {
  operations: TimelapseOperation[];
  totalCount: number;
  timelapseStarted: string | null;
  nextCursor: string | null;
  screenplay?: ScreenplayInfo;
}
