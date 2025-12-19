'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  Save,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
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

type TabValue = 'versions' | 'history';

interface VersionHistorySidebarProps {
  screenplayId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
  onCompare?: (version: ScreenplayVersion) => void;
  onCompareTwoVersions?: (fromVersion: ScreenplayVersion, toVersion: ScreenplayVersion) => void;
  onSaveVersion?: () => void;
  currentContent: string;
}

export function VersionHistorySidebar({
  screenplayId,
  isOpen,
  onClose,
  onRestore,
  onCompare,
  onCompareTwoVersions,
  onSaveVersion,
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
  const [activeTab, setActiveTab] = useState<TabValue>('versions');

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
      setCompareFrom(compareTo);
      setCompareTo(version);
    }
  };

  const handleDoCompare = () => {
    if (compareFrom && compareTo && onCompareTwoVersions) {
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
    return parts.length > 0 ? parts.join('/') : null;
  };

  // Filter versions based on active tab
  const filteredVersions = activeTab === 'versions'
    ? versions.filter(v => v.reason === 'manual')
    : versions;

  // Count manual versions for tab badge
  const manualVersionsCount = versions.filter(v => v.reason === 'manual').length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-[400px] sm:w-[440px] p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                History
              </SheetTitle>
              {onSaveVersion && (
                <Button
                  size="sm"
                  onClick={onSaveVersion}
                  className="h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Save Version
                </Button>
              )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="versions" className="text-xs">
                  Versions
                  {manualVersionsCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                      {manualVersionsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  All History
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Compare mode toggle */}
            {onCompareTwoVersions && !compareMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompareMode(true)}
                className="w-full h-7 text-xs text-muted-foreground"
              >
                <GitCompare className="h-3 w-3 mr-1.5" />
                Compare versions
              </Button>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredVersions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                    {activeTab === 'versions' ? (
                      <Save className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {activeTab === 'versions' ? 'No saved versions yet' : 'No history yet'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                    {activeTab === 'versions'
                      ? 'Click "Save Version" to create a named checkpoint of your work.'
                      : 'History will appear as you work on your screenplay.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Compare mode selection bar */}
                  {compareMode && (
                    <div className="mb-3 p-2.5 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={compareFrom ? 'font-medium' : 'text-muted-foreground'}>
                            {compareFrom ? `v${compareFrom.versionNumber}` : 'Select first'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className={compareTo ? 'font-medium' : 'text-muted-foreground'}>
                            {compareTo ? `v${compareTo.versionNumber}` : 'Select second'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={exitCompareMode}
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleDoCompare}
                            disabled={!compareFrom || !compareTo}
                            className="h-6 px-2 text-xs"
                          >
                            Compare
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredVersions.map((version) => {
                    const revisionColorInfo = version.revisionColor
                      ? REVISION_COLOR_MAP[version.revisionColor as RevisionColor]
                      : null;
                    const isSelectedForCompare = compareFrom?.id === version.id || compareTo?.id === version.id;
                    const changeStatsText = formatChangeStats(version.changeStats);
                    const isManualVersion = version.reason === 'manual';

                    return (
                      <div
                        key={version.id}
                        className={`
                          group relative rounded-lg border bg-card transition-all
                          ${compareMode ? 'cursor-pointer hover:border-primary/50' : 'hover:bg-accent/30'}
                          ${isSelectedForCompare ? 'ring-2 ring-primary border-primary' : ''}
                          ${isManualVersion ? 'border-border' : 'border-border/50'}
                        `}
                        onClick={compareMode ? () => handleCompareSelect(version) : undefined}
                      >
                        {/* Revision color strip */}
                        {revisionColorInfo && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                            style={{ backgroundColor: revisionColorInfo.hex }}
                          />
                        )}

                        <div className="p-3 pl-4">
                          {/* Top row: version number, label, time */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-medium ${isManualVersion ? 'text-sm' : 'text-xs text-muted-foreground'}`}>
                                {isManualVersion ? `Version ${version.versionNumber}` : `v${version.versionNumber}`}
                              </span>
                              {/* Show reason badge only in History tab */}
                              {activeTab === 'history' && !isManualVersion && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                  {version.reason === 'auto' ? 'Auto' : version.reason === 'interval' ? '30min' : 'Restore'}
                                </Badge>
                              )}
                              {/* Revision color badge for manual versions */}
                              {isManualVersion && revisionColorInfo && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 h-4 border-0"
                                  style={{
                                    backgroundColor: revisionColorInfo.hex,
                                    color: ['white', 'yellow', 'buff'].includes(version.revisionColor || '') ? '#1f2937' : '#f9fafb'
                                  }}
                                >
                                  {revisionColorInfo.name}
                                </Badge>
                              )}
                            </div>

                            {/* Time */}
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          {/* Label (editable) */}
                          {editingLabel === version.id ? (
                            <div className="flex items-center gap-1 mb-2">
                              <Input
                                value={labelValue}
                                onChange={(e) => setLabelValue(e.target.value)}
                                placeholder="Add a label..."
                                className="h-6 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLabel(version.id);
                                  else if (e.key === 'Escape') {
                                    setEditingLabel(null);
                                    setLabelValue('');
                                  }
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveLabel(version.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingLabel(null); setLabelValue(''); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : version.label ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingLabel(version.id); setLabelValue(version.label || ''); }}
                              className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"
                            >
                              <Tag className="h-3 w-3" />
                              {version.label}
                            </button>
                          ) : isManualVersion && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingLabel(version.id); setLabelValue(''); }}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              Add label
                            </button>
                          )}

                          {/* Commit message */}
                          {version.message && (
                            <div className="mb-2 text-xs text-foreground/80 bg-muted/50 px-2 py-1.5 rounded flex items-start gap-1.5">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <span className="line-clamp-2">{version.message}</span>
                            </div>
                          )}

                          {/* Stats row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{version.wordCount.toLocaleString()} words</span>
                              <span>·</span>
                              <span>{version.sceneCount} scenes</span>
                              {changeStatsText && (
                                <>
                                  <span>·</span>
                                  <span className={`flex items-center gap-0.5 ${
                                    version.changeStats && version.changeStats.wordsAdded > version.changeStats.wordsRemoved
                                      ? 'text-green-600 dark:text-green-400'
                                      : version.changeStats && version.changeStats.wordsRemoved > version.changeStats.wordsAdded
                                      ? 'text-red-600 dark:text-red-400'
                                      : ''
                                  }`}>
                                    {version.changeStats && version.changeStats.wordsAdded > version.changeStats.wordsRemoved ? (
                                      <TrendingUp className="h-2.5 w-2.5" />
                                    ) : version.changeStats && version.changeStats.wordsRemoved > version.changeStats.wordsAdded ? (
                                      <TrendingDown className="h-2.5 w-2.5" />
                                    ) : null}
                                    {changeStatsText}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Action buttons */}
                            {!compareMode && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onCompare && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); onCompare(version); }}
                                    title="Compare with current"
                                  >
                                    <GitCompare className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => { e.stopPropagation(); handleRestoreClick(version); }}
                                  title="Restore this version"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </div>
                            )}

                            {/* Compare mode indicator */}
                            {compareMode && isSelectedForCompare && (
                              <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                {compareFrom?.id === version.id ? 'From' : 'To'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {hasMore && (
                    <Button
                      variant="ghost"
                      className="w-full h-8 text-xs text-muted-foreground"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : null}
                      {loadingMore ? 'Loading...' : 'Load more'}
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
