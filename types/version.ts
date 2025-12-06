// Industry-standard screenplay revision colors (in order)
export const REVISION_COLORS = [
  'white',      // 1st draft (original)
  'blue',       // 1st revision
  'pink',       // 2nd revision
  'yellow',     // 3rd revision
  'green',      // 4th revision
  'goldenrod',  // 5th revision
  'buff',       // 6th revision
  'salmon',     // 7th revision
] as const;

export type RevisionColor = typeof REVISION_COLORS[number];

// Map revision colors to their display values
export const REVISION_COLOR_MAP: Record<RevisionColor, { name: string; hex: string; bg: string }> = {
  white: { name: 'White', hex: '#ffffff', bg: 'bg-white' },
  blue: { name: 'Blue', hex: '#93c5fd', bg: 'bg-blue-300' },
  pink: { name: 'Pink', hex: '#fbcfe8', bg: 'bg-pink-200' },
  yellow: { name: 'Yellow', hex: '#fef08a', bg: 'bg-yellow-200' },
  green: { name: 'Green', hex: '#86efac', bg: 'bg-green-300' },
  goldenrod: { name: 'Goldenrod', hex: '#fbbf24', bg: 'bg-amber-400' },
  buff: { name: 'Buff', hex: '#fed7aa', bg: 'bg-orange-200' },
  salmon: { name: 'Salmon', hex: '#fdba74', bg: 'bg-orange-300' },
};

export interface ScreenplayVersion {
  id: string;
  screenplayId: string;
  content: string;
  versionNumber: number;
  label: string | null;
  reason: "manual" | "auto" | "interval" | "restore";
  revisionColor: RevisionColor | null;
  wordCount: number;
  sceneCount: number;
  createdAt: string;
  createdBy: string;
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface VersionsResponse {
  versions: ScreenplayVersion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
