'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
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
import { MoveProjectToTeamDialog } from '@/components/move-project-to-team-dialog';
import { MoveSeriesToProjectDialog } from '@/components/move-series-to-project-dialog';
import { RenameScreenplayDialog } from '@/components/rename-screenplay-dialog';
import { RenameProjectDialog } from '@/components/project/rename-project-dialog';
import { RenameSeriesDialog } from '@/components/rename-series-dialog';
import { AddExistingScreenplayDialog } from '@/components/add-existing-screenplay-dialog';

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'screenplay' | 'project' | 'series';

// Entity-specific target types
export interface ScreenplayTarget {
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

export interface ProjectTarget {
  id: string;
  name: string;
  description?: string | null;
  banner?: string | null;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  isArchived?: boolean;
}

export interface SeriesTarget {
  id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  isArchived?: boolean;
}

// Discriminated union for type-safe entity handling
export type EntityTarget =
  | { type: 'screenplay'; entity: ScreenplayTarget }
  | { type: 'project'; entity: ProjectTarget }
  | { type: 'series'; entity: SeriesTarget };

// Dialog types
export type EntityDialogType =
  | 'delete'
  | 'rename'
  | 'moveToProject'
  | 'moveToTeam'
  | 'addScreenplay';

// ============================================================================
// Data Change Events
// ============================================================================

export const ENTITY_DATA_CHANGED_EVENTS = {
  screenplay: 'screenplay-data-changed',
  project: 'project-data-changed',
  series: 'series-data-changed',
} as const;

export function emitEntityDataChanged(type: EntityType) {
  window.dispatchEvent(new CustomEvent(ENTITY_DATA_CHANGED_EVENTS[type]));
}

// Legacy exports for backward compatibility
export const SCREENPLAY_DATA_CHANGED_EVENT = ENTITY_DATA_CHANGED_EVENTS.screenplay;
export const PROJECT_DATA_CHANGED_EVENT = ENTITY_DATA_CHANGED_EVENTS.project;
export const SERIES_DATA_CHANGED_EVENT = ENTITY_DATA_CHANGED_EVENTS.series;

export function emitScreenplayDataChanged() { emitEntityDataChanged('screenplay'); }
export function emitProjectDataChanged() { emitEntityDataChanged('project'); }
export function emitSeriesDataChanged() { emitEntityDataChanged('series'); }

// ============================================================================
// Context Interface
// ============================================================================

interface EntityActionsContextValue {
  // Dialog openers - generic
  openDeleteDialog: (target: EntityTarget) => void;
  openRenameDialog: (target: EntityTarget, extra?: { userId?: string }) => void;
  openMoveDialog: (target: EntityTarget, moveType: 'toProject' | 'toTeam') => void;
  openAddScreenplayDialog: (project: ProjectTarget) => void;

  // Direct actions
  doDelete: (target: EntityTarget) => Promise<void>;
  doToggleArchive: (target: EntityTarget) => Promise<void>;

  // Screenplay-specific actions
  doExportScreenplay: (screenplay: ScreenplayTarget) => Promise<void>;
  doToggleFavorite: (screenplay: ScreenplayTarget) => Promise<void>;
  doRemoveScreenplayFromProject: (screenplay: ScreenplayTarget) => Promise<void>;
  doRemoveScreenplayFromTeam: (screenplay: ScreenplayTarget) => Promise<void>;
  doCreateProjectFromScreenplay: (screenplay: ScreenplayTarget) => Promise<void>;

  // Project-specific actions
  doRemoveProjectFromTeam: (project: ProjectTarget) => Promise<void>;
  openProjectSettings: (projectId: string) => void;
  openNewScreenplayInProject: (projectId: string) => void;

