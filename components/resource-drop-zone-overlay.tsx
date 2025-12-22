'use client';

/**
 * ResourceDropZoneOverlay
 *
 * A full-page overlay that appears when dragging URLs into a project page.
 * Allows users to quickly add resources by dragging links from their browser.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { IoFileTrayStacked } from 'react-icons/io5';
import { Loader2 } from 'lucide-react';

interface ResourceDropZoneOverlayProps {
  /** Whether to listen for drag events */
  enabled?: boolean;
  /** Called when a URL is dropped */
  onUrlDrop: (url: string) => Promise<void>;
  className?: string;
}

// Check if the dragged data contains a URL
function hasUrlData(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;

  // Check for text/uri-list (standard for dragged links)
  // or text/plain which might contain a URL
  return (
    dataTransfer.types.includes('text/uri-list') ||
    dataTransfer.types.includes('text/plain')
  );
}

// Extract URL from drop event
function extractUrl(dataTransfer: DataTransfer): string | null {
  // Try text/uri-list first (preferred for links)
  let url = dataTransfer.getData('text/uri-list');

  // Fall back to text/plain
  if (!url) {
    url = dataTransfer.getData('text/plain');
  }

  // Clean up the URL (remove any newlines, take first URL if multiple)
  if (url) {
    url = url.split('\n')[0].trim();

    // Validate it looks like a URL
    try {
      new URL(url);
      return url;
    } catch {
      // Not a valid URL
      return null;
    }
  }

  return null;
}

export function ResourceDropZoneOverlay({
  enabled = true,
  onUrlDrop,
  className,
}: ResourceDropZoneOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      return;
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();

      // Check if it's a URL/text being dragged (not files)
      if (hasUrlData(e.dataTransfer) && !e.dataTransfer?.types.includes('Files')) {
        setIsVisible(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();

      // Only hide if leaving the document entirely
      const relatedTarget = e.relatedTarget as Node | null;
      if (!relatedTarget || !document.documentElement.contains(relatedTarget)) {
        setIsVisible(false);
        setIsDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (isVisible) {
        setIsDragOver(true);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();

      if (!isVisible || !e.dataTransfer) {
        setIsVisible(false);
        setIsDragOver(false);
        return;
      }

      const url = extractUrl(e.dataTransfer);

      if (url) {
        setIsLoading(true);
        setIsDragOver(false);

        try {
          await onUrlDrop(url);
        } finally {
          setIsLoading(false);
          setIsVisible(false);
        }
      } else {
        setIsVisible(false);
        setIsDragOver(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setIsDragOver(false);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [enabled, isVisible, onUrlDrop]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-background/80 backdrop-blur-sm',
        'animate-in fade-in duration-200',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-12',
          'border-2 border-dashed rounded-2xl',
          'transition-all duration-200',
          isDragOver
            ? 'border-primary bg-primary/5 scale-105'
            : 'border-muted-foreground/30 bg-muted/30'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium">Adding resource...</p>
              <p className="text-sm text-muted-foreground">Fetching metadata</p>
            </div>
          </>
        ) : (
          <>
            <IoFileTrayStacked
              className={cn(
                'h-12 w-12 transition-colors duration-200',
                isDragOver ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <div className="text-center">
              <p className="text-lg font-medium">Drop link to add resource</p>
              <p className="text-sm text-muted-foreground">
                Drag links from your browser
              </p>
            </div>
          </>
        )}
      </div>
      <p className="absolute bottom-8 text-sm text-muted-foreground">
        Press Escape to cancel
      </p>
    </div>
  );
}
