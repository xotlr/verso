'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Tv,
  FileText,
  Users,
  Link as LinkIcon,
  Loader2,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2,
  Clock,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Import series components
import { SeasonSection } from '@/components/series/season-section';
import { EditSeriesDialog } from '@/components/series/edit-series-dialog';
import { SeriesCharactersTab } from '@/components/series/series-characters-tab';
import { SeriesResourcesTab } from '@/components/series/series-resources-tab';

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
  const { data: session } = useSession();
  const seriesId = params.id as string;

  const { data: series, error, mutate } = useSWR<SeriesData>(
    `/api/series/${seriesId}`,
    fetcher
  );

  // Edit series dialog state
  const [isEditingSeriesDialog, setIsEditingSeriesDialog] = useState(false);

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

  // Loading state
  if (!series && !error) {
    return <SeriesPageSkeleton />;
  }

  // Error state
  if (error || !series) {
    return (
      <div className="min-h-screen">
        <div className="h-48 md:h-64 bg-muted" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <EmptyState
            icon={<Tv className="h-6 w-6 text-muted-foreground" />}
            title="Series not found"
            description="This series doesn't exist or you don't have access to it."
          />
        </div>
      </div>
    );
  }

  // Parse genres from comma-separated string
  const genres = series.genre
    ? series.genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  // Format display
  const formatDisplay = series.format
    ? series.format.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null;

  const totalEpisodes = series.seasons.reduce((sum, s) => sum + s._count.episodes, 0) || series._count.episodes;

  return (
    <div className="min-h-screen">
      {/* Full-width Banner */}
      <div className="relative h-48 md:h-64 group">
        {series.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        {/* Edit banner overlay on hover */}
        <button
          onClick={() => setIsEditingSeriesDialog(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {series.banner ? (
            <Camera className="h-8 w-8 text-white" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Add Banner</span>
            </div>
          )}
        </button>
      </div>

      {/* Content Wrapper */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Series Header - overlaps banner */}
          <div className="-mt-12 sm:-mt-16 mb-6 relative z-10">
            {/* Back button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.back()}
              className="mb-4 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Top row: Type badge + Actions */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-background/90 backdrop-blur-sm text-primary border border-primary/20 shadow-sm">
                  <Tv className="h-3.5 w-3.5" />
                  Series
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-9 w-9 shadow-sm">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditingSeriesDialog(true)}>
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

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 drop-shadow-sm">
              {series.title}
            </h1>

            {/* Genre Pills */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {genres.map(genre => (
                  <span
                    key={genre}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-background/80 backdrop-blur-sm text-muted-foreground border border-border/50 shadow-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Logline */}
            {series.logline && (
              <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                &ldquo;{series.logline}&rdquo;
              </p>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
              <span className="font-semibold text-foreground">
                {series.seasons.length || series._count.seasons} {(series.seasons.length || series._count.seasons) === 1 ? 'Season' : 'Seasons'}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>
                {totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}
              </span>
              {formatDisplay && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{formatDisplay}</span>
                </>
              )}
              <span className="text-muted-foreground/50">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Updated {formatDistanceToNow(new Date(series.updatedAt), { addSuffix: true })}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={openAddSeason} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Season
              </Button>
              <Button variant="outline" onClick={() => setIsEditingSeriesDialog(true)} className="gap-2">
                <Edit3 className="h-4 w-4" />
                Edit Series
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-8">
            <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="episodes" className="gap-1.5 px-3 py-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Episodes</span>
                <Badge variant="secondary" className="text-xs ml-1">
                  {totalEpisodes}
                </Badge>
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
              {series.seasons.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                  title="No seasons yet"
                  description="Create your first season to start adding episodes."
                  action={{
                    label: 'Add Season',
                    onClick: openAddSeason,
                  }}
                />
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
      </ScrollArea>

      {/* Edit Series Dialog */}
      <EditSeriesDialog
        open={isEditingSeriesDialog}
        onOpenChange={setIsEditingSeriesDialog}
        series={series}
        userId={session?.user?.id || ''}
        onSave={handleSaveSeries}
      />

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

function SeriesPageSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-48 md:h-64 w-full" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 sm:-mt-16 mb-6">
          <Skeleton className="h-9 w-20 mb-4" />
          <div className="bg-background rounded-2xl border shadow-sm p-6 sm:p-8 space-y-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-10 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-full max-w-xl" />
            <Skeleton className="h-5 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-96 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
