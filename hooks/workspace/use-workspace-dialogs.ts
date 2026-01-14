'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { ScreenplayItem, ProjectItem, SeriesItem, StackItem } from '@/hooks/use-workspace-data';

interface UseWorkspaceDialogsOptions {
  onDataRefresh?: () => void;
  onRenameStack?: (stackId: string, name: string) => Promise<void>;
  onRemoveFromStack?: (screenplayId: string, stackId: string) => Promise<void>;
  onAddToStack: (screenplayId: string, stackId: string) => Promise<void>;
}

/**
 * Hook for managing workspace dialog state and handlers.
 * Consolidates stack, project, and series dialog logic.
 */
export function useWorkspaceDialogs({
  onDataRefresh,
  onRenameStack,
  onRemoveFromStack,
  onAddToStack,
}: UseWorkspaceDialogsOptions) {
  // Stack dialog state
  const [selectedStack, setSelectedStack] = useState<StackItem | null>(null);
  const [stackDialogOpen, setStackDialogOpen] = useState(false);

  // Add to stack dialog state
  const [screenplayToAddToStack, setScreenplayToAddToStack] = useState<ScreenplayItem | null>(null);
  const [addToStackDialogOpen, setAddToStackDialogOpen] = useState(false);

  // Project dialogs
  const [projectToRename, setProjectToRename] = useState<ProjectItem | null>(null);
  const [projectToMoveToTeam, setProjectToMoveToTeam] = useState<ProjectItem | null>(null);
  const [projectToAddScreenplay, setProjectToAddScreenplay] = useState<ProjectItem | null>(null);

  // Series dialogs
  const [seriesToRename, setSeriesToRename] = useState<SeriesItem | null>(null);
  const [seriesToMoveToProject, setSeriesToMoveToProject] = useState<SeriesItem | null>(null);

  // Stack handlers
  const handleOpenStack = useCallback((stack: StackItem) => {
    setSelectedStack(stack);
    setStackDialogOpen(true);
  }, []);

  const handleRenameStack = useCallback(async (stackId: string, name: string) => {
    if (onRenameStack) {
      await onRenameStack(stackId, name);
      setSelectedStack(prev => prev?.id === stackId ? { ...prev, name } : prev);
    }
  }, [onRenameStack]);

  const handleRemoveFromStack = useCallback(async (screenplayId: string, stackId: string) => {
    if (onRemoveFromStack) {
      await onRemoveFromStack(screenplayId, stackId);
      setSelectedStack(prev => {
        if (!prev || prev.id !== stackId) return prev;
        const updatedScreenplays = prev.screenplays?.filter(s => s.id !== screenplayId) || [];
        if (updatedScreenplays.length === 0) {
          setStackDialogOpen(false);
          return null;
        }
        return {
          ...prev,
          screenplays: updatedScreenplays,
          _count: { screenplays: updatedScreenplays.length },
        };
      });
    }
  }, [onRemoveFromStack]);

  const handleOpenAddToStack = useCallback((screenplay: ScreenplayItem) => {
    setScreenplayToAddToStack(screenplay);
    setAddToStackDialogOpen(true);
  }, []);

  const handleAddScreenplayToStack = useCallback(async (stackId: string) => {
    if (screenplayToAddToStack) {
      await onAddToStack(screenplayToAddToStack.id, stackId);
      setAddToStackDialogOpen(false);
      setScreenplayToAddToStack(null);
    }
  }, [screenplayToAddToStack, onAddToStack]);

  const handleCreateNewStackForScreenplay = useCallback(async () => {
    // Stacks require 2+ screenplays - single-screenplay stacks not supported
    setAddToStackDialogOpen(false);
    setScreenplayToAddToStack(null);
  }, []);

  // Archive handlers
  const handleArchiveProject = useCallback(async (project: ProjectItem) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !project.isArchived }),
      });
      if (response.ok) {
        toast.success(project.isArchived ? 'Unarchived' : 'Archived');
        onDataRefresh?.();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, [onDataRefresh]);

  const handleArchiveSeries = useCallback(async (s: SeriesItem) => {
    try {
      const response = await fetch(`/api/series/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !s.isArchived }),
      });
      if (response.ok) {
        toast.success(s.isArchived ? 'Unarchived' : 'Archived');
        onDataRefresh?.();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, [onDataRefresh]);

  return {
    // Stack state
    selectedStack,
    setSelectedStack,
    stackDialogOpen,
    setStackDialogOpen,
    screenplayToAddToStack,
    addToStackDialogOpen,
    setAddToStackDialogOpen,

    // Project state
    projectToRename,
    setProjectToRename,
    projectToMoveToTeam,
    setProjectToMoveToTeam,
    projectToAddScreenplay,
    setProjectToAddScreenplay,

    // Series state
    seriesToRename,
    setSeriesToRename,
    seriesToMoveToProject,
    setSeriesToMoveToProject,

    // Handlers
    handleOpenStack,
    handleRenameStack,
    handleRemoveFromStack,
    handleOpenAddToStack,
    handleAddScreenplayToStack,
    handleCreateNewStackForScreenplay,
    handleArchiveProject,
    handleArchiveSeries,
  };
}

export type WorkspaceDialogsReturn = ReturnType<typeof useWorkspaceDialogs>;
