'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScreenplayVersion, VersionsResponse, REVISION_COLOR_MAP, RevisionColor, ChangeStats } from '@/types/version';
import {
  Clock,
  History,
  RotateCcw,
  Loader2,
  GitCompare,
  Tag,
  Check,
  X,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface VersionHistorySidebarProps {
  screenplayId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
  onCompare?: (version: ScreenplayVersion) => void;
  onCompareTwoVersions?: (fromVersion: ScreenplayVersion, toVersion: ScreenplayVersion) => void;
  currentContent: string;
}

export function VersionHistorySidebar({
  screenplayId,
  isOpen,
  onClose,
  onRestore,
  onCompare,
  onCompareTwoVersions,
  currentContent: _currentContent,
}: VersionHistorySidebarProps) {
  const [versions, setVersions] = useState<ScreenplayVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<ScreenplayVersion | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelValue, setLabelValue] = useState('');

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareFrom, setCompareFrom] = useState<ScreenplayVersion | null>(null);
  const [compareTo, setCompareTo] = useState<ScreenplayVersion | null>(null);

  const fetchVersions = useCallback(async (pageNum: number, append = false) => {
    if (!screenplayId) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/screenplays/${screenplayId}/versions?page=${pageNum}&limit=20`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Version fetch failed:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch versions (${response.status})`);
      }

      const data: VersionsResponse = await response.json();

      if (append) {
        setVersions(prev => [...prev, ...data.versions]);
      } else {
        setVersions(data.versions);
      }

      setHasMore(pageNum < data.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [screenplayId]);

  useEffect(() => {
    if (isOpen) {
      fetchVersions(1);
    }
  }, [isOpen, fetchVersions]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchVersions(page + 1, true);
    }
  };

  const handleRestoreClick = (version: ScreenplayVersion) => {
    setSelectedVersion(version);
    setRestoreDialogOpen(true);
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;

    try {
      setRestoring(true);

      const response = await fetch(
        `/api/screenplays/${screenplayId}/versions/${selectedVersion.id}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      onRestore(selectedVersion.content);
      toast.success(`Restored to version ${selectedVersion.versionNumber}`);
      setRestoreDialogOpen(false);
      fetchVersions(1);
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  const handleSaveLabel = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/versions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: labelValue || null }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update label');
      }

      setVersions(prev =>
        prev.map(v =>
          v.id === versionId ? { ...v, label: labelValue || null } : v
        )
      );

      toast.success('Label updated');
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Failed to update label');
    } finally {
      setEditingLabel(null);
      setLabelValue('');
    }
  };

  const getReasonBadge = (reason: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      manual: { label: 'Saved', variant: 'default' },
      auto: { label: 'Auto', variant: 'secondary' },
      interval: { label: 'Interval', variant: 'outline' },
      restore: { label: 'Restore', variant: 'secondary' },
    };

    const badge = badges[reason] || { label: reason, variant: 'outline' as const };
    return (
      <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
        {badge.label}
      </Badge>
    );
  };

  // Handle compare mode selection
  const handleCompareSelect = (version: ScreenplayVersion) => {
    if (!compareFrom) {
      setCompareFrom(version);
    } else if (!compareTo && version.id !== compareFrom.id) {
      setCompareTo(version);
    } else if (version.id === compareFrom.id) {
      setCompareFrom(null);
    } else if (compareTo && version.id === compareTo.id) {
      setCompareTo(null);
    } else {
      // Both selected, replace the "from" with new selection
      setCompareFrom(compareTo);
      setCompareTo(version);
    }
  };

  const handleDoCompare = () => {
    if (compareFrom && compareTo && onCompareTwoVersions) {
      // Always compare older to newer (lower version number first)
      const [older, newer] = compareFrom.versionNumber < compareTo.versionNumber
        ? [compareFrom, compareTo]
        : [compareTo, compareFrom];
      onCompareTwoVersions(older, newer);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareFrom(null);
    setCompareTo(null);
  };

  // Format change stats
  const formatChangeStats = (stats: ChangeStats | null) => {
    if (!stats) return null;
    const { wordsAdded, wordsRemoved } = stats;
    const parts = [];
    if (wordsAdded > 0) parts.push(`+${wordsAdded}`);
    if (wordsRemoved > 0) parts.push(`-${wordsRemoved}`);
    return parts.length > 0 ? parts.join(' / ') + ' words' : null;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </SheetTitle>
              {onCompareTwoVersions && (
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
                  className="text-xs"
                >
                  <GitCompare className="h-3.5 w-3.5 mr-1.5" />
                  {compareMode ? 'Exit Compare' : 'Compare'}
                </Button>
              )}
            </div>
            <SheetDescription>
              {compareMode
                ? 'Select two versions to compare'
                : 'Browse and restore previous versions of your screenplay'}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No versions yet. Versions are created when you save manually.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Compare mode selection bar */}
                  {compareMode && (compareFrom || compareTo) && (
                    <div className="mb-4 p-3 bg-muted rounded-lg border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {compareFrom ? `v${compareFrom.versionNumber}` : 'Select first'}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {compareTo ? `v${compareTo.versionNumber}` : 'Select second'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleDoCompare}
                          disabled={!compareFrom || !compareTo}
                        >
                          Compare
                        </Button>
                      </div>
                    </div>
                  )}

                  {versions.map((version) => {
                    const revisionColorInfo = version.revisionColor
                      ? REVISION_COLOR_MAP[version.revisionColor as RevisionColor]
                      : null;
                    const isSelectedForCompare = compareFrom?.id === version.id || compareTo?.id === version.id;
                    const changeStatsText = formatChangeStats(version.changeStats);

                    return (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-3 hover:bg-muted/50 transition-colors relative overflow-hidden ${
                        compareMode ? 'cursor-pointer' : ''
                      } ${isSelectedForCompare ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      onClick={compareMode ? () => handleCompareSelect(version) : undefined}
                    >
                      {/* Revision color indicator strip */}
                      {revisionColorInfo && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: revisionColorInfo.hex }}
                        />
                      )}
                      <div className="flex items-start justify-between gap-2 pl-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {/* Revision color dot */}
                            {revisionColorInfo && (
                              <div
                                className="w-3 h-3 rounded-full border border-border shrink-0"
                                style={{ backgroundColor: revisionColorInfo.hex }}
                                title={`${revisionColorInfo.name} revision`}
                              />
                            )}
                            <span className="font-medium text-sm">
                              Version {version.versionNumber}
                            </span>
                            {getReasonBadge(version.reason)}
                            {/* Revision color name badge */}
                            {revisionColorInfo && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                                style={{
                                  backgroundColor: revisionColorInfo.hex,
                                  borderColor: revisionColorInfo.hex === '#ffffff' ? undefined : revisionColorInfo.hex,
                                  color: ['white', 'yellow', 'buff'].includes(version.revisionColor || '') ? '#1f2937' : undefined
                                }}
                              >
                                {revisionColorInfo.name}
                              </Badge>
                            )}
                          </div>

                          {editingLabel === version.id ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Input
                                value={labelValue}
                                onChange={(e) => setLabelValue(e.target.value)}
                                placeholder="Add a label..."
                                className="h-7 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveLabel(version.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingLabel(null);
                                    setLabelValue('');
                                  }
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleSaveLabel(version.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingLabel(null);
                                  setLabelValue('');
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : version.label ? (
                            <button
                              onClick={() => {
                                setEditingLabel(version.id);
                                setLabelValue(version.label || '');
                              }}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Tag className="h-3 w-3" />
                              {version.label}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingLabel(version.id);
                                setLabelValue('');
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <Tag className="h-3 w-3" />
                              Add label
                            </button>
                          )}

                          {/* Commit message display */}
                          {version.message && (
                            <div className="mt-2 text-xs text-foreground/80 bg-muted/50 px-2 py-1.5 rounded flex items-start gap-1.5">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="italic">&quot;{version.message}&quot;</span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(version.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            <span>{version.wordCount.toLocaleString()} words</span>
                            <span>{version.sceneCount} scenes</span>
                            {/* Change stats */}
                            {changeStatsText && (
                              <span className={`flex items-center gap-0.5 ${
                                version.changeStats && version.changeStats.wordsAdded > version.changeStats.wordsRemoved
                                  ? 'text-green-600 dark:text-green-400'
                                  : version.changeStats && version.changeStats.wordsRemoved > version.changeStats.wordsAdded
                                  ? 'text-red-600 dark:text-red-400'
                                  : ''
                              }`}>
                                {version.changeStats && version.changeStats.wordsAdded > version.changeStats.wordsRemoved ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : version.changeStats && version.changeStats.wordsRemoved > version.changeStats.wordsAdded ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : null}
                                {changeStatsText}
                              </span>
                            )}
                          </div>

                          {version.creator && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              by {version.creator.name || 'Unknown'}
                            </div>
                          )}
                        </div>

                        {/* Action buttons - hide in compare mode */}
                        {!compareMode && (
                          <div className="flex items-center gap-1">
                            {onCompare && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCompare(version);
                                }}
                                title="Compare with current"
                              >
                                <GitCompare className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreClick(version);
                              }}
                              title="Restore this version"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Compare mode indicator */}
                        {compareMode && isSelectedForCompare && (
                          <div className="flex items-center">
                            <Badge variant="default" className="text-xs">
                              {compareFrom?.id === version.id ? 'From' : 'To'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  })}

                  {hasMore && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load more versions'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version {selectedVersion?.versionNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current content with this version. A backup of your current
              content will be saved automatically before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
