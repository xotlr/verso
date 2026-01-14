'use client';

/**
 * @deprecated This file is maintained for backward compatibility.
 * Use EntityActionsProvider and useSeriesActions from '@/contexts/entity-actions-context' instead.
 */

import {
  EntityActionsProvider,
  useEntityActions,
  useSeriesDataRefresh,
  emitSeriesDataChanged,
  SERIES_DATA_CHANGED_EVENT,
  type SeriesTarget,
} from './entity-actions-context';

// Re-export provider
export { EntityActionsProvider as SeriesActionsProvider };

// Re-export utilities
export { useSeriesDataRefresh, emitSeriesDataChanged, SERIES_DATA_CHANGED_EVENT };

// Re-export type with old name
export type { SeriesTarget as SeriesActionTarget };

/**
 * @deprecated Use useEntityActions() or useSeriesActions(series) instead.
 * Compatibility hook that returns the old interface shape.
 */
export function useSeriesActionsContext() {
  const ctx = useEntityActions();

  return {
    openDelete: (series: SeriesTarget) =>
      ctx.openDeleteDialog({ type: 'series', entity: series }),
    openRename: (series: SeriesTarget) =>
      ctx.openRenameDialog({ type: 'series', entity: series }),
    openMoveToProject: (series: SeriesTarget) =>
      ctx.openMoveDialog({ type: 'series', entity: series }, 'toProject'),
    doRemoveFromProject: (series: SeriesTarget) =>
      ctx.doRemoveSeriesFromProject(series),
    doToggleArchive: (series: SeriesTarget) =>
      ctx.doToggleArchive({ type: 'series', entity: series }),
    openAddEpisode: (seriesId: string) =>
      ctx.openAddEpisodeToSeries(seriesId),
  };
}

/**
 * @deprecated Use useSeriesActions from entity-actions-context instead.
 */
export { useSeriesActions, useSeriesActions as useSeriesCardActions } from './entity-actions-context';
