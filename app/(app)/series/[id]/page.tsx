'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { NumberInput } from '@/components/ui/number-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tv,
  FileText,
  Loader2,
  Plus,
  ArrowLeft,
  Pencil,
} from 'lucide-react';
import {
  PiFilmScript,
  PiFilmScriptFill,
  PiUsers,
  PiUsersFill,
  PiLink,
  PiLinkFill,
} from 'react-icons/pi';
import { formatDistanceToNow } from 'date-fns';

// Import series components
import { SeasonSection } from '@/components/series/season-section';
import { SeriesCharactersTab } from '@/components/series/series-characters-tab';
import { SeriesResourcesTab } from '@/components/series/series-resources-tab';
import { EditSeriesDialog } from '@/components/series/edit-series-dialog';
import { ImportDropZoneOverlay } from '@/components/import-drop-zone';
import type { ImportResult } from '@/components/import-drop-zone/types';
import { getImportQuipShort } from '@/lib/import-quips';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Episode {
  id: string;
  title: string;
  episode: number | null;
  episodeTitle: string | null;
  wordCount: number;
  updatedAt: string;
  isFavorite: boolean;
}

interface Season {
  id: string;
  number: number;
  title: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  episodes: Episode[];
  _count: { episodes: number };
}

interface SeriesData {
  id: string;
  title: string;
  logline: string | null;
  genre: string | null;
  format: string | null;
  banner: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  seasons: Season[];
  // Legacy: direct episodes for backward compatibility
  episodes: Array<{
    id: string;
    title: string;
    season: number | null;
    episode: number | null;
    episodeTitle: string | null;
    wordCount: number;
    updatedAt: string;
    isFavorite: boolean;
  }>;
  _count: { episodes: number; seasons: number };
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
  const [isAddingSeason, setIsAddingSeason] = useState(false);
  const [isEditingSeason, setIsEditingSeason] = useState<Season | null>(null);
  const [deleteSeasonId, setDeleteSeasonId] = useState<string | null>(null);
  const [deleteSeasonInfo, setDeleteSeasonInfo] = useState<{ number: number; episodeCount: number } | null>(null);
  const [isDeletingSeason, setIsDeletingSeason] = useState(false);

