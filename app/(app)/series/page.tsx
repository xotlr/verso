'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Clock,
  FileText,
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

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <EmptyState
          icon={<Tv className="h-6 w-6 text-muted-foreground" />}
          title="Failed to load series"
          description="There was an error loading your series. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Series</h1>
          <p className="text-muted-foreground">Manage your TV series and episodes</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Series
        </Button>
      </div>

      {/* Loading State */}
      {!seriesList ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : seriesList.length === 0 ? (
        <EmptyState
          icon={<Tv className="h-6 w-6 text-muted-foreground" />}
          title="No series yet"
          description="Create your first TV series to get started."
          action={{
            label: 'Create Series',
            onClick: () => setIsCreating(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {seriesList.map(series => (
            <Link
              key={series.id}
              href={`/series/${series.id}`}
              className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Tv className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium group-hover:underline">
                    {series.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {series._count.episodes} episodes
                    </span>
                    {series.genre && (
                      <Badge variant="secondary" className="text-[10px]">
                        {series.genre}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(series.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

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
    </div>
  );
}
