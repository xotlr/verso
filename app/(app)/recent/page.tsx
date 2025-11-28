'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { ScreenplayCard, ScreenplayCardData } from '@/components/screenplay-card';
import {
  Search,
  FileText,
  Trash2,
  History,
} from 'lucide-react';

interface RecentScreenplay {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  wordCount: number;
  project?: { id: string; name: string } | null;
}

export default function RecentPage() {
  const [screenplays, setScreenplays] = useState<RecentScreenplay[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/screenplays/recent');
      if (response.ok) {
        const data = await response.json();
        setScreenplays(data);
      }
    } catch (error) {
      console.error('Error loading recent:', error);
      toast.error('Failed to load recent screenplays');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromRecent = async (id: string) => {
    try {
      const response = await fetch(`/api/screenplays/recent/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setScreenplays((prev) => prev.filter((s) => s.id !== id));
        toast.success('Removed from recent');
      }
    } catch (error) {
      console.error('Error removing from recent:', error);
      toast.error('Failed to remove from recent');
    }
  };

  const clearAllRecent = async () => {
    try {
      const response = await fetch('/api/screenplays/recent', {
        method: 'DELETE',
      });
      if (response.ok) {
        setScreenplays([]);
        toast.success('Cleared recent history');
      }
    } catch (error) {
      console.error('Error clearing recent:', error);
      toast.error('Failed to clear recent');
    } finally {
      setClearAllOpen(false);
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

  const exportScreenplay = (screenplay: ScreenplayCardData) => {
    if (!screenplay.content) return;
    const blob = new Blob([screenplay.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${screenplay.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredScreenplays = screenplays.filter((screenplay) =>
    screenplay.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Recent History</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all items from your recent history. Your screenplays will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAllRecent}>Clear All</AlertDialogAction>
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
                  <History className="h-8 w-8" />
                  Recent
                </h1>
                <p className="text-sm text-muted-foreground">
                  {screenplays.length} recently accessed screenplay{screenplays.length !== 1 ? 's' : ''}
                </p>
              </div>
              {screenplays.length > 0 && (
                <Button variant="outline" onClick={() => setClearAllOpen(true)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear History
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search recent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground placeholder-muted-foreground transition-all"
              />
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
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? 'No results found' : 'No recent screenplays'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Screenplays you open will appear here for quick access'}
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
                <ScreenplayCard
                  key={screenplay.id}
                  screenplay={screenplay}
                  onEdit={(id) => (window.location.href = `/editor/${id}`)}
                  onExport={exportScreenplay}
                  onRemove={removeFromRecent}
                  removeLabel="Remove from Recent"
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
