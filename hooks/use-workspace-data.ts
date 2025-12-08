import { useState, useEffect, useCallback } from 'react';

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
}

export interface UseWorkspaceDataReturn {
  screenplays: ScreenplayItem[];
  projects: ProjectItem[];
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  loadData: () => Promise<void>;
  deleteItem: (id: string, type: 'screenplay' | 'project') => Promise<void>;
  setScreenplays: React.Dispatch<React.SetStateAction<ScreenplayItem[]>>;
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
}

/**
 * Hook for managing workspace data (screenplays, projects, stats)
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [screenplaysRes, projectsRes, statsRes] = await Promise.all([
        fetch('/api/screenplays'),
        fetch('/api/projects'),
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

      if (statsRes.ok) {
        setDashboardStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string, type: 'screenplay' | 'project') => {
    const endpoint = type === 'screenplay'
      ? `/api/screenplays/${id}`
      : `/api/projects/${id}`;

    const response = await fetch(endpoint, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`Failed to delete ${type}`);
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
    dashboardStats,
    isLoading,
    loadData,
    deleteItem,
    setScreenplays,
    setProjects,
  };
}
