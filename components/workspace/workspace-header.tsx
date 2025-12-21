'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import { getAcceptString } from '@/lib/parsers';
import type { GreetingResult } from '@/lib/greeting';

interface WorkspaceHeaderProps {
  greeting: GreetingResult;
  projectCount: number;
  screenplayCount: number;
  onCreateProject: () => void;
  onCreateScreenplay: () => void;
  onImportFile?: (file: File) => void;
  /** Optional loading states for buttons */
  isCreatingProject?: boolean;
  isCreatingScreenplay?: boolean;
  isImporting?: boolean;
}

export function WorkspaceHeader({
  greeting,
  projectCount,
  screenplayCount,
  onCreateProject,
  onCreateScreenplay,
  onImportFile,
  isCreatingProject = false,
  isCreatingScreenplay = false,
  isImporting = false,
}: WorkspaceHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImportFile) {
        onImportFile(file);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onImportFile]
  );
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
        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          onChange={handleFileChange}
          className="hidden"
        />
        {onImportFile && (
          <Button
            onClick={handleImportClick}
            variant="outline"
            size="sm"
            className="touch-manipulation"
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5 sm:mr-2" />
            )}
            <span className="text-xs sm:text-sm">Import</span>
          </Button>
        )}
        <Button
          onClick={onCreateProject}
          variant="outline"
          size="sm"
          className="touch-manipulation"
          disabled={isCreatingProject}
        >
          {isCreatingProject ? (
            <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
          ) : (
            <RiFolder6Line className="h-4 w-4 mr-1.5 sm:mr-2" />
          )}
          <span className="text-xs sm:text-sm">New Project</span>
        </Button>
        <Button
          onClick={onCreateScreenplay}
          size="sm"
          className="touch-manipulation"
          disabled={isCreatingScreenplay}
        >
          {isCreatingScreenplay ? (
            <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
          )}
          <span className="text-xs sm:text-sm">New Screenplay</span>
        </Button>
      </div>
    </div>
  );
}
