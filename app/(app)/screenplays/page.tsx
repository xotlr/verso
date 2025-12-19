'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TemplateSelector } from '@/components/template-selector';
import { MoveToProjectDialog } from '@/components/move-to-project-dialog';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar, FilterPill } from '@/components/ui/list-page-toolbar';
import { ListWithPreview } from '@/components/ui/list-preview-panel';
import { ScreenplayListCard, ScreenplayListCardSkeleton } from '@/components/screenplay/screenplay-list-card';
import { ScreenplayListRow, ScreenplayListRowSkeleton } from '@/components/screenplay/screenplay-list-row';
import { WorkspaceDndContext, DraggableScreenplayData } from '@/components/workspace/workspace-dnd-context';
import { DraggableScreenplayCard } from '@/components/workspace/draggable-screenplay-card';
import { DroppableStackCard } from '@/components/workspace/droppable-stack-card';
import { useViewMode } from '@/hooks/use-view-mode';
import type { StackItem } from '@/hooks/use-workspace-data';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Star,
  Plus,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';

interface Screenplay {
  id: string;
  title: string;
  synopsis: string | null;
  logline?: string | null;
  updatedAt: string;
  createdAt: string;
  projectId: string | null;
  teamId: string | null;
  isFavorite: boolean;
  lastOpenedAt: string | null;
  genre: string | null;
  wordCount: number;
  project: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  author?: string | null;
  user?: { id: string; name: string | null } | null;
  stackId?: string | null;
  content?: string;
}

interface Filters {
  favorites: boolean;
  recent: boolean;
  standalone: boolean;
  hasProject: boolean;
  genre: string | null;
}

function ScreenplaysContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [screenplays, setScreenplays] = useState<Screenplay[]>([]);
  const [stacks, setStacks] = useState<StackItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'screenplay' | 'stack' } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Screenplay | null>(null);
  const [viewMode, setViewMode] = useViewMode('screenplays');
  const [hoveredScreenplay, setHoveredScreenplay] = useState<Screenplay | null>(null);


  // Initialize filters from URL params
  const [filters, setFilters] = useState<Filters>(() => ({
    favorites: searchParams.get('filter') === 'favorites' || searchParams.get('favorites') === 'true',
    recent: searchParams.get('filter') === 'recent' || searchParams.get('recent') === 'true',
    standalone: searchParams.get('standalone') === 'true',
    hasProject: searchParams.get('hasProject') === 'true',
    genre: searchParams.get('genre'),
  }));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [screenplaysRes, stacksRes] = await Promise.all([
        fetch('/api/screenplays'),
        fetch('/api/stacks'),
      ]);
      if (screenplaysRes.ok) {
        const data = await screenplaysRes.json();
        setScreenplays(data.screenplays);
      }
      if (stacksRes.ok) {
        const data = await stacksRes.json();
        setStacks(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load screenplays');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stack operations
  const createStackFromDrop = useCallback(async (draggedId: string, targetId: string): Promise<StackItem | null> => {
    const draggedScreenplay = screenplays.find((s) => s.id === draggedId);
    const targetScreenplay = screenplays.find((s) => s.id === targetId);

    if (!draggedScreenplay || !targetScreenplay) return null;

    // Optimistic update
    const tempStackId = `temp-${Date.now()}`;
    const tempStack: StackItem = {
      id: tempStackId,
      name: `${targetScreenplay.title} Stack`,
      updatedAt: new Date().toISOString(),
      screenplays: [
        { id: draggedId, title: draggedScreenplay.title, wordCount: draggedScreenplay.wordCount },
        { id: targetId, title: targetScreenplay.title, wordCount: targetScreenplay.wordCount },
      ],
      _count: { screenplays: 2 },
    };

    setScreenplays((prev) => prev.filter((s) => s.id !== draggedId && s.id !== targetId));
    setStacks((prev) => [tempStack, ...prev]);

    try {
      const response = await fetch('/api/stacks/create-from-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draggedId, targetId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create stack');
      }

      const result = await response.json();
      setStacks((prev) => prev.map((s) => (s.id === tempStackId ? result.stack : s)));
      toast.success('Stack created');
      return result.stack;
    } catch {
      // Rollback
      setStacks((prev) => prev.filter((s) => s.id !== tempStackId));
      setScreenplays((prev) => [...prev, draggedScreenplay, targetScreenplay]);
      toast.error('Failed to create stack');
      return null;
    }
  }, [screenplays]);

  const addToStack = useCallback(async (screenplayId: string, stackId: string): Promise<void> => {
    const screenplay = screenplays.find((s) => s.id === screenplayId);
    if (!screenplay) return;

    // Optimistic update
    setScreenplays((prev) => prev.filter((s) => s.id !== screenplayId));
    setStacks((prev) =>
      prev.map((stack) => {
        if (stack.id === stackId) {
          return {
            ...stack,
            screenplays: [
              ...(stack.screenplays || []),
              { id: screenplayId, title: screenplay.title, wordCount: screenplay.wordCount },
            ],
            _count: { screenplays: (stack._count?.screenplays || 0) + 1 },
          };
        }
        return stack;
      })
    );

    try {
      const response = await fetch(`/api/stacks/${stackId}/screenplays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenplayIds: [screenplayId] }),
      });

      if (!response.ok) throw new Error('Failed to add to stack');
      toast.success('Added to stack');
    } catch {
      // Rollback
      setScreenplays((prev) => [...prev, screenplay]);
      setStacks((prev) =>
        prev.map((stack) => {
          if (stack.id === stackId) {
            return {
              ...stack,
              screenplays: (stack.screenplays || []).filter((s) => s.id !== screenplayId),
              _count: { screenplays: Math.max((stack._count?.screenplays || 1) - 1, 0) },
            };
          }
          return stack;
        })
      );
      toast.error('Failed to add to stack');
    }
  }, [screenplays]);

  const dissolveStack = useCallback(async (stackId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/stacks/${stackId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to dissolve stack');
      await loadData();
      toast.success('Stack dissolved');
    } catch {
      toast.error('Failed to dissolve stack');
    }
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint = deleteTarget.type === 'stack'
        ? `/api/stacks/${deleteTarget.id}`
        : `/api/screenplays/${deleteTarget.id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (response.ok) {
        if (deleteTarget.type === 'stack') {
          await loadData();
          toast.success('Stack deleted');
        } else {
          setScreenplays((prev) => prev.filter((s) => s.id !== deleteTarget.id));
          toast.success('Screenplay deleted');
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const exportScreenplay = async (screenplay: Screenplay) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${screenplay.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting screenplay:', error);
      toast.error('Failed to export screenplay');
    }
  };

  const createProjectFromScreenplay = async (screenplay: Screenplay) => {
    try {
      // Create a new project with the screenplay title
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: screenplay.title,
          description: screenplay.synopsis || screenplay.logline || null,
        }),
      });

      if (!projectResponse.ok) {
        const data = await projectResponse.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await projectResponse.json();

      // Move the screenplay to the new project
      const moveResponse = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!moveResponse.ok) {
        throw new Error('Failed to add screenplay to project');
      }

      toast.success('Project created');
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  // Get unique genres from screenplays
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    screenplays.forEach((s) => {
      if (s.genre) genreSet.add(s.genre);
    });
    return Array.from(genreSet).sort();
  }, [screenplays]);

  // Apply filters (exclude screenplays in stacks - they appear inside stack cards)
  const filteredScreenplays = useMemo(() => {
    let result = screenplays.filter((s) => !s.stackId);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.synopsis?.toLowerCase().includes(query)
      );
    }

    // Favorites filter
    if (filters.favorites) {
      result = result.filter((s) => s.isFavorite);
    }

    // Recent filter (has been opened)
    if (filters.recent) {
      result = result.filter((s) => s.lastOpenedAt);
      result.sort((a, b) => {
        const aDate = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
        const bDate = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
        return bDate - aDate;
      });
    }

    // Standalone filter
    if (filters.standalone) {
      result = result.filter((s) => !s.projectId);
    }

    // Has project filter
    if (filters.hasProject) {
      result = result.filter((s) => s.projectId);
    }

    // Genre filter
    if (filters.genre) {
      result = result.filter((s) => s.genre === filters.genre);
    }

    return result;
  }, [screenplays, searchQuery, filters]);

  // Filter stacks
  const filteredStacks = useMemo(() => {
    if (!searchQuery) return stacks;
    const query = searchQuery.toLowerCase();
    return stacks.filter(
      (stack) =>
        stack.name.toLowerCase().includes(query) ||
        stack.screenplays?.some((s) => s.title.toLowerCase().includes(query))
    );
  }, [stacks, searchQuery]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.favorites) params.set('favorites', 'true');
    if (filters.recent) params.set('recent', 'true');
    if (filters.standalone) params.set('standalone', 'true');
    if (filters.hasProject) params.set('hasProject', 'true');
    if (filters.genre) params.set('genre', filters.genre);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.favorites) count++;
    if (filters.recent) count++;
    if (filters.standalone) count++;
    if (filters.hasProject) count++;
    if (filters.genre) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      favorites: false,
      recent: false,
      standalone: false,
      hasProject: false,
      genre: null,
    });
  };

  const toggleFilter = (key: keyof Omit<Filters, 'genre'>) => {
    setFilters({ ...filters, [key]: !filters[key] });
  };

  return (
    <>
      <TemplateSelector
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'stack' ? 'Stack' : 'Screenplay'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'stack'
                ? 'Are you sure? Screenplays in this stack will become standalone. This action cannot be undone.'
                : 'Are you sure? This action cannot be undone.'}
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

      {moveTarget && (
        <MoveToProjectDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          screenplayId={moveTarget.id}
          screenplayTitle={moveTarget.title}
          currentProjectId={moveTarget.project?.id}
          onSuccess={loadData}
        />
      )}

      <PageLayout
        title="Screenplays"
        description={`${filteredScreenplays.length} screenplay${filteredScreenplays.length !== 1 ? 's' : ''}${searchQuery || activeFilterCount > 0 ? ' (filtered)' : ''}`}
        actions={
          <Button onClick={() => setTemplateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Screenplay</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      >
        {/* Search and Filters */}
        <ListPageToolbar
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: 'Search screenplays...',
          }}
          filters={
            <>
              <FilterPill
                active={filters.favorites}
                onClick={() => toggleFilter('favorites')}
                icon={<Star className={`h-3.5 w-3.5 ${filters.favorites ? 'fill-current' : ''}`} />}
                label="Favorites"
                activeColor="yellow"
              />
              <FilterPill
                active={filters.recent}
                onClick={() => toggleFilter('recent')}
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Recent"
                activeColor="blue"
              />
              <FilterPill
                active={filters.standalone}
                onClick={() => toggleFilter('standalone')}
                icon={<PiFilmScript className="h-3.5 w-3.5" />}
                label="Standalone"
                activeColor="green"
              />
              <FilterPill
                active={filters.hasProject}
                onClick={() => toggleFilter('hasProject')}
                icon={<RiFolder6Line className="h-3.5 w-3.5" />}
                label="In Project"
                activeColor="purple"
              />

              {/* Genre dropdown */}
              {genres.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        filters.genre
                          ? 'bg-primary/20 text-primary border-primary/30'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground border-transparent'
                      }`}
                    >
                      {filters.genre || 'Genre'}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1" align="start">
                    <button
                      onClick={() => setFilters({ ...filters, genre: null })}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        !filters.genre ? 'bg-accent' : 'hover:bg-accent'
                      }`}
                    >
                      All Genres
                    </button>
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setFilters({ ...filters, genre })}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filters.genre === genre ? 'bg-accent' : 'hover:bg-accent'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear ({activeFilterCount})
                </button>
              )}
            </>
          }
          className="mb-6"
          viewMode={{
            value: viewMode,
            onChange: setViewMode,
          }}
        />

        {/* Content Grid/List */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-h-[140px] sm:min-h-[180px] bg-card rounded-xl border border-border/60 p-3 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <ScreenplayListRowSkeleton key={i} />
              ))}
            </div>
          )
        ) : filteredScreenplays.length === 0 && filteredStacks.length === 0 ? (
          <EmptyState
            icon={<PiFilmScript className="h-8 w-8 text-muted-foreground" />}
            title={searchQuery || activeFilterCount > 0 ? 'No screenplays found' : 'No screenplays yet'}
            description={
              searchQuery || activeFilterCount > 0
                ? 'Try adjusting your filters or search'
                : 'Create your first screenplay to get started'
            }
            action={
              !searchQuery && activeFilterCount === 0
                ? {
                    label: 'Create Screenplay',
                    onClick: () => setTemplateOpen(true),
                    icon: <Plus className="h-5 w-5" />,
                  }
                : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <WorkspaceDndContext
            onCreateStack={createStackFromDrop}
            onAddToStack={addToStack}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {/* Render stacks first */}
              {filteredStacks.map((stack) => (
                <DroppableStackCard
                  key={`stack-${stack.id}`}
                  stack={stack}
                  href={`/stack/${stack.id}`}
                  onUngroup={() => dissolveStack(stack.id)}
                  onDelete={() => setDeleteTarget({ id: stack.id, type: 'stack' })}
                />
              ))}
              {/* Then render standalone screenplays */}
              {filteredScreenplays.map((screenplay) => (
                <DraggableScreenplayCard
                  key={screenplay.id}
                  fullScreenplay={screenplay as DraggableScreenplayData}
                  screenplay={{
                    id: screenplay.id,
                    title: screenplay.title,
                    logline: screenplay.logline,
                    synopsis: screenplay.synopsis,
                    updatedAt: screenplay.updatedAt,
                    wordCount: screenplay.wordCount,
                    genre: screenplay.genre,
                    isFavorite: screenplay.isFavorite,
                    project: screenplay.project,
                    author: screenplay.author,
                    user: screenplay.user,
                  }}
                  href={`/screenplay/${screenplay.id}`}
                  showFavorite={true}
                  showGenre={true}
                  showProject={false}
                  showWordCount={true}
                  onEdit={() => router.push(`/screenplay/${screenplay.id}`)}
                  onExport={() => exportScreenplay(screenplay)}
                  onMoveToProject={() => setMoveTarget(screenplay)}
                  onCreateProject={() => createProjectFromScreenplay(screenplay)}
                  onDelete={() => setDeleteTarget({ id: screenplay.id, type: 'screenplay' })}
                />
              ))}
            </div>
          </WorkspaceDndContext>
        ) : (
          <ListWithPreview
            preview={
              hoveredScreenplay ? (
                <ScreenplayListCard
                  screenplay={{
                    id: hoveredScreenplay.id,
                    title: hoveredScreenplay.title,
                    logline: hoveredScreenplay.logline,
                    synopsis: hoveredScreenplay.synopsis,
                    updatedAt: hoveredScreenplay.updatedAt,
                    wordCount: hoveredScreenplay.wordCount,
                    genre: hoveredScreenplay.genre,
                    isFavorite: hoveredScreenplay.isFavorite,
                    project: hoveredScreenplay.project,
                    author: hoveredScreenplay.author,
                    user: hoveredScreenplay.user,
                  }}
                  href={`/screenplay/${hoveredScreenplay.id}`}
                  showFavorite={true}
                  showGenre={true}
                  showProject={true}
                  showWordCount={true}
                />
              ) : null
            }
          >
            <div className="space-y-2">
              {filteredScreenplays.map((screenplay) => (
                <ScreenplayListRow
                  key={screenplay.id}
                  screenplay={{
                    id: screenplay.id,
                    title: screenplay.title,
                    logline: screenplay.logline,
                    synopsis: screenplay.synopsis,
                    updatedAt: screenplay.updatedAt,
                    wordCount: screenplay.wordCount,
                    genre: screenplay.genre,
                    isFavorite: screenplay.isFavorite,
                    project: screenplay.project,
                    author: screenplay.author,
                    user: screenplay.user,
                  }}
                  href={`/screenplay/${screenplay.id}`}
                  isHovered={hoveredScreenplay?.id === screenplay.id}
                  onHover={() => setHoveredScreenplay(screenplay)}
                  onLeave={() => setHoveredScreenplay(null)}
                />
              ))}
            </div>
          </ListWithPreview>
        )}
      </PageLayout>
    </>
  );
}

function ScreenplaysLoading() {
  return (
    <PageLayout>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 sm:h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {[1, 2, 3].map((i) => (
          <ScreenplayListCardSkeleton key={i} />
        ))}
      </div>
    </PageLayout>
  );
}

export default function ScreenplaysPage() {
  return (
    <Suspense fallback={<ScreenplaysLoading />}>
      <ScreenplaysContent />
    </Suspense>
  );
}
