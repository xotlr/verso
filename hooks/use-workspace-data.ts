import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import type { GreetingCategory } from '@/lib/voice/features/greeting';

export interface ScreenplayItem {
  id: string;
  title: string;
  content: string;
  logline?: string | null;
  synopsis?: string | null;
  updatedAt: string;
  wordCount: number;
  genre?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  projectId: string | null;
  project?: { id: string; name: string } | null;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  author?: string | null;
  user?: { id: string; name: string | null } | null;
  // Series/TV fields
  type?: 'FILM' | 'TV' | null;
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
  seriesId?: string | null;
  series?: { id: string; title: string } | null;
  // Stack fields
  stackId?: string | null;
  stack?: { id: string; name: string } | null;
}

export interface ProjectRole {
  id: string;
  role: string;
  name: string;
  userId?: string | null;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status?: 'DEVELOPMENT' | 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION' | 'COMPLETED' | null;
  banner: string | null;
  logo: string | null;
  updatedAt: string;
  isArchived?: boolean;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  roles?: ProjectRole[];
  screenplays?: { id: string; title: string }[];
  _count: {
    screenplays: number;
    notes: number;
    schedules: number;
    budgets: number;
  };
}

export interface SeriesItem {
  id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  format?: string | null;
  updatedAt: string;
  isArchived?: boolean;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  _count?: { episodes: number };
}

export interface StackItem {
  id: string;
  name: string;
  updatedAt: string;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  screenplays?: { id: string; title: string; wordCount?: number }[];
  _count?: { screenplays: number };
}

export interface DashboardStats {
  screenplayCount: number;
  projectCount: number;
  wordsThisWeek: number;
  wordsToday: number;
  totalWordsAllTime: number;
  lastEditedGenre: string | null;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  lastWriteDate: string | null;
  recentGreetings: string[];
  recentCategories: GreetingCategory[];
}

interface WorkspaceData {
  screenplays: { items: ScreenplayItem[]; total: number; hasMore: boolean };
  projects: ProjectItem[];
  series: SeriesItem[];
  stacks: StackItem[];
  dashboardStats: DashboardStats;
}

export interface UseWorkspaceDataReturn {
  screenplays: ScreenplayItem[];
  projects: ProjectItem[];
  series: SeriesItem[];
  stacks: StackItem[];
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  loadData: () => Promise<void>;
  deleteItem: (id: string, type: 'screenplay' | 'project' | 'series' | 'stack') => Promise<void>;
  setScreenplays: React.Dispatch<React.SetStateAction<ScreenplayItem[]>>;
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  setSeries: React.Dispatch<React.SetStateAction<SeriesItem[]>>;
  setStacks: React.Dispatch<React.SetStateAction<StackItem[]>>;
}

// SWR fetcher with error handling
const fetcher = async (url: string): Promise<WorkspaceData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch workspace data');
  }
  return response.json();
};

/**
 * Hook for managing workspace data (screenplays, projects, stats)
 *
 * Uses SWR for:
 * - Instant cached renders on repeat visits (stale-while-revalidate)
 * - Background revalidation for fresh data
 * - Offline support via cache
 * - Request deduplication
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  // SWR for data fetching with caching
  const { data, isLoading: swrLoading, mutate } = useSWR<WorkspaceData>(
    '/api/workspace-data',
    fetcher,
    {
      // Revalidate on focus (user returns to tab)
      revalidateOnFocus: true,
      // Keep stale data while revalidating
      revalidateIfStale: true,
      // Retry on error
      errorRetryCount: 2,
      // Don't revalidate on mount if we have fresh data (< 30s old)
      dedupingInterval: 30000,
      // Keep previous data while loading new data
      keepPreviousData: true,
    }
  );

  // Local state for optimistic updates (drag-drop, etc.)
  // These allow immediate UI updates before server confirmation
  const [localScreenplays, setLocalScreenplays] = useState<ScreenplayItem[] | null>(null);
  const [localProjects, setLocalProjects] = useState<ProjectItem[] | null>(null);
  const [localSeries, setLocalSeries] = useState<SeriesItem[] | null>(null);
  const [localStacks, setLocalStacks] = useState<StackItem[] | null>(null);

  // Sync local state with SWR data when it changes
  useEffect(() => {
    if (data) {
      // Only reset local state if it was null (initial load)
      // This preserves optimistic updates during revalidation
      if (localScreenplays === null) setLocalScreenplays(null);
      if (localProjects === null) setLocalProjects(null);
      if (localSeries === null) setLocalSeries(null);
      if (localStacks === null) setLocalStacks(null);
    }
  }, [data, localScreenplays, localProjects, localSeries, localStacks]);

  // Use local state if set (optimistic update), otherwise use SWR data
  const screenplays = localScreenplays ?? data?.screenplays?.items ?? [];
  const projects = localProjects ?? data?.projects ?? [];
  const series = localSeries ?? data?.series ?? [];
  const stacks = localStacks ?? data?.stacks ?? [];
  const dashboardStats = data?.dashboardStats ?? null;

  // Wrapper setters that set local state for optimistic updates
  const setScreenplays = useCallback((value: React.SetStateAction<ScreenplayItem[]>) => {
    setLocalScreenplays((prev) => {
      const current = prev ?? data?.screenplays?.items ?? [];
      return typeof value === 'function' ? value(current) : value;
    });
  }, [data]);

  const setProjects = useCallback((value: React.SetStateAction<ProjectItem[]>) => {
    setLocalProjects((prev) => {
      const current = prev ?? data?.projects ?? [];
      return typeof value === 'function' ? value(current) : value;
    });
  }, [data]);

  const setSeries = useCallback((value: React.SetStateAction<SeriesItem[]>) => {
    setLocalSeries((prev) => {
      const current = prev ?? data?.series ?? [];
      return typeof value === 'function' ? value(current) : value;
    });
  }, [data]);

  const setStacks = useCallback((value: React.SetStateAction<StackItem[]>) => {
    setLocalStacks((prev) => {
      const current = prev ?? data?.stacks ?? [];
      return typeof value === 'function' ? value(current) : value;
    });
  }, [data]);

  // Reload data (triggers SWR revalidation)
  const loadData = useCallback(async () => {
    // Clear local optimistic state
    setLocalScreenplays(null);
    setLocalProjects(null);
    setLocalSeries(null);
    setLocalStacks(null);
    // Revalidate SWR cache
    await mutate();
  }, [mutate]);

  // Delete item and revalidate
  const deleteItem = useCallback(async (id: string, type: 'screenplay' | 'project' | 'series' | 'stack') => {
    const endpoints = {
      screenplay: `/api/screenplays/${id}`,
      project: `/api/projects/${id}`,
      series: `/api/series/${id}`,
      stack: `/api/stacks/${id}`,
    };
    const endpoint = endpoints[type];

    const response = await fetch(endpoint, { method: 'DELETE' });

    if (!response.ok) {
      let errorMessage = `Failed to delete ${type}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        }
      } catch {
        errorMessage = `Failed to delete ${type}: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Revalidate after deletion
    await loadData();
  }, [loadData]);

  // Combined loading state
  const isLoading = swrLoading && !data;

  return {
    screenplays,
    projects,
    series,
    stacks,
    dashboardStats,
    isLoading,
    loadData,
    deleteItem,
    setScreenplays,
    setProjects,
    setSeries,
    setStacks,
  };
}
