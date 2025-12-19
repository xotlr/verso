'use client';

import Link from 'next/link';
import { Play, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProfileReplayShowcaseProps {
  timelapseShareId: string;
  className?: string;
}

export function ProfileReplayShowcase({
  timelapseShareId,
  className,
}: ProfileReplayShowcaseProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Replay Showcase
      </h3>
      <div className="relative aspect-video rounded-lg border bg-card overflow-hidden group">
        {/* Preview thumbnail - could be enhanced with actual preview */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <Play className="h-5 w-5 text-primary ml-0.5" />
            </div>
            <p className="text-xs text-muted-foreground">
              Watch the creative process
            </p>
          </div>
        </div>

        {/* Overlay link */}
        <Link
          href={`/timelapse/${timelapseShareId}`}
          className="absolute inset-0"
          target="_blank"
        >
          <span className="sr-only">Watch timelapse</span>
        </Link>

        {/* Action button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="secondary" className="h-7 text-xs" asChild>
            <Link href={`/timelapse/${timelapseShareId}`} target="_blank">
              <ExternalLink className="h-3 w-3 mr-1" />
              Watch
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
