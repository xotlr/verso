'use client';

/**
 * Import Progress Modal
 *
 * Shows detailed progress during file import with stage tracking
 * and element counts.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportStage, ImportProgress } from '@/lib/parsers/types';

interface ImportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  /** Current progress */
  progress: ImportProgress | null;
  /** File being imported */
  filename?: string;
  /** Error message if import failed */
  error?: string | null;
  /** Whether cancellation is supported */
  canCancel?: boolean;
}

// Stage configuration
const STAGES: {
  id: ImportStage;
  label: string;
  description: string;
}[] = [
  { id: 'reading', label: 'Reading File', description: 'Loading file contents' },
  { id: 'validating', label: 'Validating', description: 'Checking format' },
  { id: 'extracting', label: 'Extracting', description: 'Unpacking contents' },
  { id: 'parsing', label: 'Parsing', description: 'Analyzing structure' },
  { id: 'mapping', label: 'Mapping', description: 'Building document' },
  { id: 'complete', label: 'Complete', description: 'Import finished' },
];

// Stage order for comparison
const STAGE_ORDER: Record<ImportStage, number> = {
  reading: 0,
  validating: 1,
  extracting: 2,
  parsing: 3,
  mapping: 4,
  complete: 5,
};

export function ImportProgressModal({
  isOpen,
  onClose,
  onCancel,
  progress,
  filename,
  error,
  canCancel = true,
}: ImportProgressModalProps) {
  const currentStage = progress?.stage || 'reading';
  const currentStageOrder = STAGE_ORDER[currentStage];

  // Get display name for item type
  const getItemTypeLabel = (type?: string) => {
    switch (type) {
      case 'scenes':
        return 'scenes';
      case 'elements':
        return 'elements';
      case 'characters':
        return 'characters';
      case 'pages':
        return 'pages';
      default:
        return 'items';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span>Importing</span>
          </DialogTitle>
          {filename && (
            <DialogDescription className="truncate">
              {filename}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          {!error && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress?.message || 'Starting...'}
                </span>
                <span className="font-medium">{progress?.percent || 0}%</span>
              </div>
              <Progress value={progress?.percent || 0} className="h-2" />

              {/* Item count if available */}
              {progress?.currentItem !== undefined && progress?.totalItems !== undefined && (
                <p className="text-xs text-muted-foreground text-center">
                  {progress.currentItem} / {progress.totalItems}{' '}
                  {getItemTypeLabel(progress.itemType)}
                </p>
              )}
            </div>
          )}

          {/* Stage Checklist */}
          <div className="space-y-2">
            {STAGES.map((stage) => {
              const stageOrder = STAGE_ORDER[stage.id];
              const isCompleted = stageOrder < currentStageOrder;
              const isCurrent = stage.id === currentStage;
              const isPending = stageOrder > currentStageOrder;
              const isError = error && isCurrent;

              // Skip 'extracting' for formats that don't need it
              // (we always show it but it passes quickly)

              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    isCurrent && !isError && 'bg-primary/5',
                    isError && 'bg-destructive/5'
                  )}
                >
                  {/* Status Icon */}
                  {isCompleted && (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  )}
                  {isCurrent && !isError && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                  )}
                  {isError && (
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}
                  {isPending && (
                    <Circle className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
                  )}

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isPending && 'text-muted-foreground/50',
                        isError && 'text-destructive'
                      )}
                    >
                      {stage.label}
                    </p>
                    {isCurrent && !isError && (
                      <p className="text-xs text-muted-foreground truncate">
                        {stage.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Import Failed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          {error ? (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          ) : (
            canCancel && (
              <Button variant="outline" onClick={onCancel || onClose}>
                Cancel
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
