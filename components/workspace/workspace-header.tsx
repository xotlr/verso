'use client';

import { useRef, useCallback, useState, useMemo } from 'react';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import { getAcceptString } from '@/lib/parsers';
import type { GreetingResult } from '@/lib/voice/features/greeting';
import { cn } from '@/lib/utils';
import { greetingPokeResponses } from '@/lib/voice/features/greeting/pools';
import { pickSmart } from '@/lib/voice/utils';

interface WorkspaceHeaderProps {
  greeting: GreetingResult & { mounted?: boolean };
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
  const [pokeCount, setPokeCount] = useState(0);
  const [pokeText, setPokeText] = useState<string | null>(null);
  const pokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle greeting clicks - escalating responses
  const handleGreetingClick = useCallback(() => {
    const newCount = pokeCount + 1;
    setPokeCount(newCount);

    // Get the appropriate pool (cap at 8)
    const level = Math.min(newCount, 8);
    const pool = greetingPokeResponses[level] || greetingPokeResponses[1];
    const response = pickSmart(pool, [], Date.now());
    setPokeText(response);

    // Clear any existing timeout
    if (pokeTimeoutRef.current) {
      clearTimeout(pokeTimeoutRef.current);
    }

    // Reset after 3 seconds of no clicking
    pokeTimeoutRef.current = setTimeout(() => {
      setPokeText(null);
      setPokeCount(0);
    }, 3000);
  }, [pokeCount]);

  // Display text - either poke response or normal greeting
  const displayText = useMemo(() => {
    if (pokeText) return pokeText;
    return greeting.text;
  }, [pokeText, greeting.text]);

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
  // Extract mounted state, default to true for backwards compatibility
  const isMounted = 'mounted' in greeting ? greeting.mounted : true;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <h2
          className={cn(
            "text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words",
            "transition-opacity duration-500 ease-out select-none",
            isMounted ? "opacity-100" : "opacity-0",
            pokeText && "cursor-default"
          )}
          onClick={handleGreetingClick}
          suppressHydrationWarning
        >
          {displayText}
          {!pokeText && greeting.showName && greeting.name && (
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
        {/* Button group - glass pill wrapper */}
        <div
          data-glass-pill=""
          className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border/60"
        >
          {onImportFile && (
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 h-8 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="hidden md:inline">Import</span>
            </button>
          )}
          <button
            onClick={onCreateProject}
            disabled={isCreatingProject}
            className="flex items-center gap-2 px-3 h-8 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {isCreatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <RiFolder6Line className="h-4 w-4" />}
            <span className="hidden md:inline">New Project</span>
          </button>
          <button
            onClick={onCreateScreenplay}
            disabled={isCreatingScreenplay}
            className="flex items-center gap-2 px-3 h-8 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {isCreatingScreenplay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="hidden sm:inline">New Screenplay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
