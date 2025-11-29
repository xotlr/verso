'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TemplateSelector } from '@/components/template-selector';
import { FilterChips, Filters } from '@/components/screenplays/filter-chips';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit3,
  Download,
  Star,
  Plus,
  Film,
  Folder,
} from 'lucide-react';

interface Screenplay {
  id: string;
  title: string;
  synopsis: string | null;
  updatedAt: string;
  createdAt: string;
  projectId: string | null;
  teamId: string | null;
  isFavorite: boolean;
  lastOpenedAt: string | null;
  genre: string | null;
  project: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

function ScreenplaysContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [screenplays, setScreenplays] = useState<Screenplay[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);


  // Initialize filters from URL params
  const [filters, setFilters] = useState<Filters>(() => ({
    favorites: searchParams.get('filter') === 'favorites' || searchParams.get('favorites') === 'true',
    recent: searchParams.get('filter') === 'recent' || searchParams.get('recent') === 'true',
    standalone: searchParams.get('standalone') === 'true',
    hasProject: searchParams.get('hasProject') === 'true',
    genre: searchParams.get('genre'),
  }));

  useEffect(() => {
    loadScreenplays();
  }, []);

  const loadScreenplays = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/screenplays');
      if (response.ok) {
        const data = await response.json();
        setScreenplays(data.screenplays);
      }
    } catch (error) {
      console.error('Error loading screenplays:', error);
      toast.error('Failed to load screenplays');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteScreenplay = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/screenplays/${deleteTarget}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setScreenplays((prev) => prev.filter((s) => s.id !== deleteTarget));
        toast.success('Screenplay deleted');
      }
    } catch (error) {
      console.error('Error deleting screenplay:', error);
      toast.error('Failed to delete screenplay');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const response = await fetch(`/api/screenplays/${id}/favorite`, {
        method: 'POST',
      });
      if (response.ok) {
        setScreenplays((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, isFavorite: !currentFavorite } : s
          )
        );
        toast.success(currentFavorite ? 'Removed from favorites' : 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
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

  // Get unique genres from screenplays
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    screenplays.forEach((s) => {
      if (s.genre) genreSet.add(s.genre);
    });
    return Array.from(genreSet).sort();
  }, [screenplays]);

  // Apply filters
  const filteredScreenplays = useMemo(() => {
    let result = screenplays;

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

  return (
    <>
      <TemplateSelector
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenplay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteScreenplay}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                  <Film className="h-8 w-8" />
                  Screenplays
                </h1>
                <p className="text-sm text-muted-foreground">
                  {filteredScreenplays.length} screenplay{filteredScreenplays.length !== 1 ? 's' : ''}
                  {searchQuery || Object.values(filters).some(Boolean) ? ' (filtered)' : ''}
                </p>
              </div>
              <Button onClick={() => setTemplateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Screenplay
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search screenplays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground placeholder-muted-foreground transition-all"
              />
            </div>

            {/* Filter chips */}
            <FilterChips
              filters={filters}
              genres={genres}
              onChange={setFilters}
            />
          </div>

          {/* Content Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border/60 p-5">
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
          ) : filteredScreenplays.length === 0 ? (
            <EmptyState
              icon={<Film className="h-8 w-8 text-muted-foreground" />}
              title={searchQuery || Object.values(filters).some(Boolean) ? 'No screenplays found' : 'No screenplays yet'}
              description={
                searchQuery || Object.values(filters).some(Boolean)
                  ? 'Try adjusting your filters or search'
                  : 'Create your first screenplay to get started'
              }
              action={
                !searchQuery && !Object.values(filters).some(Boolean)
                  ? {
                      label: 'Create Screenplay',
                      onClick: () => setTemplateOpen(true),
                      icon: <Plus className="h-5 w-5" />,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredScreenplays.map((screenplay) => (
                <div
                  key={screenplay.id}
                  className="group relative bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <Link href={`/screenplay/${screenplay.id}`}>
                    <div className="p-5 cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Film className="h-4 w-4 text-primary flex-shrink-0" />
                            <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {screenplay.title}
                            </h3>
                            {screenplay.isFavorite && (
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {formatDistanceToNow(new Date(screenplay.updatedAt), { addSuffix: true })}
                            </span>
                            {screenplay.project && (
                              <>
                                <span className="text-border">|</span>
                                <Folder className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{screenplay.project.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/screenplay/${screenplay.id}`)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFavorite(screenplay.id, screenplay.isFavorite)}>
                              <Star className={`mr-2 h-4 w-4 ${screenplay.isFavorite ? 'fill-current' : ''}`} />
                              {screenplay.isFavorite ? 'Unfavorite' : 'Favorite'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportScreenplay(screenplay)}>
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(screenplay.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {screenplay.synopsis || 'No synopsis'}
                      </p>

                      <div className="flex items-center gap-2">
                        {screenplay.genre && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {screenplay.genre}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ScreenplaysLoading() {
  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-10 w-80" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border/60 p-5">
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
      </div>
    </main>
  );
}

export default function ScreenplaysPage() {
  return (
    <Suspense fallback={<ScreenplaysLoading />}>
      <ScreenplaysContent />
    </Suspense>
  );
}
