'use client';

/**
 * Import Preview Dialog
 *
 * Shows a side-by-side preview of imported screenplay content with
 * warnings, stats, and confirm/cancel actions.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Layers,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Scene, SceneElement } from '@/types/screenplay';
import type { ImportWarning, ImportStats, ParserFormat } from '@/lib/parsers/types';

interface ImportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The imported content */
  content: string;
  /** Raw original content (for side-by-side view) */
  rawContent?: string;
  /** Title from the file */
  title?: string;
  /** Format detected */
  format?: ParserFormat;
  /** Scenes parsed */
  scenes?: Scene[];
  /** Elements parsed */
  elements?: SceneElement[];
  /** Import warnings */
  warnings?: ImportWarning[];
  /** Import statistics */
  stats?: ImportStats;
  /** Word count */
  wordCount?: number;
  /** File name */
  filename?: string;
  /** Whether confirmation is in progress */
  isConfirming?: boolean;
}

export function ImportPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  content,
  rawContent,
  title,
  format,
  scenes = [],
  elements = [],
  warnings = [],
  stats,
  wordCount,
  filename,
  isConfirming = false,
}: ImportPreviewDialogProps) {
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  // Calculate stats from parsed data if not provided
  const displayStats = useMemo(() => {
    if (stats) return stats;

    // Extract unique characters from scenes
    const characters = new Set<string>();
    scenes.forEach((scene) => {
      scene.characters?.forEach((char) => characters.add(char));
    });

    // Count element types
    let dialogueCount = 0;
    let actionCount = 0;
    let transitionCount = 0;

    elements.forEach((el) => {
      if (el.type === 'dialogue') dialogueCount++;
      else if (el.type === 'action') actionCount++;
      else if (el.type === 'transition') transitionCount++;
    });

    return {
      scenes: scenes.length,
      characters: Array.from(characters),
      pages: Math.ceil(elements.length / 55),
      dialogueBlocks: dialogueCount,
      actionBlocks: actionCount,
      transitions: transitionCount,
      dualDialogues: 0,
      revisionMarks: 0,
    };
  }, [stats, scenes, elements]);

  // Format name mapping
  const formatNames: Record<string, string> = {
    fdx: 'Final Draft',
    fountain: 'Fountain',
    highland: 'Highland',
    fadein: 'Fade In',
    txt: 'Plain Text',
    pdf: 'PDF',
    docx: 'Word',
  };

  // Synchronized scrolling
  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;

    if (!leftEl || !rightEl) return;

    let syncing = false;

    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (syncing) return;
      syncing = true;

      const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);

      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const handleLeftScroll = () => syncScroll(leftEl, rightEl);
    const handleRightScroll = () => syncScroll(rightEl, leftEl);

    leftEl.addEventListener('scroll', handleLeftScroll);
    rightEl.addEventListener('scroll', handleRightScroll);

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll);
      rightEl.removeEventListener('scroll', handleRightScroll);
    };
  }, []);

  const hasWarnings = warnings.length > 0;
  const criticalWarnings = warnings.filter(
    (w) => w.type === 'structure' || w.type === 'element'
  );
  const minorWarnings = warnings.filter(
    (w) => w.type === 'formatting' || w.type === 'character'
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                Import Preview
                {format && (
                  <Badge variant="outline" className="ml-2">
                    {formatNames[format] || format.toUpperCase()}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {title || filename || 'Untitled Screenplay'}
              </DialogDescription>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content - Side by Side */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 divide-x">
          {/* Original Preview (Left) */}
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Original</span>
            </div>
            <ScrollArea className="flex-1">
              <div
                ref={leftScrollRef}
                className="p-4 h-full overflow-auto"
              >
                <pre className="font-mono text-xs whitespace-pre-wrap break-words leading-relaxed text-muted-foreground">
                  {rawContent || content}
                </pre>
              </div>
            </ScrollArea>
          </div>

          {/* Verso Preview (Right) */}
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Verso Preview</span>
            </div>
            <ScrollArea className="flex-1">
              <div
                ref={rightScrollRef}
                className="p-4 h-full overflow-auto"
              >
                <pre className="font-mono text-xs whitespace-pre-wrap break-words leading-relaxed">
                  {content}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Stats and Warnings Bar */}
        <div className="px-6 py-3 border-t bg-muted/30 flex-shrink-0">
          {/* Stats Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{displayStats.scenes}</span>
                <span className="text-muted-foreground">scenes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{displayStats.characters.length}</span>
                <span className="text-muted-foreground">characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{displayStats.pages}</span>
                <span className="text-muted-foreground">est. pages</span>
              </div>
              {wordCount && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>{wordCount.toLocaleString()} words</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={isConfirming}>
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={isConfirming}>
                {isConfirming ? 'Importing...' : 'Import Now'}
              </Button>
            </div>
          </div>

          {/* Warnings Section */}
          {hasWarnings && (
            <Collapsible open={warningsExpanded} onOpenChange={setWarningsExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'w-full flex items-center justify-between py-2 px-3 rounded-md',
                    'bg-warning/10 hover:bg-warning/20 transition-colors',
                    'text-sm text-warning-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {warnings.length} warning{warnings.length !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                  {warningsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {criticalWarnings.map((warning, index) => (
                    <div
                      key={`critical-${index}`}
                      className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-destructive-foreground">{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {warning.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {minorWarnings.map((warning, index) => (
                    <div
                      key={`minor-${index}`}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p>{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {warning.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* No warnings indicator */}
          {!hasWarnings && (
            <div className="flex items-center gap-2 text-sm text-success-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>No issues detected</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
