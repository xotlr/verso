'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Share2, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelapseControls } from './timelapse-controls';
import { TimelapseTimeline } from './timelapse-timeline';
import { useTimelapsePlayback } from '@/hooks/use-timelapse-playback';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface TimelapsePlayerProps {
  screenplayId: string;
  screenplayTitle?: string;
  onShare?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function TimelapsePlayer({
  screenplayId,
  screenplayTitle = 'Untitled Screenplay',
  onShare,
  onExport,
  onSettings,
  className,
}: TimelapsePlayerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    currentContent,
    currentIndex,
    isPlaying,
    isLoading,
    error,
    speed,
    progress,
    totalCount,
    elapsedTime,
    totalDuration,
    operations,
    togglePlayback,
    stop,
    seekTo,
    stepForward,
    stepBackward,
    changeSpeed,
  } = useTimelapsePlayback({
    screenplayId,
  });

  // Scroll to cursor position when content changes
  useEffect(() => {
    if (contentRef.current && currentContent) {
      // Auto-scroll to keep the end visible during playback
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [currentContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'Home':
          e.preventDefault();
          stop();
          break;
        case 'End':
          e.preventDefault();
          seekTo(operations.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback, stepForward, stepBackward, stop, seekTo, operations.length]);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="border-b p-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-full w-full max-w-3xl mx-auto" />
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Failed to load timelapse</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href={`/screenplay/${screenplayId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">No timelapse data</h2>
          <p className="text-muted-foreground">
            Start writing to record your timelapse. Changes are automatically captured.
          </p>
          <Button asChild variant="outline">
            <Link href={`/screenplay/${screenplayId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/screenplay/${screenplayId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{screenplayTitle}</h1>
            <p className="text-sm text-muted-foreground">Timelapse Replay</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onShare && (
            <Button variant="ghost" size="icon" onClick={onShare} title="Share">
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button variant="ghost" size="icon" onClick={onExport} title="Export Video">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onSettings && (
            <Button variant="ghost" size="icon" onClick={onSettings} title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Content viewer */}
      <div className="flex-1 overflow-hidden p-8 bg-muted/30">
        <div
          ref={contentRef}
          className="h-full max-w-3xl mx-auto bg-card rounded-lg shadow-lg overflow-auto p-8 font-mono text-sm leading-relaxed"
        >
          <pre className="whitespace-pre-wrap break-words">
            {currentContent || (
              <span className="text-muted-foreground italic">Empty document</span>
            )}
          </pre>
        </div>
      </div>

      {/* Controls footer */}
      <footer className="border-t px-6 py-4 space-y-4">
        {/* Timeline */}
        <TimelapseTimeline
          progress={progress}
          currentIndex={currentIndex}
          totalOperations={operations.length}
          elapsedTime={elapsedTime}
          totalDuration={totalDuration}
          onSeek={seekTo}
        />

        {/* Playback controls */}
        <div className="flex items-center justify-center">
          <TimelapseControls
            isPlaying={isPlaying}
            speed={speed}
            currentIndex={currentIndex}
            totalOperations={operations.length}
            onTogglePlayback={togglePlayback}
            onStop={stop}
            onStepForward={stepForward}
            onStepBackward={stepBackward}
            onSeekToEnd={() => seekTo(operations.length - 1)}
            onChangeSpeed={changeSpeed}
          />
        </div>
      </footer>
    </div>
  );
}
