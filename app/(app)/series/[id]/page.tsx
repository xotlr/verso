'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { NumberInput } from '@/components/ui/number-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLayout } from '@/components/layouts/page-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Tv, FileText, Users, Link as LinkIcon, Loader2 } from 'lucide-react';

// Import series components
import { SeriesBanner } from '@/components/series/series-banner';
import { SeasonSection } from '@/components/series/season-section';
import { SeriesOverviewTab } from '@/components/series/series-overview-tab';
import { SeriesCharactersTab } from '@/components/series/series-characters-tab';
import { SeriesResourcesTab } from '@/components/series/series-resources-tab';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Episode {
  id: string;
  title: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  wordCount: number;
  updatedAt: string;
  isFavorite: boolean;
}

interface SeriesData {
  id: string;
  title: string;
  logline: string | null;
  genre: string | null;
  format: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  episodes: Episode[];
  _count: { episodes: number };
}

// Group episodes by season
function groupBySeason(episodes: Episode[]): Map<number, Episode[]> {
  const grouped = new Map<number, Episode[]>();
  episodes.forEach(ep => {
    const season = ep.season || 1;
    if (!grouped.has(season)) {
      grouped.set(season, []);
    }
    grouped.get(season)!.push(ep);
  });
  return grouped;
}

export default function SeriesPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params.id as string;

  const { data: series, error, mutate } = useSWR<SeriesData>(
    `/api/series/${seriesId}`,
    fetcher
  );

  // Dialog states
  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [newEpisodeSeason, setNewEpisodeSeason] = useState(1);
  const [newEpisodeNumber, setNewEpisodeNumber] = useState(1);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState(false);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('episodes');

  // Auto-set episode number when adding to a season
  const openAddEpisode = useCallback((season?: number) => {
    const targetSeason = season || 1;
    setNewEpisodeSeason(targetSeason);

    if (series) {
      const seasonEpisodes = series.episodes.filter(ep => ep.season === targetSeason);
      const maxEpisode = Math.max(0, ...seasonEpisodes.map(ep => ep.episode || 0));
      setNewEpisodeNumber(maxEpisode + 1);
    } else {
      setNewEpisodeNumber(1);
    }

    setNewEpisodeTitle('');
    setIsAddingEpisode(true);
  }, [series]);

  const handleSeasonChange = (season: number) => {
    setNewEpisodeSeason(season);
    if (series) {
      const seasonEpisodes = series.episodes.filter(ep => ep.season === season);
      const maxEpisode = Math.max(0, ...seasonEpisodes.map(ep => ep.episode || 0));
      setNewEpisodeNumber(maxEpisode + 1);
    } else {
      setNewEpisodeNumber(1);
    }
  };

  const handleCreateEpisode = async () => {
    if (!newEpisodeTitle.trim()) return;

    setIsCreatingEpisode(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: newEpisodeSeason,
          episode: newEpisodeNumber,
          episodeTitle: newEpisodeTitle.trim(),
        }),
      });

      if (res.ok) {
        mutate();
        setIsAddingEpisode(false);
        setNewEpisodeTitle('');
        setNewEpisodeNumber(newEpisodeNumber + 1);
      }
    } catch (error) {
      console.error('Failed to create episode:', error);
    } finally {
      setIsCreatingEpisode(false);
    }
  };

  const handleDeleteEpisode = async () => {
    if (!deleteEpisodeId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/screenplays/${deleteEpisodeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        mutate();
        setDeleteEpisodeId(null);
      }
    } catch (error) {
      console.error('Failed to delete episode:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSeries = async () => {
    setIsDeletingSeries(true);
    try {
      const res = await fetch(`/api/series/${seriesId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/series');
      }
    } catch (error) {
      console.error('Failed to delete series:', error);
    } finally {
      setIsDeletingSeries(false);
    }
  };

  const handleSaveOverview = async (updates: {
    logline?: string;
    genre?: string;
    format?: string;
  }) => {
    const res = await fetch(`/api/series/${seriesId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      mutate();
    } else {
      throw new Error('Failed to save');
    }
  };

  // Loading state
  if (!series && !error) {
    return (
      <PageLayout narrow>
        <div className="space-y-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error || !series) {
    return (
      <PageLayout narrow>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <EmptyState
          icon={<Tv className="h-6 w-6 text-muted-foreground" />}
          title="Series not found"
          description="This series doesn't exist or you don't have access to it."
        />
      </PageLayout>
    );
  }

  const episodesBySeason = groupBySeason(series.episodes);
  const seasons = Array.from(episodesBySeason.keys()).sort((a, b) => a - b);
  const seasonCount = seasons.length || 1;

  return (
    <PageLayout narrow>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Series Banner */}
      <SeriesBanner
        series={series}
        seasonCount={seasonCount}
        onAddEpisode={() => openAddEpisode()}
        onEdit={() => setActiveTab('overview')}
        onDelete={() => setDeleteSeriesConfirm(true)}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="episodes" className="gap-1.5 px-3 py-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Episodes</span>
            <Badge variant="secondary" className="text-xs ml-1">
              {series._count.episodes}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5 px-3 py-1.5">
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="characters" className="gap-1.5 px-3 py-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Characters</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5 px-3 py-1.5">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
        </TabsList>

        {/* Episodes Tab */}
        <TabsContent value="episodes" className="mt-6 space-y-6">
          {seasons.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6 text-muted-foreground" />}
              title="No episodes yet"
              description="Create your first episode to get started."
              action={{
                label: 'Add Episode',
                onClick: () => openAddEpisode(1),
              }}
            />
          ) : (
            seasons.map(season => (
              <SeasonSection
                key={season}
                seasonNumber={season}
                episodes={episodesBySeason.get(season) || []}
                onAddEpisode={openAddEpisode}
                onDeleteEpisode={setDeleteEpisodeId}
              />
            ))
          )}

          {/* Add New Season Button */}
          {seasons.length > 0 && (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => openAddEpisode(Math.max(...seasons) + 1)}
            >
              + Add Season {Math.max(...seasons) + 1}
            </Button>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <SeriesOverviewTab series={series} onSave={handleSaveOverview} />
        </TabsContent>

        {/* Characters Tab */}
        <TabsContent value="characters" className="mt-6">
          <SeriesCharactersTab seriesId={seriesId} />
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-6">
          <SeriesResourcesTab seriesId={seriesId} />
        </TabsContent>
      </Tabs>

      {/* Add Episode Dialog */}
      <Dialog open={isAddingEpisode} onOpenChange={setIsAddingEpisode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Episode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Season</Label>
                <NumberInput
                  value={newEpisodeSeason}
                  onChange={handleSeasonChange}
                  min={1}
                  max={99}
                />
              </div>
              <div className="space-y-2">
                <Label>Episode</Label>
                <NumberInput
                  value={newEpisodeNumber}
                  onChange={setNewEpisodeNumber}
                  min={1}
                  max={999}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Episode Title</Label>
              <Input
                placeholder="Enter episode title"
                value={newEpisodeTitle}
                onChange={e => setNewEpisodeTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newEpisodeTitle.trim()) {
                    handleCreateEpisode();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAddingEpisode(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateEpisode}
                disabled={!newEpisodeTitle.trim() || isCreatingEpisode}
              >
                {isCreatingEpisode ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Episode'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Episode Confirmation */}
      <AlertDialog open={!!deleteEpisodeId} onOpenChange={() => setDeleteEpisodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this episode? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEpisode}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Series Confirmation */}
      <AlertDialog open={deleteSeriesConfirm} onOpenChange={setDeleteSeriesConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{series.title}&quot;? The episodes will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSeries}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeries}
              disabled={isDeletingSeries}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSeries ? 'Deleting...' : 'Delete Series'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
