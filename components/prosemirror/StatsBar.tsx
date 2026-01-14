'use client';

import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsBarProps {
  wordCount: number;
  pageCount: number;
  sceneCount: number;
  characterCount: number;
  isSaving?: boolean;
  className?: string;
}

/**
 * Minimal stats bar - shows save status + page count, expands on hover for more stats.
 * Memoized to prevent re-renders on every keystroke.
 */
export const StatsBar = React.memo(function StatsBar({
  wordCount,
  pageCount,
  sceneCount,
  characterCount,
  isSaving,
  className,
}: StatsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn('fixed bottom-4 right-4 z-40', className)}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Expanded stats - appears above on hover */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-popover/95 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-3">
            <span>{wordCount.toLocaleString()} words</span>
            <span className="text-border">·</span>
            <span>{sceneCount} scenes</span>
            <span className="text-border">·</span>
            <span>{characterCount} characters</span>
          </div>
        </div>
      )}

      {/* Collapsed stats - always visible */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 backdrop-blur-sm border border-border/30 text-xs text-muted-foreground/70 hover:text-muted-foreground hover:bg-card/70 transition-colors cursor-default">
        {/* Save status */}
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3 text-green-500/70" />
        )}
        <span className="text-border/50">·</span>
        <span>
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
      </div>
    </div>
  );
});
