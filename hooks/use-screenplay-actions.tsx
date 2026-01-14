'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoveToProjectDialog } from '@/components/move-to-project-dialog';
import { MoveToTeamDialog } from '@/components/move-to-team-dialog';
import {
  exportScreenplay,
  toggleFavorite,
  removeFromProject,
  removeFromTeam,
} from './screenplay/shared-actions';

// Minimal screenplay data needed for actions
export interface ScreenplayActionData {
  id: string;
  title: string;
  synopsis?: string | null;
  logline?: string | null;
  projectId?: string | null;
  teamId?: string | null;
  project?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  isFavorite?: boolean;
  content?: string;
}

interface ScreenplayActionsContextValue {
  // Delete
  requestDelete: (screenplay: ScreenplayActionData) => void;
  // Move to project
  requestMoveToProject: (screenplay: ScreenplayActionData) => void;
  // Move to team
  requestMoveToTeam: (screenplay: ScreenplayActionData) => void;
  // Refresh callback
  onRefresh: () => void;
}

const ScreenplayActionsContext = createContext<ScreenplayActionsContextValue | null>(null);

interface ScreenplayActionsProviderProps {
  children: ReactNode;
  onRefresh: () => void;
}

/**
 * Provider that manages shared screenplay action dialogs.
 * Wrap your page with this to enable useScreenplayActions hook.
 */
export function ScreenplayActionsProvider({ children, onRefresh }: ScreenplayActionsProviderProps) {
  const [deleteTarget, setDeleteTarget] = useState<ScreenplayActionData | null>(null);
  const [moveProjectTarget, setMoveProjectTarget] = useState<ScreenplayActionData | null>(null);
  const [moveTeamTarget, setMoveTeamTarget] = useState<ScreenplayActionData | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/screenplays/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Screenplay deleted');
        onRefresh();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting screenplay:', error);
      toast.error('Failed to delete screenplay');
    } finally {
      setDeleteTarget(null);
    }
  };

  const value: ScreenplayActionsContextValue = {
    requestDelete: setDeleteTarget,
    requestMoveToProject: setMoveProjectTarget,
    requestMoveToTeam: setMoveTeamTarget,
    onRefresh,
  };

  return (
    <ScreenplayActionsContext.Provider value={value}>
      {children}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenplay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Project Dialog */}
      {moveProjectTarget && (
        <MoveToProjectDialog
          open={!!moveProjectTarget}
          onOpenChange={(open) => !open && setMoveProjectTarget(null)}
          screenplayId={moveProjectTarget.id}
          screenplayTitle={moveProjectTarget.title}
          currentProjectId={moveProjectTarget.project?.id}
          onSuccess={onRefresh}
        />
      )}

      {/* Move to Team Dialog */}
      {moveTeamTarget && (
        <MoveToTeamDialog
          open={!!moveTeamTarget}
          onOpenChange={(open) => !open && setMoveTeamTarget(null)}
          screenplayId={moveTeamTarget.id}
          screenplayTitle={moveTeamTarget.title}
          currentTeamId={moveTeamTarget.team?.id}
          onSuccess={onRefresh}
        />
      )}
    </ScreenplayActionsContext.Provider>
  );
}

/**
 * Hook that returns all standard screenplay menu action handlers.
 * Must be used within a ScreenplayActionsProvider.
 */
