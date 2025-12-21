import { useState, useEffect, useCallback } from 'react';
import type { GreetingCategory } from '@/lib/greeting/types';

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
  projectId: string | null;
  project?: { id: string; name: string } | null;
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

/**
 * Hook for managing workspace data (screenplays, projects, stats)
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [stacks, setStacks] = useState<StackItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [screenplaysRes, projectsRes, seriesRes, stacksRes, statsRes] = await Promise.all([
        fetch('/api/screenplays'),
        fetch('/api/projects'),
        fetch('/api/series'),
        fetch('/api/stacks'),
        fetch('/api/dashboard/stats'),
      ]);

      if (screenplaysRes.ok) {
        const data = await screenplaysRes.json();
        setScreenplays(data.screenplays || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data);
      }

      if (seriesRes.ok) {
        const data = await seriesRes.json();
        setSeries(data || []);
      }

      if (stacksRes.ok) {
        const data = await stacksRes.json();
        setStacks(data || []);
      }

      if (statsRes.ok) {
        setDashboardStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      // Try to get error details from response
      let errorMessage = `Failed to delete ${type}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          // Include details if available (dev mode)
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        }
      } catch {
        // Response wasn't JSON, use status text
        errorMessage = `Failed to delete ${type}: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Reload data after deletion
    await loadData();
  }, [loadData]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

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
