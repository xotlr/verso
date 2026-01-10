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
import { MoveProjectToTeamDialog } from '@/components/move-project-to-team-dialog';
import { RenameProjectDialog } from '@/components/project/rename-project-dialog';
import { AddExistingScreenplayDialog } from '@/components/add-existing-screenplay-dialog';

// Minimal project data needed for actions
export interface ProjectActionTarget {
  id: string;
  name: string;
  description?: string | null;
  banner?: string | null;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  isArchived?: boolean;
}

// Event name for data refresh - pages can listen to this
export const PROJECT_DATA_CHANGED_EVENT = 'project-data-changed';

// Helper to emit refresh event
export function emitProjectDataChanged() {
  window.dispatchEvent(new CustomEvent(PROJECT_DATA_CHANGED_EVENT));
}

interface ProjectActionsContextValue {
  // Open dialogs
  openDelete: (project: ProjectActionTarget) => void;
  openRename: (project: ProjectActionTarget, userId: string) => void;
  openMoveToTeam: (project: ProjectActionTarget) => void;
  openAddExistingScreenplay: (project: ProjectActionTarget) => void;

  // Direct actions (no dialog needed)
  doRemoveFromTeam: (project: ProjectActionTarget) => Promise<void>;
  doToggleArchive: (project: ProjectActionTarget) => Promise<void>;

  // Navigation actions
  openSettings: (projectId: string) => void;
  openNewScreenplay: (projectId: string) => void;
}

const ProjectActionsContext = createContext<ProjectActionsContextValue | null>(null);

interface ProjectActionsProviderProps {
  children: ReactNode;
  onNewScreenplayInProject?: (projectId: string) => void;
}

/**
 * Provider that manages shared project action dialogs.
 * Place this in your app layout to enable project actions everywhere.
 */
export function ProjectActionsProvider({ children, onNewScreenplayInProject }: ProjectActionsProviderProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ProjectActionTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ project: ProjectActionTarget; userId: string } | null>(null);
  const [moveTeamTarget, setMoveTeamTarget] = useState<ProjectActionTarget | null>(null);
  const [addScreenplayTarget, setAddScreenplayTarget] = useState<ProjectActionTarget | null>(null);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Project deleted');
        emitProjectDataChanged();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Remove from team action
  const doRemoveFromTeam = useCallback(async (project: ProjectActionTarget) => {
    if (!project.teamId) return;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null }),
      });
      if (response.ok) {
        toast.success('Removed from team');
        emitProjectDataChanged();
      }
    } catch (error) {
      console.error('Error removing from team:', error);
      toast.error('Failed to remove from team');
    }
  }, []);

  // Toggle archive action
  const doToggleArchive = useCallback(async (project: ProjectActionTarget) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !project.isArchived }),
      });
      if (response.ok) {
        toast.success(project.isArchived ? 'Unarchived' : 'Archived');
        emitProjectDataChanged();
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, []);

  // Navigation actions
  const openSettings = useCallback((projectId: string) => {
    router.push(`/project/${projectId}/settings`);
  }, [router]);

  const openNewScreenplay = useCallback((projectId: string) => {
    if (onNewScreenplayInProject) {
      onNewScreenplayInProject(projectId);
    } else {
      // Fallback: navigate to project page
      router.push(`/project/${projectId}`);
    }
  }, [onNewScreenplayInProject, router]);

  const value: ProjectActionsContextValue = {
    openDelete: setDeleteTarget,
    openRename: (project, userId) => setRenameTarget({ project, userId }),
    openMoveToTeam: setMoveTeamTarget,
    openAddExistingScreenplay: setAddScreenplayTarget,
    doRemoveFromTeam,
    doToggleArchive,
    openSettings,
    openNewScreenplay,
  };

  return (
    <ProjectActionsContext.Provider value={value}>
      {children}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone.
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

      {/* Move to Team Dialog */}
      {moveTeamTarget && (
        <MoveProjectToTeamDialog
          open={!!moveTeamTarget}
          onOpenChange={(open) => !open && setMoveTeamTarget(null)}
          projectId={moveTeamTarget.id}
          projectName={moveTeamTarget.name}
          currentTeamId={moveTeamTarget.team?.id}
          onSuccess={emitProjectDataChanged}
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameProjectDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          projectId={renameTarget.project.id}
          currentName={renameTarget.project.name}
          currentDescription={renameTarget.project.description}
          currentBanner={renameTarget.project.banner}
          userId={renameTarget.userId}
          onSuccess={() => {
            setRenameTarget(null);
            emitProjectDataChanged();
          }}
        />
      )}

      {/* Add Existing Screenplay Dialog */}
      {addScreenplayTarget && (
        <AddExistingScreenplayDialog
          open={!!addScreenplayTarget}
          onOpenChange={(open) => !open && setAddScreenplayTarget(null)}
          projectId={addScreenplayTarget.id}
          projectName={addScreenplayTarget.name}
          onSuccess={() => {
            setAddScreenplayTarget(null);
            emitProjectDataChanged();
          }}
        />
      )}
    </ProjectActionsContext.Provider>
  );
}

/**
 * Hook to access project actions from context.
 * Must be used within ProjectActionsProvider.
 */
export function useProjectActionsContext() {
  const context = useContext(ProjectActionsContext);
  if (!context) {
    throw new Error('useProjectActionsContext must be used within ProjectActionsProvider');
  }
  return context;
}

/**
 * Hook that returns all action handlers for a specific project.
 * Use this in card components to get pre-bound handlers.
 */
export function useProjectCardActions(project: ProjectActionTarget, userId?: string) {
  const {
    openDelete,
    openRename,
    openMoveToTeam,
    openAddExistingScreenplay,
    doRemoveFromTeam,
    doToggleArchive,
    openSettings,
    openNewScreenplay,
  } = useProjectActionsContext();

  return {
    onOpen: undefined, // Navigation is handled by Link, not an action
    onNewScreenplay: () => openNewScreenplay(project.id),
    onAddExistingScreenplay: () => openAddExistingScreenplay(project),
    onRename: userId ? () => openRename(project, userId) : undefined,
    onSettings: () => openSettings(project.id),
    onMoveToTeam: () => openMoveToTeam(project),
    onRemoveFromTeam: project.teamId ? () => doRemoveFromTeam(project) : undefined,
    onArchive: () => doToggleArchive(project),
    onDelete: () => openDelete(project),
  };
}

/**
 * Hook for pages to listen to data change events and refresh.
 */
export function useProjectDataRefresh(onRefresh: () => void) {
  React.useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener(PROJECT_DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_DATA_CHANGED_EVENT, handler);
  }, [onRefresh]);
}