export function useScreenplayActions(screenplay: ScreenplayActionData) {
  const context = useContext(ScreenplayActionsContext);
  const router = useRouter();

  if (!context) {
    throw new Error('useScreenplayActions must be used within a ScreenplayActionsProvider');
  }

  const { requestDelete, requestMoveToProject, requestMoveToTeam, onRefresh } = context;

  // Navigate to editor
  const handleEdit = useCallback(() => {
    router.push(`/screenplay/${screenplay.id}`);
  }, [router, screenplay.id]);

  // Export screenplay content
  const handleExport = useCallback(async () => {
    await exportScreenplay(screenplay);
  }, [screenplay]);

  // Toggle favorite status
  const handleToggleFavorite = useCallback(async () => {
    await toggleFavorite(screenplay, onRefresh);
  }, [screenplay, onRefresh]);

  // Delete screenplay (opens confirmation dialog)
  const handleDelete = useCallback(() => {
    requestDelete(screenplay);
  }, [requestDelete, screenplay]);

  // Move to project (opens dialog)
  const handleMoveToProject = useCallback(() => {
    requestMoveToProject(screenplay);
  }, [requestMoveToProject, screenplay]);

  // Remove from current project
  const handleRemoveFromProject = useCallback(async () => {
    await removeFromProject(screenplay, onRefresh);
  }, [screenplay, onRefresh]);

  // Create a new project from this screenplay
  const handleCreateProject = useCallback(async () => {
    try {
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: screenplay.title,
          description: screenplay.synopsis || screenplay.logline || null,
        }),
      });

      if (!projectResponse.ok) {
        const data = await projectResponse.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await projectResponse.json();

      const moveResponse = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!moveResponse.ok) {
        throw new Error('Failed to add screenplay to project');
      }

      toast.success('Project created');
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  }, [screenplay.id, screenplay.title, screenplay.synopsis, screenplay.logline, router]);

  // Move to team (opens dialog)
  const handleMoveToTeam = useCallback(() => {
    requestMoveToTeam(screenplay);
  }, [requestMoveToTeam, screenplay]);

  // Remove from current team
  const handleRemoveFromTeam = useCallback(async () => {
    await removeFromTeam(screenplay, onRefresh);
  }, [screenplay, onRefresh]);

  return {
    // All actions
    handleEdit,
    handleExport,
    handleToggleFavorite,
    handleDelete,
    handleMoveToProject,
    handleRemoveFromProject,
    handleCreateProject,
    handleMoveToTeam,
    handleRemoveFromTeam,

    // Conditional handlers (only defined when applicable)
    // Use these to conditionally show menu items
    actions: {
      onEdit: handleEdit,
      onExport: handleExport,
      onToggleFavorite: handleToggleFavorite,
      onDelete: handleDelete,
      onMoveToProject: handleMoveToProject,
      onRemoveFromProject: screenplay.projectId ? handleRemoveFromProject : undefined,
      onCreateProject: !screenplay.projectId ? handleCreateProject : undefined,
      onMoveToTeam: handleMoveToTeam,
      onRemoveFromTeam: screenplay.teamId ? handleRemoveFromTeam : undefined,
    },
  };
}

/**
 * Standalone hook for screenplay actions without provider.
 * Use this when you need actions but can't wrap with provider.
 * You must handle dialogs yourself.
 */
export function useScreenplayActionsStandalone(
  screenplay: ScreenplayActionData,
  callbacks: {
    onDelete?: () => void;
    onMoveToProject?: () => void;
    onMoveToTeam?: () => void;
    onRefresh?: () => void;
  }
) {
  const router = useRouter();

  const handleEdit = useCallback(() => {
    router.push(`/screenplay/${screenplay.id}`);
  }, [router, screenplay.id]);

  const handleExport = useCallback(async () => {
    await exportScreenplay(screenplay);
  }, [screenplay]);

  const handleToggleFavorite = useCallback(async () => {
    await toggleFavorite(screenplay, callbacks.onRefresh);
  }, [screenplay, callbacks.onRefresh]);

  const handleRemoveFromProject = useCallback(async () => {
    await removeFromProject(screenplay, callbacks.onRefresh);
  }, [screenplay, callbacks.onRefresh]);

  const handleRemoveFromTeam = useCallback(async () => {
    await removeFromTeam(screenplay, callbacks.onRefresh);
  }, [screenplay, callbacks.onRefresh]);

  return {
    handleEdit,
    handleExport,
    handleToggleFavorite,
    handleDelete: callbacks.onDelete,
    handleMoveToProject: callbacks.onMoveToProject,
    handleRemoveFromProject: screenplay.projectId ? handleRemoveFromProject : undefined,
    handleMoveToTeam: callbacks.onMoveToTeam,
    handleRemoveFromTeam: screenplay.teamId ? handleRemoveFromTeam : undefined,
  };
}
