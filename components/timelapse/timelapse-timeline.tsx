'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimelapseTimelineProps {
  progress: number;
  currentIndex: number;
  totalOperations: number;
  elapsedTime: number;
  totalDuration: number;
  onSeek: (index: number) => void;
  className?: string;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TimelapseTimeline({
  progress,
  currentIndex,
  totalOperations,
  elapsedTime,
  totalDuration,
  onSeek,
  className,
}: TimelapseTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);

  const calculateIndexFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current || totalOperations === 0) return 0;

    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(percentage * (totalOperations - 1));
  }, [totalOperations]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const index = calculateIndexFromPosition(e.clientX);
    onSeek(index);
  }, [calculateIndexFromPosition, onSeek]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const index = calculateIndexFromPosition(e.clientX);
      onSeek(index);
    }
  }, [isDragging, calculateIndexFromPosition, onSeek]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTrackHover = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current || totalOperations === 0) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setHoverProgress(percentage);
  }, [totalOperations]);

  const handleTrackLeave = useCallback(() => {
    setHoverProgress(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-2 bg-muted rounded-full cursor-pointer group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleTrackHover}
        onMouseLeave={handleTrackLeave}
      >
        {/* Hover preview */}
        {hoverProgress !== null && !isDragging && (
          <div
            className="absolute top-0 h-full bg-muted-foreground/20 rounded-full transition-all duration-75"
            style={{ width: `${hoverProgress}%` }}
          />
        )}

        {/* Progress fill */}
        <div
          className="absolute top-0 h-full bg-primary rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 bg-primary rounded-full shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isDragging && 'opacity-100 scale-110'
          )}
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Time labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDuration(elapsedTime)}</span>
        <span className="text-muted-foreground/60">
          {currentIndex + 1} / {totalOperations} operations
        </span>
        <span>{formatDuration(totalDuration)}</span>
      </div>
    </div>
  );
}
