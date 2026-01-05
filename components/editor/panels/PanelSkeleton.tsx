'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PanelSkeletonProps {
  /** Variant determines the skeleton layout pattern */
  variant: 'characters' | 'scenes' | 'notes' | 'shotlist';
  className?: string;
}

/**
 * Consistent skeleton loading states for editor panels.
 * Provides visual feedback during data loading.
 */
export function PanelSkeleton({ variant, className }: PanelSkeletonProps) {
  return (
    <div className={cn('p-3 space-y-3', className)}>
      {variant === 'characters' && <CharactersSkeleton />}
      {variant === 'scenes' && <ScenesSkeleton />}
      {variant === 'notes' && <NotesSkeleton />}
      {variant === 'shotlist' && <ShotlistSkeleton />}
    </div>
  );
}

function CharactersSkeleton() {
  return (
    <>
      {/* Search bar skeleton */}
      <Skeleton className="h-8 w-full rounded-md" />
      {/* Filter pills */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-5 w-12 rounded-md" />
        ))}
      </div>
      {/* Character items */}
      <div className="space-y-2 pt-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-2 p-2">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-12" />
            </div>
            <Skeleton className="h-4 w-10 rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}

function ScenesSkeleton() {
  return (
    <>
      {/* Search bar skeleton */}
      <Skeleton className="h-8 w-full rounded-md" />
      {/* Filter pills */}
      <div className="flex gap-1 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-5 w-10 rounded-md" />
        ))}
      </div>
      {/* Act/Scene items */}
      <div className="space-y-2 pt-2">
        {/* Act header */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-6 ml-auto" />
        </div>
        {/* Scene items */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <Skeleton className="h-3 w-8 shrink-0" />
            <Skeleton className="h-3 flex-1 max-w-32" />
          </div>
        ))}
        {/* Another act */}
        <div className="flex items-center gap-2 px-2 py-1.5 mt-3">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-6 ml-auto" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <Skeleton className="h-4 w-4 rounded shrink-0" />
            <Skeleton className="h-3 w-8 shrink-0" />
            <Skeleton className="h-3 flex-1 max-w-28" />
          </div>
        ))}
      </div>
    </>
  );
}

function NotesSkeleton() {
  return (
    <>
      {/* Search bar skeleton */}
      <Skeleton className="h-8 w-full rounded-md" />
      {/* Note items */}
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-2.5 rounded-lg bg-muted/30">
            <div className="flex items-start gap-2">
              <Skeleton className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 ml-5">
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ShotlistSkeleton() {
  return (
    <>
      {/* Search bar skeleton */}
      <Skeleton className="h-8 w-full rounded-md" />
      {/* Filter pills */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-5 w-14 rounded-full" />
        ))}
      </div>
      {/* Scene cards with shots */}
      <div className="space-y-3 pt-2">
        {[1, 2].map(sceneIdx => (
          <div key={sceneIdx} className="rounded-lg border border-border/50 overflow-hidden">
            {/* Scene header */}
            <div className="flex items-center gap-2 px-2 py-2 bg-muted/30">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 flex-1 max-w-24" />
              <Skeleton className="h-3 w-4" />
            </div>
            {/* Shots */}
            <div className="p-2 space-y-1.5">
              {[1, 2].map(shotIdx => (
                <div key={shotIdx} className="flex items-start gap-2 p-2">
                  <Skeleton className="h-3.5 w-3.5 shrink-0" />
                  <Skeleton className="h-5 w-5 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-3 w-12 rounded-md" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