  // Series-specific actions
  doRemoveSeriesFromProject: (series: SeriesTarget) => Promise<void>;
  openAddEpisodeToSeries: (seriesId: string) => void;
}

const EntityActionsContext = createContext<EntityActionsContextValue | null>(null);

// ============================================================================
// Dialog State Types
// ============================================================================

interface DialogState {
  type: EntityDialogType | null;
  target: EntityTarget | null;
  extra?: { userId?: string; moveType?: 'toProject' | 'toTeam' };
}

// ============================================================================
// Provider
// ============================================================================

interface EntityActionsProviderProps {
  children: ReactNode;
  onNewScreenplayInProject?: (projectId: string) => void;
  onAddEpisodeToSeries?: (seriesId: string) => void;
}

export function EntityActionsProvider({
  children,
  onNewScreenplayInProject,
  onAddEpisodeToSeries,
}: EntityActionsProviderProps) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, target: null });

  const closeDialog = useCallback(() => {
    setDialogState({ type: null, target: null });
  }, []);

  // ============================================================================
  // Dialog Openers
  // ============================================================================

  const openDeleteDialog = useCallback((target: EntityTarget) => {
    setDialogState({ type: 'delete', target });
  }, []);

  const openRenameDialog = useCallback((target: EntityTarget, extra?: { userId?: string }) => {
    setDialogState({ type: 'rename', target, extra });
  }, []);

  const openMoveDialog = useCallback((target: EntityTarget, moveType: 'toProject' | 'toTeam') => {
    const dialogType = moveType === 'toProject' ? 'moveToProject' : 'moveToTeam';
    setDialogState({ type: dialogType, target, extra: { moveType } });
  }, []);

  const openAddScreenplayDialog = useCallback((project: ProjectTarget) => {
    setDialogState({ type: 'addScreenplay', target: { type: 'project', entity: project } });
  }, []);

  // ============================================================================
  // Generic Actions
  // ============================================================================

  const doDelete = useCallback(async (target: EntityTarget) => {
    const apiPath = {
      screenplay: `/api/screenplays/${target.entity.id}`,
      project: `/api/projects/${target.entity.id}`,
      series: `/api/series/${target.entity.id}`,
    }[target.type];

    try {
      const response = await fetch(apiPath, { method: 'DELETE' });
      if (response.ok) {
        const label = target.type.charAt(0).toUpperCase() + target.type.slice(1);
        toast.success(`${label} deleted`);
        emitEntityDataChanged(target.type);
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error(`Error deleting ${target.type}:`, error);
      toast.error(`Failed to delete ${target.type}`);
    }
  }, []);

  const doToggleArchive = useCallback(async (target: EntityTarget) => {
    const apiPath = {
      screenplay: `/api/screenplays/${target.entity.id}`,
      project: `/api/projects/${target.entity.id}`,
      series: `/api/series/${target.entity.id}`,
    }[target.type];

    const isArchived = target.entity.isArchived;

    try {
      const response = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !isArchived }),
      });
      if (response.ok) {
        toast.success(isArchived ? 'Unarchived' : 'Archived');
        emitEntityDataChanged(target.type);
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, []);

  // ============================================================================
  // Screenplay-specific Actions
  // ============================================================================

  const doExportScreenplay = useCallback(async (screenplay: ScreenplayTarget) => {
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

  const doToggleFavorite = useCallback(async (screenplay: ScreenplayTarget) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !screenplay.isFavorite }),
      });
      if (response.ok) {
        toast.success(screenplay.isFavorite ? 'Removed from favorites' : 'Added to favorites');
        emitEntityDataChanged('screenplay');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  }, []);

  const doRemoveScreenplayFromProject = useCallback(async (screenplay: ScreenplayTarget) => {
    if (!screenplay.projectId) return;
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null }),
      });
      if (response.ok) {
        toast.success('Removed from project');
        emitEntityDataChanged('screenplay');
      }
    } catch (error) {
      console.error('Error removing from project:', error);
      toast.error('Failed to remove from project');
    }
  }, []);

  const doRemoveScreenplayFromTeam = useCallback(async (screenplay: ScreenplayTarget) => {
    if (!screenplay.teamId) return;
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null }),
      });
      if (response.ok) {
        toast.success('Removed from team');
        emitEntityDataChanged('screenplay');
      }
    } catch (error) {
      console.error('Error removing from team:', error);
      toast.error('Failed to remove from team');
    }
  }, []);

  const doCreateProjectFromScreenplay = useCallback(async (screenplay: ScreenplayTarget) => {
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
      emitEntityDataChanged('screenplay');
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  }, [router]);

  // ============================================================================
  // Project-specific Actions
  // ============================================================================

  const doRemoveProjectFromTeam = useCallback(async (project: ProjectTarget) => {
    if (!project.teamId) return;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null }),
      });
      if (response.ok) {
        toast.success('Removed from team');
        emitEntityDataChanged('project');
      }
    } catch (error) {
      console.error('Error removing from team:', error);
      toast.error('Failed to remove from team');
    }
  }, []);

  const openProjectSettings = useCallback((projectId: string) => {
    router.push(`/project/${projectId}/settings`);
  }, [router]);

  const openNewScreenplayInProject = useCallback((projectId: string) => {
    if (onNewScreenplayInProject) {
      onNewScreenplayInProject(projectId);
    } else {
      router.push(`/project/${projectId}`);
    }
  }, [onNewScreenplayInProject, router]);

  // ============================================================================
  // Series-specific Actions
  // ============================================================================

  const doRemoveSeriesFromProject = useCallback(async (series: SeriesTarget) => {
    if (!series.projectId) return;
    try {
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null }),
      });
      if (response.ok) {
        toast.success('Removed from project');
        emitEntityDataChanged('series');
      }
    } catch (error) {
      console.error('Error removing from project:', error);
      toast.error('Failed to remove from project');
    }
  }, []);

  const openAddEpisodeToSeries = useCallback((seriesId: string) => {
    if (onAddEpisodeToSeries) {
      onAddEpisodeToSeries(seriesId);
    } else {
      router.push(`/series/${seriesId}`);
    }
  }, [onAddEpisodeToSeries, router]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<EntityActionsContextValue>(() => ({
    openDeleteDialog,
    openRenameDialog,
    openMoveDialog,
    openAddScreenplayDialog,
    doDelete,
    doToggleArchive,
    doExportScreenplay,
    doToggleFavorite,
    doRemoveScreenplayFromProject,
    doRemoveScreenplayFromTeam,
    doCreateProjectFromScreenplay,
    doRemoveProjectFromTeam,
    openProjectSettings,
    openNewScreenplayInProject,
    doRemoveSeriesFromProject,
    openAddEpisodeToSeries,
  }), [
    openDeleteDialog,
    openRenameDialog,
    openMoveDialog,
    openAddScreenplayDialog,
    doDelete,
    doToggleArchive,
    doExportScreenplay,
    doToggleFavorite,
    doRemoveScreenplayFromProject,
    doRemoveScreenplayFromTeam,
    doCreateProjectFromScreenplay,
    doRemoveProjectFromTeam,
    openProjectSettings,
    openNewScreenplayInProject,
    doRemoveSeriesFromProject,
    openAddEpisodeToSeries,
  ]);

  // Helper to get entity name for dialog
  const getEntityName = (target: EntityTarget | null): string => {
    if (!target) return '';
    if (target.type === 'screenplay') return target.entity.title;
    if (target.type === 'project') return target.entity.name;
    if (target.type === 'series') return target.entity.title;
    return '';
  };

  const getEntityLabel = (target: EntityTarget | null): string => {
    if (!target) return '';
    return target.type.charAt(0).toUpperCase() + target.type.slice(1);
  };

  return (
    <EntityActionsContext.Provider value={value}>
      {children}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogState.type === 'delete'} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {getEntityLabel(dialogState.target)}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{getEntityName(dialogState.target)}&rdquo;?
              {dialogState.target?.type === 'series' && ' This will remove the series but keep its episodes.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dialogState.target) doDelete(dialogState.target);
                closeDialog();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Screenplay Dialogs */}
      {dialogState.target?.type === 'screenplay' && (
        <>
          {dialogState.type === 'rename' && (
            <RenameScreenplayDialog
              open
              onOpenChange={closeDialog}
              screenplayId={dialogState.target.entity.id}
              currentTitle={dialogState.target.entity.title}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('screenplay');
              }}
            />
          )}
          {dialogState.type === 'moveToProject' && (
            <MoveToProjectDialog
              open
              onOpenChange={closeDialog}
              screenplayId={dialogState.target.entity.id}
              screenplayTitle={dialogState.target.entity.title}
              currentProjectId={dialogState.target.entity.project?.id}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('screenplay');
              }}
            />
          )}
          {dialogState.type === 'moveToTeam' && (
            <MoveToTeamDialog
              open
              onOpenChange={closeDialog}
              screenplayId={dialogState.target.entity.id}
              screenplayTitle={dialogState.target.entity.title}
              currentTeamId={dialogState.target.entity.team?.id}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('screenplay');
              }}
            />
          )}
        </>
      )}

      {/* Project Dialogs */}
      {dialogState.target?.type === 'project' && (
        <>
          {dialogState.type === 'rename' && (
            <RenameProjectDialog
              open
              onOpenChange={closeDialog}
              projectId={dialogState.target.entity.id}
              currentName={dialogState.target.entity.name}
              currentDescription={dialogState.target.entity.description}
              currentBanner={dialogState.target.entity.banner}
              userId={dialogState.extra?.userId || ''}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('project');
              }}
            />
          )}
          {dialogState.type === 'moveToTeam' && (
            <MoveProjectToTeamDialog
              open
              onOpenChange={closeDialog}
              projectId={dialogState.target.entity.id}
              projectName={dialogState.target.entity.name}
              currentTeamId={dialogState.target.entity.team?.id}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('project');
              }}
            />
          )}
          {dialogState.type === 'addScreenplay' && (
            <AddExistingScreenplayDialog
              open
              onOpenChange={closeDialog}
              projectId={dialogState.target.entity.id}
              projectName={dialogState.target.entity.name}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('project');
              }}
            />
          )}
        </>
      )}

      {/* Series Dialogs */}
      {dialogState.target?.type === 'series' && (
        <>
          {dialogState.type === 'rename' && (
            <RenameSeriesDialog
              open
              onOpenChange={closeDialog}
              seriesId={dialogState.target.entity.id}
              currentTitle={dialogState.target.entity.title}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('series');
              }}
            />
          )}
          {dialogState.type === 'moveToProject' && (
            <MoveSeriesToProjectDialog
              open
              onOpenChange={closeDialog}
              seriesId={dialogState.target.entity.id}
              seriesTitle={dialogState.target.entity.title}
              currentProjectId={dialogState.target.entity.project?.id}
              onSuccess={() => {
                closeDialog();
                emitEntityDataChanged('series');
              }}
            />
          )}
        </>
      )}
    </EntityActionsContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access entity actions from context.
 * Must be used within EntityActionsProvider.
 */
