'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  MoreHorizontal,
  Edit3,
  Trash2,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { EditSeriesDialog } from '@/components/series/edit-series-dialog';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SeriesData {
  id: string;
  title: string;
  logline: string | null;
  genre: string | null;
  format: string | null;
  banner: string | null;
}

interface SeriesLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function SeriesLayout({ children, params }: SeriesLayoutProps) {
  const { id: seriesId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const { data: series, mutate } = useSWR<SeriesData>(
    `/api/series/${seriesId}`,
    fetcher
  );

  // Dialog states
  const [isEditingSeriesDialog, setIsEditingSeriesDialog] = useState(false);
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState(false);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  // Parse genres
  const genres = series?.genre
    ? series.genre.split(',').map(g => g.trim()).filter(Boolean)
    : [];

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
  if (!series) {
    return (
      <div className="flex flex-col h-full">
        <Skeleton className="h-48 md:h-64 w-full flex-shrink-0" />
        <div className="flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Full-width Banner */}
      <div className="relative h-48 md:h-64 group flex-shrink-0">
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

        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

        {/* Top bar: Back button + Actions (over banner) */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="bg-background/30 backdrop-blur-md hover:bg-background/50 text-white shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 bg-background/30 backdrop-blur-md hover:bg-background/50 text-white">
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

        {/* Bottom overlay: Title */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 z-20">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
            {series.title}
          </h1>
          {/* Genre Pills */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {genres.map(genre => (
                <span
                  key={genre}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Edit banner overlay on hover */}
        <button
          onClick={() => setIsEditingSeriesDialog(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
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

      {/* Page content */}
      {children}

      {/* Edit Series Dialog */}
      <EditSeriesDialog
        open={isEditingSeriesDialog}
        onOpenChange={setIsEditingSeriesDialog}
        series={series}
        userId={session?.user?.id || ''}
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
    </div>
  );
}
