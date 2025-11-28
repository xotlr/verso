export interface ScreenplayVersion {
  id: string;
  screenplayId: string;
  content: string;
  versionNumber: number;
  label: string | null;
  reason: "manual" | "auto" | "interval" | "restore";
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
