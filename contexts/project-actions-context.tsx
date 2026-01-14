'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use EntityActionsProvider and useProjectActions from '@/contexts/entity-actions-context' instead.
 */

import {
  EntityActionsProvider,
  useEntityActions,
  useProjectDataRefresh,
  emitProjectDataChanged,
  PROJECT_DATA_CHANGED_EVENT,
  type ProjectTarget,
} from './entity-actions-context';

// Re-export provider
export { EntityActionsProvider as ProjectActionsProvider };

// Re-export utilities
export { useProjectDataRefresh, emitProjectDataChanged, PROJECT_DATA_CHANGED_EVENT };

// Re-export type with old name
export type { ProjectTarget as ProjectActionTarget };

/**
 * @deprecated Use useEntityActions() or useProjectActions(project) instead.
 * Compatibility hook that returns the old interface shape.
 */
export function useProjectActionsContext() {
  const ctx = useEntityActions();

  return {
    openDelete: (project: ProjectTarget) =>
      ctx.openDeleteDialog({ type: 'project', entity: project }),
    openRename: (project: ProjectTarget, userId: string) =>
      ctx.openRenameDialog({ type: 'project', entity: project }, { userId }),
    openMoveToTeam: (project: ProjectTarget) =>
      ctx.openMoveDialog({ type: 'project', entity: project }, 'toTeam'),
    openAddExistingScreenplay: (project: ProjectTarget) =>
      ctx.openAddScreenplayDialog(project),
    doRemoveFromTeam: (project: ProjectTarget) =>
      ctx.doRemoveProjectFromTeam(project),
    doToggleArchive: (project: ProjectTarget) =>
      ctx.doToggleArchive({ type: 'project', entity: project }),
    openSettings: (projectId: string) =>
      ctx.openProjectSettings(projectId),
    openNewScreenplay: (projectId: string) =>
      ctx.openNewScreenplayInProject(projectId),
  };
}

/**
 * @deprecated Use useProjectActions from entity-actions-context instead.
 */
export { useProjectActions, useProjectActions as useProjectCardActions } from './entity-actions-context';
