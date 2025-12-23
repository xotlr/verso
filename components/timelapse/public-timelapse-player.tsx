'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { EditorView } from 'prosemirror-view';
import { Film, User, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelapseControls } from './timelapse-controls';
import { TimelapseTimeline } from './timelapse-timeline';
import { usePublicTimelapse } from '@/hooks/timelapse';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProseMirrorEditor } from '@/components/prosemirror/ProseMirrorEditor';
import { Loader2 } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef<string>('');
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleViewReady = useCallback((view: EditorView) => {
    setEditorView(view);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fallback for browsers that don't support fullscreen
        setIsFullscreen(false);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Listen for fullscreen changes (e.g., Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const {
    screenplay,
    currentContent,
    currentIndex,
    isPlaying,
    isLoading,
    loadingProgress,
    loadingStatus,
    error,
    speed,
    progress,
    elapsedTime,
    totalDuration,
    operations,
    paginationCache,
    togglePlayback,
    stop,
    seekTo,
    stepForward,
    stepBackward,
    changeSpeed,
  } = usePublicTimelapse({
    shareId,
  });

  // Scroll to keep the edit position visible during playback
  // Detects where content changed by comparing with previous content
  useEffect(() => {
    // Check that editor view is fully initialized (docView exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (editorView && (editorView as any).docView && currentContent && contentRef.current) {
      const prevContent = prevContentRef.current;
      prevContentRef.current = currentContent;

      // Use requestAnimationFrame to ensure DOM is updated before calculating positions
      requestAnimationFrame(() => {
        try {
          // Find where content changed by comparing old vs new
          let changePos = 0;
          if (prevContent) {
            const minLen = Math.min(prevContent.length, currentContent.length);
            for (let i = 0; i < minLen; i++) {
              if (prevContent[i] !== currentContent[i]) {
                changePos = i;
                break;
              }
              changePos = i + 1;
            }
            // If no difference found in common part, change is at the end
            if (changePos >= minLen) {
              changePos = Math.max(prevContent.length, currentContent.length);
            }
          } else {
            // No previous content, scroll to end
            changePos = currentContent.length;
          }

          // Convert string position to approximate ProseMirror doc position
          const docSize = editorView.state.doc.content.size;
          const ratio = currentContent.length > 0 ? changePos / currentContent.length : 1;
          const targetPos = Math.min(Math.max(0, Math.round(ratio * docSize)), docSize - 1);

          // Use ProseMirror's coordsAtPos to get screen coordinates
          const coords = editorView.coordsAtPos(targetPos);

          // Find the ACTUAL scroll container (Radix ScrollArea viewport inside ProseMirrorEditor)
          const scrollViewport = contentRef.current?.querySelector(
            '[data-radix-scroll-area-viewport]'
          ) as HTMLElement | null;

          if (coords && scrollViewport) {
            const viewportRect = scrollViewport.getBoundingClientRect();
            const viewportHeight = viewportRect.height;

            // Calculate scroll position to center the edit position
            const targetScrollTop = scrollViewport.scrollTop + (coords.top - viewportRect.top) - (viewportHeight / 2);

            // Use instant scroll at high speeds, smooth at low speeds
            scrollViewport.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: speed >= 10 ? 'auto' : 'smooth',
            });
          }
        } catch {
          // Editor may not be ready yet, ignore
        }
      });
    }
  }, [currentContent, editorView, speed]);

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
      <div className={cn('flex flex-col h-full items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {loadingStatus === 'computing' ? 'Computing page breaks...' : 'Loading timelapse...'}
            </p>
            <p className="text-3xl font-bold text-primary">{loadingProgress}%</p>
          </div>
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
    <div ref={containerRef} className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <header className="flex items-center justify-between border-b px-3 sm:px-6 py-2 sm:py-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Film className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="font-semibold text-sm sm:text-lg truncate">{screenplay?.title || 'Untitled'}</h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="hidden xs:inline">Timelapse by</span>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                  <AvatarImage src={screenplay?.authorImage} />
                  <AvatarFallback>
                    <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[100px] sm:max-w-none">{screenplay?.author || 'Anonymous'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <Link href="/" className="text-primary hover:underline font-medium">
              Verso
            </Link>
          </div>
        </div>
      </header>

      {/* Content viewer - scrolling handled by EditorScrollArea inside */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30" ref={contentRef}>
        {currentContent ? (
          <ProseMirrorEditor
            content={currentContent}
            editable={false}
            showElementIndicator={false}
            showStats={false}
            onViewReady={handleViewReady}
            timelapseMode={true}
            paginationCache={paginationCache}
            timelapseIndex={currentIndex}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-muted-foreground italic">Empty document</span>
          </div>
        )}
      </div>

      {/* Controls footer */}
      <footer className="border-t px-3 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 sm:space-y-4 shrink-0">
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
