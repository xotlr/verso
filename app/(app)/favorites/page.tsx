'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  FileText,
  Clock,
  MoreHorizontal,
  Trash2,
  Download,
  Edit3,
  ChevronRight,
  Star,
  StarOff,
} from 'lucide-react';

interface FavoriteScreenplay {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  wordCount: number;
  project?: { id: string; name: string } | null;
}

type SortOption = 'recent' | 'name' | 'updated';

export default function FavoritesPage() {
  const [screenplays, setScreenplays] = useState<FavoriteScreenplay[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/screenplays/favorites');
      if (response.ok) {
        const data = await response.json();
        setScreenplays(data);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const response = await fetch(`/api/screenplays/${id}/favorite`, {
        method: 'POST',
      });
      if (response.ok) {
        setScreenplays((prev) => prev.filter((s) => s.id !== id));
        toast.success('Removed from favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
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

  const exportScreenplay = (screenplay: FavoriteScreenplay) => {
    const blob = new Blob([screenplay.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${screenplay.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredScreenplays = screenplays
    .filter((screenplay) => screenplay.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'recent':
        default:
          return 0; // API already returns in order added to favorites
      }
    });

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenplay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this screenplay? This action cannot be undone.
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
                  <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                  Favorites
                </h1>
                <p className="text-sm text-muted-foreground">
                  {screenplays.length} favorite screenplay{screenplays.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground placeholder-muted-foreground transition-all"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently added</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="updated">Last modified</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-6">
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? 'No results found' : 'No favorites yet'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Star your favorite screenplays for quick access'}
              </p>
              {!searchQuery && (
                <Link href="/home">
                  <Button className="gap-2">
                    <FileText className="h-5 w-5" />
                    Browse Screenplays
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredScreenplays.map((screenplay) => (
                <div
                  key={screenplay.id}
                  className="group relative bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
                  onMouseEnter={() => setHoveredCard(screenplay.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Link href={`/editor/${screenplay.id}`}>
                    <div className="p-5 cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {screenplay.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {formatDistanceToNow(new Date(screenplay.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{screenplay.wordCount.toLocaleString()} words</Badge>
                          {screenplay.project ? (
                            <Badge variant="outline" className="text-xs">
                              {screenplay.project.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Standalone
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>

                  {/* Action Menu */}
                  {hoveredCard === screenplay.id && (
                    <div className="absolute top-14 right-4 bg-card border border-border rounded-xl shadow-xl py-1 z-10 min-w-[160px] animate-fade-in">
                      <button
                        onClick={() => (window.location.href = `/editor/${screenplay.id}`)}
                        className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => exportScreenplay(screenplay)}
                        className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={() => toggleFavorite(screenplay.id)}
                        className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                      >
                        <StarOff className="h-4 w-4" />
                        Remove from Favorites
                      </button>
                      <button
                        onClick={() => setDeleteTarget(screenplay.id)}
                        className="w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
