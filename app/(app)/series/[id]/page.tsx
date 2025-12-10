'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { NumberInput } from '@/components/ui/number-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Plus,
  Tv,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit3,
  FileText,
  Loader2,
} from 'lucide-react';

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
  // Sort episodes within each season
  grouped.forEach((eps, _season) => {
    eps.sort((a, b) => (a.episode || 0) - (b.episode || 0));
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

  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [newEpisodeSeason, setNewEpisodeSeason] = useState(1);
  const [newEpisodeNumber, setNewEpisodeNumber] = useState(1);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState(false);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  // Auto-set episode number when season changes
  const handleSeasonChange = (season: number) => {
    setNewEpisodeSeason(season);
    // Find next episode number for this season
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
        // Increment episode number for convenience
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
        router.push('/home');
      }
    } catch (error) {
      console.error('Failed to delete series:', error);
    } finally {
      setIsDeletingSeries(false);
    }
  };

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <EmptyState
          icon={<Tv className="h-6 w-6 text-muted-foreground" />}
          title="Series not found"
          description="This series doesn't exist or you don't have access to it."
        />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-4 mt-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const episodesBySeason = groupBySeason(series.episodes);
  const seasons = Array.from(episodesBySeason.keys()).sort((a, b) => a - b);

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Tv className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">{series.title}</h1>
            {series.genre && (
              <Badge variant="secondary">{series.genre}</Badge>
            )}
          </div>
          {series.logline && (
            <p className="text-muted-foreground mt-1">{series.logline}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{series._count.episodes} episodes</span>
            {series.format && (
              <span className="capitalize">{series.format.replace('-', ' ')}</span>
            )}
            {series.project && (
              <Link href={`/project/${series.project.id}`} className="hover:underline">
                Project: {series.project.name}
              </Link>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Series
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteSeriesConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Series
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Episode Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Episodes</h2>
        <Button onClick={() => setIsAddingEpisode(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Episode
        </Button>
      </div>

      {/* Episodes by Season */}
      {seasons.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          title="No episodes yet"
          description="Create your first episode to get started."
          action={{
            label: 'Add Episode',
            onClick: () => setIsAddingEpisode(true),
          }}
        />
      ) : (
        <div className="space-y-8">
          {seasons.map(season => (
            <div key={season}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Season {season}
              </h3>
              <div className="space-y-2">
                {episodesBySeason.get(season)!.map(episode => (
                  <Link
                    key={episode.id}
                    href={`/screenplay/${episode.id}`}
                    className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-muted-foreground w-16">
                        S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')}
                      </span>
                      <div>
                        <h4 className="font-medium group-hover:underline">
                          {episode.episodeTitle || 'Untitled'}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{episode.wordCount.toLocaleString()} words</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(episode.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.preventDefault();
                          router.push(`/screenplay/${episode.id}`);
                        }}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteEpisodeId(episode.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
              />
            </div>
            <div className="flex justify-end gap-2">
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
    </div>
  );
}
