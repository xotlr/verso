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
import { RenameScreenplayDialog } from '@/components/rename-screenplay-dialog';

// Minimal screenplay data needed for actions
export interface ScreenplayActionTarget {
  id: string;
  title: string;
  synopsis?: string | null;
  logline?: string | null;
  projectId?: string | null;
  teamId?: string | null;
  project?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  isFavorite?: boolean;
  isArchived?: boolean;
}

// Event name for data refresh - pages can listen to this
export const SCREENPLAY_DATA_CHANGED_EVENT = 'screenplay-data-changed';

// Helper to emit refresh event
export function emitScreenplayDataChanged() {
  window.dispatchEvent(new CustomEvent(SCREENPLAY_DATA_CHANGED_EVENT));
}

interface ScreenplayActionsContextValue {
  // Open dialogs
  openDelete: (screenplay: ScreenplayActionTarget) => void;
  openRename: (screenplay: ScreenplayActionTarget) => void;
  openMoveToProject: (screenplay: ScreenplayActionTarget) => void;
  openMoveToTeam: (screenplay: ScreenplayActionTarget) => void;

  // Direct actions (no dialog needed)
  doExport: (screenplay: ScreenplayActionTarget) => Promise<void>;
  doToggleFavorite: (screenplay: ScreenplayActionTarget) => Promise<void>;
  doToggleArchive: (screenplay: ScreenplayActionTarget) => Promise<void>;
  doRemoveFromProject: (screenplay: ScreenplayActionTarget) => Promise<void>;
  doRemoveFromTeam: (screenplay: ScreenplayActionTarget) => Promise<void>;
  doCreateProject: (screenplay: ScreenplayActionTarget) => Promise<void>;
}

const ScreenplayActionsContext = createContext<ScreenplayActionsContextValue | null>(null);

/**
 * Provider that manages shared screenplay action dialogs.
 * Place this in your app layout to enable screenplay actions everywhere.
 */
export function ScreenplayActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ScreenplayActionTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<ScreenplayActionTarget | null>(null);
  const [moveProjectTarget, setMoveProjectTarget] = useState<ScreenplayActionTarget | null>(null);
  const [moveTeamTarget, setMoveTeamTarget] = useState<ScreenplayActionTarget | null>(null);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/screenplays/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Screenplay deleted');
        emitScreenplayDataChanged();
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

  // Export action
  const doExport = useCallback(async (screenplay: ScreenplayActionTarget) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${screenplay.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting screenplay:', error);
      toast.error('Failed to export screenplay');
    }
  }, []);

  // Toggle favorite action
  const doToggleFavorite = useCallback(async (screenplay: ScreenplayActionTarget) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !screenplay.isFavorite }),
      });
      if (response.ok) {
        toast.success(screenplay.isFavorite ? 'Removed from favorites' : 'Added to favorites');
        emitScreenplayDataChanged();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  }, []);

  // Toggle archive action
  const doToggleArchive = useCallback(async (screenplay: ScreenplayActionTarget) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !screenplay.isArchived }),
      });
      if (response.ok) {
        toast.success(screenplay.isArchived ? 'Unarchived' : 'Archived');
        emitScreenplayDataChanged();
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, []);

  // Remove from project action
  const doRemoveFromProject = useCallback(async (screenplay: ScreenplayActionTarget) => {
    if (!screenplay.projectId) return;
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null }),
      });
      if (response.ok) {
        toast.success('Removed from project');
        emitScreenplayDataChanged();
      }
    } catch (error) {
      console.error('Error removing from project:', error);
      toast.error('Failed to remove from project');
    }
  }, []);

  // Remove from team action
  const doRemoveFromTeam = useCallback(async (screenplay: ScreenplayActionTarget) => {
    if (!screenplay.teamId) return;
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null }),
      });
      if (response.ok) {
        toast.success('Removed from team');
        emitScreenplayDataChanged();
      }
    } catch (error) {
      console.error('Error removing from team:', error);
      toast.error('Failed to remove from team');
    }
  }, []);

  // Create project from screenplay action
  const doCreateProject = useCallback(async (screenplay: ScreenplayActionTarget) => {
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
      emitScreenplayDataChanged();
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  }, [router]);

  const value: ScreenplayActionsContextValue = {
    openDelete: setDeleteTarget,
    openRename: setRenameTarget,
    openMoveToProject: setMoveProjectTarget,
    openMoveToTeam: setMoveTeamTarget,
    doExport,
    doToggleFavorite,
    doToggleArchive,
    doRemoveFromProject,
    doRemoveFromTeam,
    doCreateProject,
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

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameScreenplayDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          screenplayId={renameTarget.id}
          currentTitle={renameTarget.title}
          onSuccess={emitScreenplayDataChanged}
        />
      )}

      {/* Move to Project Dialog */}
      {moveProjectTarget && (
        <MoveToProjectDialog
          open={!!moveProjectTarget}
          onOpenChange={(open) => !open && setMoveProjectTarget(null)}
          screenplayId={moveProjectTarget.id}
          screenplayTitle={moveProjectTarget.title}
          currentProjectId={moveProjectTarget.project?.id}
          onSuccess={emitScreenplayDataChanged}
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
          onSuccess={emitScreenplayDataChanged}
        />
      )}
    </ScreenplayActionsContext.Provider>
  );
}

/**
 * Hook to access screenplay actions from context.
 * Must be used within ScreenplayActionsProvider.
 */
export function useScreenplayActionsContext() {
  const context = useContext(ScreenplayActionsContext);
  if (!context) {
    throw new Error('useScreenplayActionsContext must be used within ScreenplayActionsProvider');
  }
  return context;
}

/**
 * Hook that returns all action handlers for a specific screenplay.
 * Use this in card components to get pre-bound handlers.
 */
export function useScreenplayCardActions(screenplay: ScreenplayActionTarget) {
  const {
    openDelete,
    openRename,
    openMoveToProject,
    openMoveToTeam,
    doExport,
    doToggleFavorite,
    doRemoveFromProject,
    doRemoveFromTeam,
    doCreateProject,
  } = useScreenplayActionsContext();

  return {
    onEdit: undefined, // Navigation is handled by Link, not an action
    onRename: () => openRename(screenplay),
    onExport: () => doExport(screenplay),
    onToggleFavorite: () => doToggleFavorite(screenplay),
    onDelete: () => openDelete(screenplay),
    onMoveToProject: () => openMoveToProject(screenplay),
    onRemoveFromProject: screenplay.projectId ? () => doRemoveFromProject(screenplay) : undefined,
    onCreateProject: !screenplay.projectId ? () => doCreateProject(screenplay) : undefined,
    onMoveToTeam: () => openMoveToTeam(screenplay),
    onRemoveFromTeam: screenplay.teamId ? () => doRemoveFromTeam(screenplay) : undefined,
  };
}

/**
 * Hook for pages to listen to data change events and refresh.
 */
export function useScreenplayDataRefresh(onRefresh: () => void) {
  React.useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener(SCREENPLAY_DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SCREENPLAY_DATA_CHANGED_EVENT, handler);
  }, [onRefresh]);
}
