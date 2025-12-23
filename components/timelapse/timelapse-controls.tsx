'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10 | 20 | 50 | 100;

interface TimelapseControlsProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentIndex: number;
  totalOperations: number;
  onTogglePlayback: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeekToEnd: () => void;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  className?: string;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 2, 5, 10, 20, 50, 100];

export function TimelapseControls({
  isPlaying,
  speed,
  currentIndex,
  totalOperations,
  onTogglePlayback,
  onStop,
  onStepForward,
  onStepBackward,
  onSeekToEnd,
  onChangeSpeed,
  className,
}: TimelapseControlsProps) {
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= totalOperations - 1;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Jump to start */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onStop}
        disabled={isAtStart}
        title="Jump to start"
      >
        <SkipBack className="h-4 w-4" />
      </Button>

      {/* Step backward */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onStepBackward}
        disabled={isAtStart}
        title="Step backward"
      >
        <StepBack className="h-4 w-4" />
      </Button>

      {/* Play/Pause */}
      <Button
        variant="default"
        size="icon"
        onClick={onTogglePlayback}
        disabled={isAtEnd && !isPlaying}
        title={isPlaying ? 'Pause' : 'Play'}
        className="h-10 w-10"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      {/* Step forward */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onStepForward}
        disabled={isAtEnd}
        title="Step forward"
      >
        <StepForward className="h-4 w-4" />
      </Button>

      {/* Jump to end */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSeekToEnd}
        disabled={isAtEnd}
        title="Jump to end"
      >
        <SkipForward className="h-4 w-4" />
      </Button>

      {/* Speed selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 ml-2">
            <Gauge className="h-4 w-4" />
            <span>{speed}x</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top">
          {SPEED_OPTIONS.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={cn(s === speed && 'bg-accent')}
            >
              {s}x {s === 1 && '(Normal)'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
