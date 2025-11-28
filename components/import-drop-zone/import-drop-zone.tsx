'use client';

/**
 * ImportDropZone - Core Component
 *
 * A drag-and-drop file import zone supporting multiple screenplay formats.
 */

import { useCallback, useRef, useState, DragEvent } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupportedExtensions, getAcceptString } from '@/lib/parsers';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useFileImport } from './use-file-import';
import { ImportDropZoneProps } from './types';

export function ImportDropZone({
  onImportComplete,
  onImportError,
  disabled = false,
  className,
}: ImportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state, progress, error, result, importFile, reset, isProcessing } =
    useFileImport({
      onSuccess: onImportComplete,
      onError: onImportError,
    });

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isProcessing) {
        setIsDragging(true);
      }
    },
    [disabled, isProcessing]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isProcessing) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await importFile(files[0]);
      }
    },
    [disabled, isProcessing, importFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await importFile(files[0]);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [importFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  const supportedFormats = getSupportedExtensions().join(', .');

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-all duration-200',
        'flex flex-col items-center justify-center gap-4 p-8',
        isDragging && 'border-primary bg-primary/5 scale-[1.02]',
        state === 'idle' && !isDragging && 'border-border hover:border-primary/50 hover:bg-muted/50',
        state === 'processing' && 'border-primary/50 bg-primary/5',
        state === 'success' && 'border-green-500 bg-green-500/5',
        state === 'error' && 'border-destructive bg-destructive/5',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !isProcessing && 'cursor-pointer',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Idle State */}
      {state === 'idle' && !isDragging && (
        <>
          <div className="rounded-full bg-muted p-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">Drop screenplay here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports .{supportedFormats}
          </p>
        </>
      )}

      {/* Dragging State */}
      {isDragging && (
        <>
          <div className="rounded-full bg-primary/10 p-4">
            <FileText className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="text-lg font-medium text-primary">Drop to import</p>
        </>
      )}

      {/* Processing State */}
      {state === 'processing' && progress && (
        <>
          <div className="rounded-full bg-primary/10 p-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <div className="text-center space-y-2 w-full max-w-xs">
            <p className="text-sm font-medium">{progress.message}</p>
            <Progress value={progress.percent} className="h-2" />
            {progress.filename && (
              <p className="text-xs text-muted-foreground truncate">
                {progress.filename}
              </p>
            )}
          </div>
        </>
      )}

      {/* Success State */}
      {state === 'success' && result && (
        <>
          <div className="rounded-full bg-green-500/10 p-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-green-600">
              Import successful
            </p>
            <p className="text-sm text-muted-foreground">
              {result.scenes?.length || 0} scenes, {result.wordCount || 0} words
            </p>
          </div>
        </>
      )}

      {/* Error State */}
      {state === 'error' && (
        <>
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">Import failed</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {error}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
          >
            Try again
          </Button>
        </>
      )}
    </div>
  );
}
