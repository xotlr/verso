'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SceneAttachment {
  id: string;
  type: string;
  url: string;
  filename?: string | null;
  caption?: string | null;
  displayOrder: number;
}

interface ScenePhotoGalleryProps {
  screenplayId: string;
  sceneId: string;
  sceneName?: string;
  editable?: boolean;
  onUpload?: () => void;
}

export function ScenePhotoGallery({
  screenplayId,
  sceneId,
  sceneName,
  editable = true,
  onUpload,
}: ScenePhotoGalleryProps) {
  const [photos, setPhotos] = useState<SceneAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/scenes/${sceneId}/attachments`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter to only show images
        setPhotos(data.filter((a: SceneAttachment) => a.type === 'image'));
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [screenplayId, sceneId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/scenes/${sceneId}/attachments/${id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        toast.success('Photo deleted');
        if (selectedIndex !== null) {
          setSelectedIndex(null);
        }
      } else {
        toast.error('Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePrevious = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1);
  }, [selectedIndex, photos.length]);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0);
  }, [selectedIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setSelectedIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handlePrevious, handleNext]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (photos.length === 0 && !editable) {
    return null;
  }

  return (
    <div className="space-y-2">
      {sceneName && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">{sceneName}</h4>
          <span className="text-xs text-muted-foreground">{photos.length} photos</span>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'relative aspect-square rounded-lg overflow-hidden',
              'bg-muted hover:ring-2 hover:ring-primary/50 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
          >
            <Image
              src={photo.url}
              alt={photo.caption || `Scene photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
            />
          </button>
        ))}

        {editable && photos.length < 10 && (
          <button
            onClick={onUpload}
            className={cn(
              'aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30',
              'hover:border-muted-foreground/50 hover:bg-muted/50 transition-colors',
              'flex flex-col items-center justify-center gap-1',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add</span>
          </button>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {selectedIndex !== null && photos[selectedIndex] && (
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedIndex(null)}
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Navigation buttons */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Image */}
              <div className="relative aspect-video">
                <Image
                  src={photos[selectedIndex].url}
                  alt={photos[selectedIndex].caption || 'Scene photo'}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>

              {/* Caption and actions */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-end justify-between">
                  <div>
                    {photos[selectedIndex].caption && (
                      <p className="text-white text-sm mb-1">
                        {photos[selectedIndex].caption}
                      </p>
                    )}
                    <p className="text-white/60 text-xs">
                      {selectedIndex + 1} of {photos.length}
                    </p>
                  </div>

                  {editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(photos[selectedIndex].id)}
                      disabled={isDeleting === photos[selectedIndex].id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      {isDeleting === photos[selectedIndex].id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Empty state component
export function ScenePhotosEmpty({ onUpload }: { onUpload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">No photos yet</p>
      {onUpload && (
        <Button variant="outline" size="sm" onClick={onUpload}>
          <Plus className="h-4 w-4 mr-2" />
          Add Photo
        </Button>
      )}
    </div>
  );
}
