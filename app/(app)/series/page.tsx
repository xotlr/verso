'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { EmptyState } from '@/components/ui/empty-state';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar } from '@/components/ui/list-page-toolbar';
import { ListWithPreview } from '@/components/ui/list-preview-panel';
import {
  SeriesCard,
  SeriesCardSkeleton,
  SeriesListRow,
  SeriesListRowSkeleton,
  CreateSeriesDialog,
} from '@/components/series';
import { useViewMode } from '@/hooks/use-view-mode';
import { Plus, Tv } from 'lucide-react';
import { ImportDropZoneOverlay } from '@/components/import-drop-zone';
import type { ImportResult } from '@/components/import-drop-zone/types';
import { getImportQuipShort } from '@/lib/import-quips';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Series {
  id: string;
  title: string;
  logline: string | null;
  genre: string | null;
  format: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { episodes: number };
}

export default function SeriesListPage() {
  const router = useRouter();
  const { data: seriesList, error, mutate } = useSWR<Series[]>('/api/series', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useViewMode('series');
  const [hoveredSeries, setHoveredSeries] = useState<Series | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Delete series handler
  const deleteSeries = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/series/${deleteTarget}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        mutate();
        toast.success('Series deleted');
      } else {
        toast.error('Failed to delete series');
      }
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error('Failed to delete series');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Import handler - creates standalone screenplay
  const handleImportComplete = async (result: ImportResult) => {
    if (!result.success || !result.content) return;

    try {
      const response = await fetch('/api/screenplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title || 'Imported Screenplay',
          content: result.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create screenplay');
      }

      const screenplay = await response.json();
      toast.success(getImportQuipShort(result.title || screenplay.title));
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing screenplay:', error);
      toast.error('Failed to import screenplay');
    }
  };

  // Filter series by search query
  const filteredSeries = seriesList?.filter(series =>
    series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    series.logline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    series.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const isLoading = !seriesList && !error;

  if (error) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Tv className="h-6 w-6 text-muted-foreground" />}
          title="Failed to load series"
          description="There was an error loading your series. Please try again."
        />
      </PageLayout>
    );
  }

  return (
    <>
      {/* Create Series Dialog */}
      <CreateSeriesDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSuccess={() => mutate()}
      />

      {/* Drag-drop import overlay */}
      <ImportDropZoneOverlay
        enabled={true}
        onImportComplete={handleImportComplete}
        onImportError={(error) => toast.error(error)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this series? Episodes will be unlinked but not deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSeries}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageLayout
        title="Series"
        description={`${filteredSeries.length} series${searchQuery ? ' (filtered)' : ''}`}
        actions={
          <Button onClick={() => setIsCreating(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Series</span>
          </Button>
        }
      >
        {/* Search and View Toggle */}
        <ListPageToolbar
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: 'Search series...',
          }}
          viewMode={{
            value: viewMode,
            onChange: setViewMode,
          }}
          className="mb-6"
        />

        {/* Content Grid/List */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {[1, 2, 3].map((i) => (
                <SeriesCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <SeriesListRowSkeleton key={i} />
              ))}
            </div>
          )
        ) : filteredSeries.length === 0 ? (
          <EmptyState
            icon={<Tv className="h-6 w-6 text-muted-foreground" />}
            title={searchQuery ? 'No series found' : 'No series yet'}
            description={searchQuery
              ? 'Try a different search term'
              : 'Create your first TV series to get started.'}
            action={!searchQuery ? {
              label: 'Create Series',
              onClick: () => setIsCreating(true),
              icon: <Plus className="h-5 w-5" />,
            } : undefined}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {filteredSeries.map((series) => (
              <SeriesCard
                key={series.id}
                series={{
                  id: series.id,
                  title: series.title,
                  logline: series.logline,
                  genre: series.genre,
                  format: series.format,
                  updatedAt: series.updatedAt,
                  _count: series._count,
                }}
                onEdit={() => router.push(`/series/${series.id}`)}
                onDelete={() => setDeleteTarget(series.id)}
              />
            ))}
          </div>
        ) : (
          <ListWithPreview
            preview={
              hoveredSeries ? (
                <SeriesCard
                  series={{
                    id: hoveredSeries.id,
                    title: hoveredSeries.title,
                    logline: hoveredSeries.logline,
                    genre: hoveredSeries.genre,
                    format: hoveredSeries.format,
                    updatedAt: hoveredSeries.updatedAt,
                    _count: hoveredSeries._count,
                  }}
                />
              ) : null
            }
          >
            <div className="space-y-2">
              {filteredSeries.map((series) => (
                <SeriesListRow
                  key={series.id}
                  series={{
                    id: series.id,
                    title: series.title,
                    logline: series.logline,
                    genre: series.genre,
                    format: series.format,
                    updatedAt: series.updatedAt,
                    _count: series._count,
                  }}
                  isHovered={hoveredSeries?.id === series.id}
                  onHover={() => setHoveredSeries(series)}
                  onLeave={() => setHoveredSeries(null)}
                  onEdit={() => router.push(`/series/${series.id}`)}
                  onDelete={() => setDeleteTarget(series.id)}
                />
              ))}
            </div>
          </ListWithPreview>
        )}
      </PageLayout>
    </>
  );
}
