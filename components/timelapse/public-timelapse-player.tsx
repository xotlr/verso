'use client';

import React, { useEffect, useRef } from 'react';
import { Film, User } from 'lucide-react';
import { TimelapseControls } from './timelapse-controls';
import { TimelapseTimeline } from './timelapse-timeline';
import { usePublicTimelapse } from '@/hooks/use-public-timelapse';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

interface PublicTimelapsePlayerProps {
  shareId: string;
  className?: string;
}

export function PublicTimelapsePlayer({
  shareId,
  className,
}: PublicTimelapsePlayerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    screenplay,
    currentContent,
    currentIndex,
    isPlaying,
    isLoading,
    error,
    speed,
    progress,
    elapsedTime,
    totalDuration,
    operations,
    togglePlayback,
    stop,
    seekTo,
    stepForward,
    stepBackward,
    changeSpeed,
  } = usePublicTimelapse({
    shareId,
  });

  // Scroll to cursor position when content changes
  useEffect(() => {
    if (contentRef.current && currentContent) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [currentContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          <Film className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-destructive">Timelapse not found</h2>
          <p className="text-muted-foreground">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center text-primary hover:underline"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <Film className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">No timelapse data</h2>
          <p className="text-muted-foreground">
            This timelapse doesn&apos;t have any content yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Film className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-semibold text-lg">{screenplay?.title || 'Untitled'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Timelapse by</span>
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={screenplay?.authorImage} />
                  <AvatarFallback>
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>{screenplay?.author || 'Anonymous'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Powered by</span>
          <Link href="/" className="text-primary hover:underline font-medium">
            Verso
          </Link>
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
