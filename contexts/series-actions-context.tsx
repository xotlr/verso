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
import { RenameSeriesDialog } from '@/components/rename-series-dialog';
import { MoveSeriesToProjectDialog } from '@/components/move-series-to-project-dialog';

// Minimal series data needed for actions
export interface SeriesActionTarget {
  id: string;
  title: string;
  logline?: string | null;
  genre?: string | null;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  isArchived?: boolean;
}

// Event name for data refresh - pages can listen to this
export const SERIES_DATA_CHANGED_EVENT = 'series-data-changed';

// Helper to emit refresh event
export function emitSeriesDataChanged() {
  window.dispatchEvent(new CustomEvent(SERIES_DATA_CHANGED_EVENT));
}

interface SeriesActionsContextValue {
  // Open dialogs
  openDelete: (series: SeriesActionTarget) => void;
  openRename: (series: SeriesActionTarget) => void;
  openMoveToProject: (series: SeriesActionTarget) => void;

  // Direct actions (no dialog needed)
  doRemoveFromProject: (series: SeriesActionTarget) => Promise<void>;
  doToggleArchive: (series: SeriesActionTarget) => Promise<void>;

  // Navigation actions
  openAddEpisode: (seriesId: string) => void;
}

const SeriesActionsContext = createContext<SeriesActionsContextValue | null>(null);

interface SeriesActionsProviderProps {
  children: ReactNode;
  onAddEpisodeToSeries?: (seriesId: string) => void;
}

/**
 * Provider that manages shared series action dialogs.
 * Place this in your app layout to enable series actions everywhere.
 */
export function SeriesActionsProvider({ children, onAddEpisodeToSeries }: SeriesActionsProviderProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<SeriesActionTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<SeriesActionTarget | null>(null);
  const [moveProjectTarget, setMoveProjectTarget] = useState<SeriesActionTarget | null>(null);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/series/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Series deleted');
        emitSeriesDataChanged();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error('Failed to delete series');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Remove from project action
  const doRemoveFromProject = useCallback(async (series: SeriesActionTarget) => {
    if (!series.projectId) return;
    try {
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null }),
      });
      if (response.ok) {
        toast.success('Removed from project');
        emitSeriesDataChanged();
      }
    } catch (error) {
      console.error('Error removing from project:', error);
      toast.error('Failed to remove from project');
    }
  }, []);

  // Toggle archive action
  const doToggleArchive = useCallback(async (series: SeriesActionTarget) => {
    try {
      const response = await fetch(`/api/series/${series.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !series.isArchived }),
      });
      if (response.ok) {
        toast.success(series.isArchived ? 'Unarchived' : 'Archived');
        emitSeriesDataChanged();
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to update archive status');
    }
  }, []);

  // Navigation action for adding episode
  const openAddEpisode = useCallback((seriesId: string) => {
    if (onAddEpisodeToSeries) {
      onAddEpisodeToSeries(seriesId);
    } else {
      // Fallback: navigate to series page where they can add episodes
      router.push(`/series/${seriesId}`);
    }
  }, [onAddEpisodeToSeries, router]);

  const value: SeriesActionsContextValue = {
    openDelete: setDeleteTarget,
    openRename: setRenameTarget,
    openMoveToProject: setMoveProjectTarget,
    doRemoveFromProject,
    doToggleArchive,
    openAddEpisode,
  };

  return (
    <SeriesActionsContext.Provider value={value}>
      {children}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This will remove the series but keep its episodes. This action cannot be undone.
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
        <RenameSeriesDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          seriesId={renameTarget.id}
          currentTitle={renameTarget.title}
          onSuccess={emitSeriesDataChanged}
        />
      )}
    </SeriesActionsContext.Provider>
  );
}

/**
 * Hook to access series actions from context.
 * Must be used within SeriesActionsProvider.
 */
export function useSeriesActionsContext() {
  const context = useContext(SeriesActionsContext);
  if (!context) {
    throw new Error('useSeriesActionsContext must be used within SeriesActionsProvider');
  }
  return context;
}

/**
 * Hook that returns all action handlers for a specific series.
 * Use this in card components to get pre-bound handlers.
 */
export function useSeriesCardActions(series: SeriesActionTarget) {
  const { openDelete, openRename } = useSeriesActionsContext();

  return {
    onEdit: undefined, // Navigation is handled by Link, not an action
    onRename: () => openRename(series),
    onDelete: () => openDelete(series),
  };
}

/**
 * Hook for pages to listen to data change events and refresh.
 */
export function useSeriesDataRefresh(onRefresh: () => void) {
  React.useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener(SERIES_DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SERIES_DATA_CHANGED_EVENT, handler);
  }, [onRefresh]);
}
