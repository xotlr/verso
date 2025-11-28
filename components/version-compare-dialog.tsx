'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ScreenplayVersion } from '@/types/version';
import { RotateCcw, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DiffMatchPatch from 'diff-match-patch';

interface VersionCompareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  version: ScreenplayVersion | null;
  onRestore?: (content: string) => void;
}

export function VersionCompareDialog({
  isOpen,
  onClose,
  currentContent,
  version,
  onRestore,
}: VersionCompareDialogProps) {
  const diff = useMemo(() => {
    if (!version) return [];

    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(version.content, currentContent);
    dmp.diff_cleanupSemantic(diffs);

    return diffs;
  }, [version, currentContent]);

  const stats = useMemo(() => {
    if (!version) return { additions: 0, deletions: 0 };

    let additions = 0;
    let deletions = 0;

    diff.forEach(([op, text]) => {
      if (op === 1) {
        additions += text.length;
      } else if (op === -1) {
        deletions += text.length;
      }
    });

    return { additions, deletions };
  }, [diff, version]);

  if (!version) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">
                Comparing Version {version.versionNumber} with Current
              </DialogTitle>
              <DialogDescription className="mt-1">
                {formatDistanceToNow(new Date(version.createdAt), {
                  addSuffix: true,
                })}{' '}
                {version.label && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {version.label}
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">
                +{stats.additions.toLocaleString()}
              </span>
              <span className="text-sm text-red-600">
                -{stats.deletions.toLocaleString()}
              </span>
              {onRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onRestore(version.content);
                    onClose();
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore this version
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              <pre className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
                {diff.map(([op, text], index) => {
                  if (op === 0) {
                    // Unchanged
                    return (
                      <span key={index} className="text-foreground">
                        {text}
                      </span>
                    );
                  } else if (op === 1) {
                    // Addition (in current, not in version)
                    return (
                      <span
                        key={index}
                        className="bg-green-500/20 text-green-700 dark:text-green-400"
                      >
                        {text}
                      </span>
                    );
                  } else {
                    // Deletion (in version, not in current)
                    return (
                      <span
                        key={index}
                        className="bg-red-500/20 text-red-700 dark:text-red-400 line-through"
                      >
                        {text}
                      </span>
                    );
                  }
                })}
              </pre>
            </div>
          </ScrollArea>
        </div>

        <div className="px-6 py-3 border-t bg-muted/50 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Version {version.versionNumber}: {version.wordCount.toLocaleString()} words,{' '}
            {version.sceneCount} scenes
          </div>
          <div>
            Current: {currentContent.split(/\s+/).filter(Boolean).length.toLocaleString()} words
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