export function useEntityActions() {
  const context = useContext(EntityActionsContext);
  if (!context) {
    throw new Error('useEntityActions must be used within EntityActionsProvider');
  }
  return context;
}

/**
 * Hook that returns all action handlers for a specific screenplay.
 */
export function useScreenplayActions(screenplay: ScreenplayTarget) {
  const ctx = useEntityActions();

  return {
    onRename: () => ctx.openRenameDialog({ type: 'screenplay', entity: screenplay }),
    onExport: () => ctx.doExportScreenplay(screenplay),
    onToggleFavorite: () => ctx.doToggleFavorite(screenplay),
    onDelete: () => ctx.openDeleteDialog({ type: 'screenplay', entity: screenplay }),
    onMoveToProject: () => ctx.openMoveDialog({ type: 'screenplay', entity: screenplay }, 'toProject'),
    onRemoveFromProject: screenplay.projectId ? () => ctx.doRemoveScreenplayFromProject(screenplay) : undefined,
    onCreateProject: !screenplay.projectId ? () => ctx.doCreateProjectFromScreenplay(screenplay) : undefined,
    onMoveToTeam: () => ctx.openMoveDialog({ type: 'screenplay', entity: screenplay }, 'toTeam'),
    onRemoveFromTeam: screenplay.teamId ? () => ctx.doRemoveScreenplayFromTeam(screenplay) : undefined,
    onArchive: () => ctx.doToggleArchive({ type: 'screenplay', entity: screenplay }),
  };
}