  const [newSeasonNumber, setNewSeasonNumber] = useState(1);
  const [newSeasonTitle, setNewSeasonTitle] = useState('');
  const [newSeasonDescription, setNewSeasonDescription] = useState('');
  const [newSeasonStatus, setNewSeasonStatus] = useState<string>('planning');
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [isUpdatingSeason, setIsUpdatingSeason] = useState(false);

  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [addEpisodeSeasonId, setAddEpisodeSeasonId] = useState<string | null>(null);
  const [newEpisodeNumber, setNewEpisodeNumber] = useState(1);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);

  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit/Delete series state
  const [isEditingSeriesDialog, setIsEditingSeriesDialog] = useState(false);
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState(false);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('episodes');

  // Auto-set season number when adding
  const openAddSeason = useCallback(() => {
    if (series) {
      const maxSeason = Math.max(0, ...series.seasons.map(s => s.number));
      setNewSeasonNumber(maxSeason + 1);
    } else {
      setNewSeasonNumber(1);
    }
    setNewSeasonTitle('');
    setNewSeasonDescription('');
    setNewSeasonStatus('planning');
    setIsAddingSeason(true);
  }, [series]);

  const openEditSeason = useCallback((season: Season) => {
    setIsEditingSeason(season);
    setNewSeasonNumber(season.number);
    setNewSeasonTitle(season.title || '');
    setNewSeasonDescription(season.description || '');
    setNewSeasonStatus(season.status);
  }, []);

  const openDeleteSeason = useCallback((season: Season) => {
    setDeleteSeasonId(season.id);
    setDeleteSeasonInfo({
      number: season.number,
      episodeCount: season._count.episodes,
    });
  }, []);

  // Add episode within a season
  const openAddEpisode = useCallback((seasonId: string) => {
    const season = series?.seasons.find(s => s.id === seasonId);
    if (season) {
      const maxEpisode = Math.max(0, ...season.episodes.map(ep => ep.episode || 0));
      setNewEpisodeNumber(maxEpisode + 1);
    } else {
      setNewEpisodeNumber(1);
    }
    setAddEpisodeSeasonId(seasonId);
    setNewEpisodeTitle('');
    setIsAddingEpisode(true);
  }, [series]);

  const handleCreateSeason = async () => {
    setIsCreatingSeason(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newSeasonNumber,
          title: newSeasonTitle.trim() || null,
          description: newSeasonDescription.trim() || null,
          status: newSeasonStatus,
        }),
      });

      if (res.ok) {
        mutate();
        setIsAddingSeason(false);
      }
    } catch (error) {
      console.error('Failed to create season:', error);
    } finally {
      setIsCreatingSeason(false);
    }
  };

  const handleUpdateSeason = async () => {
    if (!isEditingSeason) return;

    setIsUpdatingSeason(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/seasons/${isEditingSeason.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSeasonTitle.trim() || null,
          description: newSeasonDescription.trim() || null,
          status: newSeasonStatus,
        }),
      });

      if (res.ok) {
        mutate();
        setIsEditingSeason(null);
      }
    } catch (error) {
      console.error('Failed to update season:', error);
    } finally {
      setIsUpdatingSeason(false);
    }
  };

  const handleDeleteSeason = async () => {
    if (!deleteSeasonId) return;

    setIsDeletingSeason(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/seasons/${deleteSeasonId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        mutate();
        setDeleteSeasonId(null);
        setDeleteSeasonInfo(null);
      }
    } catch (error) {
      console.error('Failed to delete season:', error);
    } finally {
      setIsDeletingSeason(false);
    }
  };

  const handleCreateEpisode = async () => {
    if (!newEpisodeTitle.trim() || !addEpisodeSeasonId) return;

    setIsCreatingEpisode(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/seasons/${addEpisodeSeasonId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode: newEpisodeNumber,
          episodeTitle: newEpisodeTitle.trim(),
        }),
      });

      if (res.ok) {
        mutate();
        setIsAddingEpisode(false);
        setAddEpisodeSeasonId(null);
        setNewEpisodeTitle('');
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

  // Import handler - creates episode in this series
  const handleImportComplete = async (result: ImportResult) => {
    if (!result.success || !result.content) return;

    try {
      const response = await fetch('/api/screenplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title || 'Imported Episode',
          content: result.content,
          seriesId: seriesId,
          type: 'TV',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create episode');
      }

      const screenplay = await response.json();
      toast.success(getImportQuipShort(result.title || screenplay.title));
      mutate();
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing episode:', error);
      toast.error('Failed to import episode');
    }
  };

  // Delete series handler
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

  // Save series handler
  const handleSaveSeries = async (updates: {
    title?: string;
    logline?: string;
    genre?: string;
    format?: string;
    banner?: string | null;
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

  // Parse genres
  const genres = series?.genre
    ? series.genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  // Loading state
  if (!series && !error) {
    return <SeriesPageSkeleton />;
  }

  // Error state
  if (error || !series) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Empty>
          <EmptyMedia variant="icon">
            <Tv className="h-6 w-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Series not found</EmptyTitle>
            <EmptyDescription>This series doesn&apos;t exist or you don&apos;t have access to it.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Format display
  const formatDisplay = series.format
    ? series.format.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null;

  const totalEpisodes = series.seasons.reduce((sum, s) => sum + s._count.episodes, 0) || series._count.episodes;

  return (
    <ScrollArea className="h-full">
      {/* Drag-drop import overlay */}
      <ImportDropZoneOverlay
        enabled={true}
        onImportComplete={handleImportComplete}
        onImportError={(error) => toast.error(error)}
      />

      {/* Banner */}
      <div className="relative h-48 md:h-56">
        {series.banner ? (
          <img
            src={series.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/80 to-muted/40" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            variant="glass"
            size="sm"
            onClick={() => router.push('/series')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{series.title}</h1>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditingSeriesDialog(true)}
                aria-label="Edit series"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            {/* Genre Pills */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                  <Badge key={genre} variant="secondary" className="bg-background/50 backdrop-blur-sm">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Meta info */}
          <div className="mb-6">
            {/* Logline */}
            {series.logline && (
              <p className="text-muted-foreground mb-3">{series.logline}</p>
            )}
            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{series.seasons.length || series._count.seasons} {(series.seasons.length || series._count.seasons) === 1 ? 'season' : 'seasons'}</span>
              <span>&middot;</span>
              <span>{totalEpisodes} {totalEpisodes === 1 ? 'episode' : 'episodes'}</span>
              {formatDisplay && (
                <>
                  <span>&middot;</span>
                  <span>{formatDisplay}</span>
                </>
              )}
              <span>&middot;</span>
              <span>Updated {formatDistanceToNow(new Date(series.updatedAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="episodes" className="gap-1.5 px-3 py-1.5">
                {activeTab === 'episodes' ? (
                  <PiFilmScriptFill className="h-4 w-4" />
                ) : (
                  <PiFilmScript className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Episodes</span>
                <Badge variant="secondary" className="text-xs ml-1">
                  {totalEpisodes}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="characters" className="gap-1.5 px-3 py-1.5">
                {activeTab === 'characters' ? (
                  <PiUsersFill className="h-4 w-4" />
                ) : (
                  <PiUsers className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Characters</span>
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-1.5 px-3 py-1.5">
                {activeTab === 'resources' ? (
                  <PiLinkFill className="h-4 w-4" />
                ) : (
                  <PiLink className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Resources</span>
              </TabsTrigger>
            </TabsList>

            {/* Action buttons below tabs */}
            {activeTab === 'episodes' && (
              <div className="flex gap-2 mt-4">
                <Button onClick={openAddSeason} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Season
                </Button>
              </div>
            )}

            {/* Episodes Tab */}
            <TabsContent value="episodes" className="mt-6 space-y-6">
              {series.seasons.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <FileText className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No seasons yet</EmptyTitle>
                    <EmptyDescription>Create your first season to start adding episodes.</EmptyDescription>
                  </EmptyHeader>
                  <Button onClick={openAddSeason} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Season
                  </Button>
                </Empty>
              ) : (
                series.seasons.map(season => (
                  <SeasonSection
                    key={season.id}
                    season={season}
                    onAddEpisode={() => openAddEpisode(season.id)}
                    onEditSeason={() => openEditSeason(season)}
                    onDeleteSeason={() => openDeleteSeason(season)}
                    onDeleteEpisode={setDeleteEpisodeId}
                  />
                ))
              )}

              {/* Add New Season Button */}
              {series.seasons.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={openAddSeason}
                >
                  + Add Season {Math.max(0, ...series.seasons.map(s => s.number)) + 1}
                </Button>
              )}
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
      </div>

      {/* Add Season Dialog */}
      <Dialog open={isAddingSeason} onOpenChange={setIsAddingSeason}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Season Number</Label>
              <NumberInput
                value={newSeasonNumber}
                onChange={setNewSeasonNumber}
                min={1}
                max={99}
              />
            </div>
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                placeholder="e.g., The Beginning"
                value={newSeasonTitle}
                onChange={e => setNewSeasonTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this season..."
                value={newSeasonDescription}
                onChange={e => setNewSeasonDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newSeasonStatus} onValueChange={setNewSeasonStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAddingSeason(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSeason}
                disabled={isCreatingSeason}
              >
                {isCreatingSeason ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Season'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Season Dialog */}
      <Dialog open={!!isEditingSeason} onOpenChange={() => setIsEditingSeason(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Season {isEditingSeason?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                placeholder="e.g., The Beginning"
                value={newSeasonTitle}
                onChange={e => setNewSeasonTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this season..."
                value={newSeasonDescription}
                onChange={e => setNewSeasonDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newSeasonStatus} onValueChange={setNewSeasonStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsEditingSeason(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSeason}
                disabled={isUpdatingSeason}
              >
                {isUpdatingSeason ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Season Confirmation */}
      <AlertDialog open={!!deleteSeasonId} onOpenChange={() => setDeleteSeasonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season {deleteSeasonInfo?.number}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSeasonInfo?.episodeCount && deleteSeasonInfo.episodeCount > 0 ? (
                <>
                  This will permanently delete Season {deleteSeasonInfo.number} and{' '}
                  <strong>{deleteSeasonInfo.episodeCount} episode{deleteSeasonInfo.episodeCount !== 1 ? 's' : ''}</strong>.
                  This action cannot be undone.
                </>
              ) : (
                'Are you sure you want to delete this season? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSeason}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeason}
              disabled={isDeletingSeason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSeason ? 'Deleting...' : 'Delete Season'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Episode Dialog */}
      <Dialog open={isAddingEpisode} onOpenChange={setIsAddingEpisode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Episode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Episode Number</Label>
              <NumberInput
                value={newEpisodeNumber}
                onChange={setNewEpisodeNumber}
                min={1}
                max={999}
              />
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

      {/* Edit Series Dialog */}
      <EditSeriesDialog
        open={isEditingSeriesDialog}
        onOpenChange={setIsEditingSeriesDialog}
        series={series}
        userId=""
        onSave={handleSaveSeries}
      />

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
    </ScrollArea>
  );
}

function SeriesPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Banner skeleton */}
      <Skeleton className="h-48 md:h-56 w-full flex-shrink-0" />
      {/* Content skeleton */}
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Skeleton className="h-5 w-full max-w-2xl mb-3" />
        <Skeleton className="h-4 w-48 mb-6" />
        <Skeleton className="h-10 w-72 mb-4" />
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
