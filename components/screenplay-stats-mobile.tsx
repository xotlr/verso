'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Layout, Film, Users, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface ScreenplayStatsMobileProps {
  wordCount: number;
  pageCount: number;
  sceneCount: number;
  characterCount: number;
  onOpenScenes?: () => void;
  className?: string;
}

/**
 * Mobile stats bar for screenplay page.
 * Shows collapsed view with words + pages, expandable to show all stats.
 * Only visible on mobile (md:hidden).
 */
export function ScreenplayStatsMobile({
  wordCount,
  pageCount,
  sceneCount,
  characterCount,
  onOpenScenes,
  className,
}: ScreenplayStatsMobileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-collapse when user starts typing (listen for keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only collapse if expanded and it's a typing key (not modifiers)
      if (isExpanded && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <div
      className={cn(
        'md:hidden',
        'bg-card/95 backdrop-blur-sm border-b border-border/50',
        'transition-all duration-200 ease-out',
        className
      )}
    >
      {/* Collapsed View - Words + Pages */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5',
          'text-sm text-muted-foreground',
          'active:bg-accent/50 transition-colors',
          'touch-manipulation'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span>{wordCount.toLocaleString()} words</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Layout className="h-3.5 w-3.5 text-purple-500" />
            <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded View - 2x2 Grid */}
      <div
        className={cn(
          'grid grid-cols-2 gap-3 px-4 overflow-hidden transition-all duration-200',
          isExpanded ? 'pb-4 pt-1 max-h-40 opacity-100' : 'max-h-0 opacity-0 pb-0 pt-0'
        )}
      >
        <StatCard
          icon={FileText}
          iconColor="text-blue-500"
          value={wordCount.toLocaleString()}
          label="Words"
        />
        <StatCard
          icon={Layout}
          iconColor="text-purple-500"
          value={pageCount}
          label={pageCount === 1 ? 'Page' : 'Pages'}
        />
        <StatCard
          icon={Film}
          iconColor="text-green-500"
          value={sceneCount}
          label={sceneCount === 1 ? 'Scene' : 'Scenes'}
          onClick={onOpenScenes}
          interactive
        />
        <StatCard
          icon={Users}
          iconColor="text-orange-500"
          value={characterCount}
          label={characterCount === 1 ? 'Character' : 'Characters'}
          onClick={onOpenScenes}
          interactive
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  value: string | number;
  label: string;
  onClick?: () => void;
  interactive?: boolean;
}

function StatCard({ icon: Icon, iconColor, value, label, onClick, interactive }: StatCardProps) {
  const content = (
    <>
      <div className={cn('p-1.5 rounded-md bg-background', iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {interactive && (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </>
  );

  if (interactive && onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-2.5 bg-muted/50 rounded-lg p-3',
          'hover:bg-muted/70 active:scale-[0.98] transition-all',
          'touch-manipulation text-left'
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5 bg-muted/50 rounded-lg p-3">
      {content}
    </div>
  );
}