/**
 * Hook that returns all action handlers for a specific project.
 */
export function useProjectActions(project: ProjectTarget, userId?: string) {
  const ctx = useEntityActions();

  return {
    onNewScreenplay: () => ctx.openNewScreenplayInProject(project.id),
    onAddExistingScreenplay: () => ctx.openAddScreenplayDialog(project),
    onRename: userId ? () => ctx.openRenameDialog({ type: 'project', entity: project }, { userId }) : undefined,
    onSettings: () => ctx.openProjectSettings(project.id),
    onMoveToTeam: () => ctx.openMoveDialog({ type: 'project', entity: project }, 'toTeam'),
    onRemoveFromTeam: project.teamId ? () => ctx.doRemoveProjectFromTeam(project) : undefined,
    onArchive: () => ctx.doToggleArchive({ type: 'project', entity: project }),
    onDelete: () => ctx.openDeleteDialog({ type: 'project', entity: project }),
  };
}

/**
 * Hook that returns all action handlers for a specific series.
 */
export function useSeriesActions(series: SeriesTarget) {
  const ctx = useEntityActions();

  return {
    onRename: () => ctx.openRenameDialog({ type: 'series', entity: series }),
    onDelete: () => ctx.openDeleteDialog({ type: 'series', entity: series }),
    onMoveToProject: () => ctx.openMoveDialog({ type: 'series', entity: series }, 'toProject'),
    onRemoveFromProject: series.projectId ? () => ctx.doRemoveSeriesFromProject(series) : undefined,
    onArchive: () => ctx.doToggleArchive({ type: 'series', entity: series }),
    onAddEpisode: () => ctx.openAddEpisodeToSeries(series.id),
  };
}

/**
 * Hook for pages to listen to data change events and refresh.
 */
export function useEntityDataRefresh(type: EntityType, onRefresh: () => void) {
  React.useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener(ENTITY_DATA_CHANGED_EVENTS[type], handler);
    return () => window.removeEventListener(ENTITY_DATA_CHANGED_EVENTS[type], handler);
  }, [type, onRefresh]);
}

// Legacy data refresh hooks
export function useScreenplayDataRefresh(onRefresh: () => void) {
  useEntityDataRefresh('screenplay', onRefresh);
}

export function useProjectDataRefresh(onRefresh: () => void) {
  useEntityDataRefresh('project', onRefresh);
}

export function useSeriesDataRefresh(onRefresh: () => void) {
  useEntityDataRefresh('series', onRefresh);
}

// Re-export types for backward compatibility
export type { ScreenplayTarget as ScreenplayActionTarget };
export type { ProjectTarget as ProjectActionTarget };
export type { SeriesTarget as SeriesActionTarget };
