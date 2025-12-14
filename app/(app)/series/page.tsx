'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar } from '@/components/ui/list-page-toolbar';
import { ListWithPreview } from '@/components/ui/list-preview-panel';
import { SeriesCard, SeriesCardSkeleton } from '@/components/series-card';
import { SeriesListRow, SeriesListRowSkeleton } from '@/components/series-list-row';
import { useViewMode } from '@/hooks/use-view-mode';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Tv,
  Loader2,
} from 'lucide-react';
import { genreOptions } from '@/types/templates';

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
  const { data: seriesList, error, mutate } = useSWR<Series[]>('/api/series', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useViewMode('series');
  const [hoveredSeries, setHoveredSeries] = useState<Series | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newLogline, setNewLogline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          genre: newGenre || undefined,
          logline: newLogline.trim() || undefined,
        }),
      });

      if (res.ok) {
        mutate();
        setIsCreating(false);
        setNewTitle('');
        setNewGenre('');
        setNewLogline('');
      }
    } catch (error) {
      console.error('Failed to create series:', error);
    } finally {
      setIsSubmitting(false);
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
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Series Title *</Label>
              <Input
                placeholder="Enter series name"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTitle.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={newGenre} onValueChange={setNewGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {genreOptions.map(genre => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Logline</Label>
              <Input
                placeholder="One-line summary (optional)"
                value={newLogline}
                onChange={e => setNewLogline(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Series'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PageLayout
        title="Series"
        description={`${filteredSeries.length} series${searchQuery ? ' (filtered)' : ''}`}
        actions={
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Series</span>
            <span className="sm:hidden">New</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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
                />
              ))}
            </div>
          </ListWithPreview>
        )}
      </PageLayout>
    </>
  );
}
