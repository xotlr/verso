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
import { ScreenplayVersion, REVISION_COLOR_MAP, RevisionColor } from '@/types/version';
import { ArrowRight, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DiffMatchPatch from 'diff-match-patch';

interface VersionCompareTwoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fromVersion: ScreenplayVersion | null;
  toVersion: ScreenplayVersion | null;
  onRestore?: (content: string) => void;
}

export function VersionCompareTwoDialog({
  isOpen,
  onClose,
  fromVersion,
  toVersion,
  onRestore,
}: VersionCompareTwoDialogProps) {
  const diff = useMemo(() => {
    if (!fromVersion || !toVersion) return [];

    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(fromVersion.content, toVersion.content);
    dmp.diff_cleanupSemantic(diffs);

    return diffs;
  }, [fromVersion, toVersion]);

  const stats = useMemo(() => {
    if (!fromVersion || !toVersion) return { additions: 0, deletions: 0 };

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
  }, [diff, fromVersion, toVersion]);

  if (!fromVersion || !toVersion) return null;

  const fromColorInfo = fromVersion.revisionColor
    ? REVISION_COLOR_MAP[fromVersion.revisionColor as RevisionColor]
    : null;
  const toColorInfo = toVersion.revisionColor
    ? REVISION_COLOR_MAP[toVersion.revisionColor as RevisionColor]
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  Version {fromVersion.versionNumber}
                  {fromColorInfo && (
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: fromColorInfo.hex }}
                      title={fromColorInfo.name}
                    />
                  )}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="flex items-center gap-1.5">
                  Version {toVersion.versionNumber}
                  {toColorInfo && (
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: toColorInfo.hex }}
                      title={toColorInfo.name}
                    />
                  )}
                </span>
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  {formatDistanceToNow(new Date(fromVersion.createdAt), { addSuffix: true })}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>
                  {formatDistanceToNow(new Date(toVersion.createdAt), { addSuffix: true })}
                </span>
                {fromVersion.label && (
                  <Badge variant="outline" className="text-xs">
                    {fromVersion.label}
                  </Badge>
                )}
                {toVersion.label && (
                  <Badge variant="outline" className="text-xs">
                    {toVersion.label}
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 dark:text-green-400">
                +{stats.additions.toLocaleString()}
              </span>
              <span className="text-sm text-red-600 dark:text-red-400">
                -{stats.deletions.toLocaleString()}
              </span>
              {onRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onRestore(toVersion.content);
                    onClose();
                  }}
                >
                  Restore v{toVersion.versionNumber}
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Version messages */}
        {(fromVersion.message || toVersion.message) && (
          <div className="px-6 py-3 border-b bg-muted/30 flex gap-4 text-sm">
            {fromVersion.message && (
              <div className="flex-1">
                <span className="text-muted-foreground">v{fromVersion.versionNumber}: </span>
                <span className="italic">&quot;{fromVersion.message}&quot;</span>
              </div>
            )}
            {toVersion.message && (
              <div className="flex-1">
                <span className="text-muted-foreground">v{toVersion.versionNumber}: </span>
                <span className="italic">&quot;{toVersion.message}&quot;</span>
              </div>
            )}
          </div>
        )}

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
                    // Addition (in toVersion, not in fromVersion)
                    return (
                      <span
                        key={index}
                        className="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-l-2 border-green-500/50 pl-1"
                      >
                        {text}
                      </span>
                    );
                  } else {
                    // Deletion (in fromVersion, not in toVersion)
                    return (
                      <span
                        key={index}
                        className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-l-2 border-red-500/50 pl-1 line-through"
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
            v{fromVersion.versionNumber}: {fromVersion.wordCount.toLocaleString()} words,{' '}
            {fromVersion.sceneCount} scenes
          </div>
          <div>
            v{toVersion.versionNumber}: {toVersion.wordCount.toLocaleString()} words,{' '}
            {toVersion.sceneCount} scenes
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
