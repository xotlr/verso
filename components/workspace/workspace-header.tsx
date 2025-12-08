'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import type { GreetingResult } from '@/lib/greeting';

interface WorkspaceHeaderProps {
  greeting: GreetingResult;
  projectCount: number;
  screenplayCount: number;
  onCreateProject: () => void;
  onCreateScreenplay: () => void;
}

export function WorkspaceHeader({
  greeting,
  projectCount,
  screenplayCount,
  onCreateProject,
  onCreateScreenplay,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <h2
          className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words"
          suppressHydrationWarning
        >
          {greeting.text}
          {greeting.showName && greeting.name && (
            <span className="italic font-normal">, {greeting.name}</span>
          )}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {projectCount} project{projectCount !== 1 ? 's' : ''} &middot;{' '}
          {screenplayCount} screenplay{screenplayCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={onCreateProject}
          variant="outline"
          size="sm"
          className="touch-manipulation"
        >
          <RiFolder6Line className="h-4 w-4 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm">New Project</span>
        </Button>
        <Button
          onClick={onCreateScreenplay}
          size="sm"
          className="touch-manipulation"
        >
          <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
          <span className="text-xs sm:text-sm">New Screenplay</span>
        </Button>
      </div>
    </div>
  );
}
