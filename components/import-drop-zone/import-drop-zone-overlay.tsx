'use client';

/**
 * ImportDropZoneOverlay - Editor Overlay Variant
 *
 * A full-page overlay that appears when dragging files into the editor.
 */

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ImportDropZone } from './import-drop-zone';
import { ImportDropZoneProps } from './types';

interface ImportDropZoneOverlayProps extends Omit<ImportDropZoneProps, 'context'> {
  /** Whether to listen for drag events on the window */
  enabled?: boolean;
}

export function ImportDropZoneOverlay({
  enabled = true,
  className,
  onImportComplete,
  onImportError,
  ...props
}: ImportDropZoneOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  // dragCounter tracks nested drag events (elements inside browser trigger multiple enter/leave)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      return;
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      // Check if it's a file being dragged
      if (e.dataTransfer?.types.includes('Files')) {
        setDragCounter((prev) => {
          if (prev === 0) {
            setIsVisible(true);
          }
          return prev + 1;
        });
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsVisible(false);
        }
        return newCount;
      });
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragCounter(0);
      setIsVisible(false);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [enabled]);

  const handleImportComplete = useCallback(
    (result: Parameters<ImportDropZoneProps['onImportComplete']>[0]) => {
      setIsVisible(false);
      setDragCounter(0);
      onImportComplete(result);
    },
    [onImportComplete]
  );

  const handleImportError = useCallback(
    (error: string) => {
      // Keep overlay visible on error to show retry option
      onImportError?.(error);
    },
    [onImportError]
  );

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
      <div className="w-full max-w-lg mx-4">
        <ImportDropZone
          {...props}
          context="editor"
          onImportComplete={handleImportComplete}
          onImportError={handleImportError}
          className="bg-background shadow-lg min-h-[300px]"
        />
        <p className="text-center text-sm text-muted-foreground mt-4">
          Press Escape or drag away to cancel
        </p>
      </div>
    </div>
  );
}
