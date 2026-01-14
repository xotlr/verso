'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use EntityActionsProvider and useScreenplayActions from '@/contexts/entity-actions-context' instead.
 */

import {
  EntityActionsProvider,
  useEntityActions,
  useScreenplayDataRefresh,
  emitScreenplayDataChanged,
  SCREENPLAY_DATA_CHANGED_EVENT,
  type ScreenplayTarget,
} from './entity-actions-context';

// Re-export provider
export { EntityActionsProvider as ScreenplayActionsProvider };

// Re-export utilities
export { useScreenplayDataRefresh, emitScreenplayDataChanged, SCREENPLAY_DATA_CHANGED_EVENT };

// Re-export type with old name
export type { ScreenplayTarget as ScreenplayActionTarget };

/**
 * @deprecated Use useEntityActions() or useScreenplayActions(screenplay) instead.
 * Compatibility hook that returns the old interface shape.
 */
export function useScreenplayActionsContext() {
  const ctx = useEntityActions();

  return {
    openDelete: (screenplay: ScreenplayTarget) =>
      ctx.openDeleteDialog({ type: 'screenplay', entity: screenplay }),
    openRename: (screenplay: ScreenplayTarget) =>
      ctx.openRenameDialog({ type: 'screenplay', entity: screenplay }),
    openMoveToProject: (screenplay: ScreenplayTarget) =>
      ctx.openMoveDialog({ type: 'screenplay', entity: screenplay }, 'toProject'),
    openMoveToTeam: (screenplay: ScreenplayTarget) =>
      ctx.openMoveDialog({ type: 'screenplay', entity: screenplay }, 'toTeam'),
    doExport: (screenplay: ScreenplayTarget) =>
      ctx.doExportScreenplay(screenplay),
    doToggleFavorite: (screenplay: ScreenplayTarget) =>
      ctx.doToggleFavorite(screenplay),
    doToggleArchive: (screenplay: ScreenplayTarget) =>
      ctx.doToggleArchive({ type: 'screenplay', entity: screenplay }),
    doRemoveFromProject: (screenplay: ScreenplayTarget) =>
      ctx.doRemoveScreenplayFromProject(screenplay),
    doRemoveFromTeam: (screenplay: ScreenplayTarget) =>
      ctx.doRemoveScreenplayFromTeam(screenplay),
    doCreateProject: (screenplay: ScreenplayTarget) =>
      ctx.doCreateProjectFromScreenplay(screenplay),
  };
}

/**
 * @deprecated Use useScreenplayActions from entity-actions-context instead.
 */
export { useScreenplayActions, useScreenplayActions as useScreenplayCardActions } from './entity-actions-context';
