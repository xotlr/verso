'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Clapperboard,
  ChevronDown,
  ChevronUp,
  Plus,
  Camera,
  Film,
  Sparkles,
} from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { formatShotLabel } from '@/lib/shotlist/format';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Shot,
  SceneWithShots,
  DetectedShot,
  SHOT_TYPE_LABELS,
  SHOT_STATUS_COLORS,
  ShotType,
  ShotStatus,
} from '@/types/shotlist';
import { getShotDisplayName } from '@/lib/screenplay/patterns';
import { PanelContainer } from './PanelContainer';
import { PanelSearch } from './PanelSearch';
import { PanelSkeleton } from './PanelSkeleton';
import { SortableShotItem } from './SortableShotItem';
import { usePanelDndSensors } from './use-panel-dnd';
import { useShotlistActions } from '@/hooks/panels';

interface ShotlistPanelProps {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  detectedShots?: DetectedShot[];
  currentSceneId?: string | null;
  isLoading?: boolean;
  onShotsChange?: (shots: Shot[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
  onAddDetectedShot?: (shot: DetectedShot) => void;
  className?: string;
}

/**
 * Shotlist panel showing shots grouped by scene.
 * Compact sidebar version of the full shotlist view.
 */
function ShotlistPanelInner({
  screenplayId,
  scenesWithShots,
  detectedShots = [],
  currentSceneId,
  isLoading = false,
  onShotsChange,
  onSceneClick: _onSceneClick,
  onEditShot,
  onAddShot,
  onAddDetectedShot,
  className,
}: ShotlistPanelProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
    new Set(scenesWithShots.slice(0, 3).map((s) => s.sceneId))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShotStatus | 'all'>('all');
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const sceneRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Settings for shotlist
  const { settings } = useSettings();
  const { numberFormat, detection } = settings.shotlist;
  const showDetectedShots = detection.enabled && detection.showSuggestions;

  // Shotlist CRUD actions
  const { handleDeleteShot, handleDuplicateShot } = useShotlistActions({
    screenplayId,
    scenesWithShots,
    onShotsChange,
  });

  // Create a map of global shot indices for global-sequential format
  const globalShotIndices = useMemo(() => {
    const indices = new Map<string, number>();
    let globalIndex = 1;
    for (const scene of scenesWithShots) {
      for (const shot of scene.shots) {
        indices.set(shot.id, globalIndex);
        globalIndex++;
      }
    }
    return indices;
  }, [scenesWithShots]);

  // Format shot number based on settings
  const getDisplayNumber = useCallback(
    (shot: Shot, sceneNumber: number) => {
      if (numberFormat === 'global-sequential') {
        const globalIndex = globalShotIndices.get(shot.id) ?? shot.shotNumber;
        return String(globalIndex);
      }
      return formatShotLabel(shot.shotNumber, sceneNumber, numberFormat);
    },
    [numberFormat, globalShotIndices]
  );

  // Expand first scene when data loads
  useEffect(() => {
    if (scenesWithShots.length > 0 && expandedScenes.size === 0) {
      setExpandedScenes(new Set([scenesWithShots[0].sceneId]));
    }
  }, [scenesWithShots, expandedScenes.size]);

  // Auto-expand and scroll to current scene when cursor moves in editor
  useEffect(() => {
    if (!currentSceneId) return;

    // Expand the current scene if not already expanded
    setExpandedScenes((prev) => {
      if (!prev.has(currentSceneId)) {
        const next = new Set(prev);
        next.add(currentSceneId);
        return next;
      }
      return prev;
    });

    // Scroll to the current scene
    const sceneElement = sceneRefs.current.get(currentSceneId);
    if (sceneElement) {
      sceneElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentSceneId]);

  const toggleScene = useCallback((sceneId: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  }, []);

  // Filter scenes and shots
  const filteredScenes = scenesWithShots
    .map((scene) => ({
      ...scene,
      shots: scene.shots.filter((shot) => {
        const matchesSearch =
          !searchQuery ||
          shot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scene.sceneHeading.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' || shot.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    }))
    .filter((scene) => scene.shots.length > 0 || !searchQuery);

  const totalShots = scenesWithShots.reduce(
    (acc, scene) => acc + scene.shots.length,
    0
  );

  // Get detected shots grouped by scene
  const getDetectedShotsForScene = useCallback((sceneId: string) => {
    return detectedShots.filter(s => s.sceneId === sceneId);
  }, [detectedShots]);

  // Check if a detected shot is already in the saved shots (by comparing content)
  const isAlreadySaved = useCallback((detected: DetectedShot, savedShots: Shot[]) => {
    return savedShots.some(saved =>
      saved.description?.toLowerCase().includes(detected.lineContent.toLowerCase().slice(0, 30)) ||
      detected.lineContent.toLowerCase().includes(saved.description?.toLowerCase() || '')
    );
  }, []);

  // Get all unsaved detected shots (not already in database)
  const getUnsavedDetectedShots = useCallback(() => {
    const allSavedShots = scenesWithShots.flatMap((s) => s.shots);
    return detectedShots.filter((detected) => {
      if (!detected.sceneId) return false;
      const sceneShots = allSavedShots.filter((s) => s.sceneId === detected.sceneId);
      return !isAlreadySaved(detected, sceneShots);
    });
  }, [detectedShots, scenesWithShots, isAlreadySaved]);

  // Add all detected shots at once
  const handleApplyAllDetected = useCallback(async () => {
    const unsavedShots = getUnsavedDetectedShots();
    if (unsavedShots.length === 0) {
      toast.info('No new shots to add');
      return;
    }

    setIsApplyingAll(true);
    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/shots/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shots: unsavedShots.map((detected) => ({
              sceneId: detected.sceneId,
              description: detected.subject || detected.lineContent,
              shotType: detected.shotType,
              status: 'planned',
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add shots');
      }

      const { shots: newShots, count } = await response.json();
      const allShots = scenesWithShots.flatMap((s) => s.shots);
      onShotsChange?.([...allShots, ...newShots]);
      toast.success(`Added ${count} shot${count !== 1 ? 's' : ''} from script`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add shots';
      toast.error(message);
    } finally {
      setIsApplyingAll(false);
    }
  }, [screenplayId, scenesWithShots, onShotsChange, getUnsavedDetectedShots]);

  const unsavedDetectedCount = showDetectedShots ? getUnsavedDetectedShots().length : 0;

  const getStatusBadge = useCallback((status: ShotStatus) => {
    const colors = SHOT_STATUS_COLORS[status] || SHOT_STATUS_COLORS.planned;
    return colors;
  }, []);

  // DnD sensors (shared configuration)
  const sensors = usePanelDndSensors();

  // Handle drag end - persist reorder via API
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Find which scene the shot belongs to
    const scene = scenesWithShots.find((s) =>
      s.shots.some((shot) => shot.id === active.id)
    );

    if (!scene) return;

    const oldIndex = scene.shots.findIndex((shot) => shot.id === active.id);
    const newIndex = scene.shots.findIndex((shot) => shot.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update the UI
    const reorderedShots = arrayMove(scene.shots, oldIndex, newIndex);
    const updatedSceneShots = reorderedShots.map((shot, index) => ({
      ...shot,
      shotNumber: index + 1,
    }));

    // Update all shots with the new order
    const allShots = scenesWithShots.flatMap((s) =>
      s.sceneId === scene.sceneId ? updatedSceneShots : s.shots
    );
    onShotsChange?.(allShots);

    // Persist to database
    try {
      const response = await fetch(
        `/api/screenplays/${screenplayId}/shots/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: scene.sceneId,
            shotIds: reorderedShots.map((s) => s.id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save order');
      }
    } catch {
      // Revert on error
      const allShots = scenesWithShots.flatMap((s) => s.shots);
      onShotsChange?.(allShots);
      toast.error('Failed to reorder shots');
    }
  }, [screenplayId, scenesWithShots, onShotsChange]);

  return (
    <PanelContainer className={className}>
      {/* Screen reader instructions for drag-and-drop */}
      <div id="shot-drag-instructions" className="sr-only">
        Press Space or Enter to start dragging. Use arrow keys to move. Press Space or Enter to drop, or Escape to cancel.
      </div>

      {/* Loading state */}
      {isLoading && scenesWithShots.length === 0 ? (
        <PanelSkeleton variant="shotlist" />
      ) : scenesWithShots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm p-3">
          <Clapperboard className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No scenes yet</p>
          <p className="text-xs mt-1">
            Add scenes to your script to plan shots.
          </p>
        </div>
      ) : (
        <>
          {/* Apply All for detected shots */}
          {showDetectedShots && unsavedDetectedCount > 0 && (
            <div className="px-3 py-2 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {unsavedDetectedCount} detected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleApplyAllDetected}
                disabled={isApplyingAll}
                className="gap-1.5 h-7 px-2 text-xs"
              >
                {isApplyingAll ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Add All
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Search and Filter */}
          {totalShots > 3 && (
            <div className="p-3 space-y-2 shrink-0">
              <PanelSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search shots..."
              />
              <div className="flex gap-1 flex-wrap">
                {(['all', 'planned', 'setup', 'shot', 'approved'] as const).map(
                  (status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className="h-7 px-2 text-[10px]"
                    >
                      {status === 'all'
                        ? 'All'
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Scene list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              {filteredScenes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No shots match your filter.
                </div>
              ) : (
                filteredScenes.map((scene) => (
                  <div
                    key={scene.sceneId}
                    ref={(el) => {
                      if (el) sceneRefs.current.set(scene.sceneId, el);
                    }}
                    className={cn(
                      'rounded-lg border transition-all duration-200',
                      currentSceneId === scene.sceneId
                        ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    {/* Scene header */}
                    <div
                      onClick={() => toggleScene(scene.sceneId)}
                      className={cn(
                        'w-full flex items-center gap-2',
                        'px-2 py-2 rounded-t-lg',
                        'text-xs cursor-pointer',
                        'hover:bg-accent/50',
                        'transition-colors'
                      )}
                    >
                      {expandedScenes.has(scene.sceneId) ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <Film className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium shrink-0">
                        {scene.sceneNumber}
                      </span>
                      <span className="break-words text-muted-foreground flex-1 text-left min-w-0">
                        {scene.sceneHeading}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {scene.shots.length}
                      </span>
                      {onAddShot && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddShot(scene.sceneId);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Shots list with Drag & Drop */}
                    {expandedScenes.has(scene.sceneId) && (
                      <div className="space-y-1 p-2">
                        {scene.shots.length === 0 && (!showDetectedShots || getDetectedShotsForScene(scene.sceneId).length === 0) ? (
                          <Button
                            variant="outline"
                            onClick={() => onAddShot?.(scene.sceneId)}
                            className={cn(
                              'w-full h-auto py-4 border-dashed',
                              'text-muted-foreground hover:text-foreground',
                              'hover:border-primary/50',
                              'flex flex-col items-center gap-1 text-xs'
                            )}
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add shot</span>
                          </Button>
                        ) : (
                          <>
                            {/* Saved shots */}
                            {scene.shots.length > 0 && (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                              >
                                <SortableContext
                                  items={scene.shots.map(s => s.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {scene.shots.map((shot) => (
                                    <SortableShotItem
                                      key={shot.id}
                                      shot={shot}
                                      displayNumber={getDisplayNumber(shot, scene.sceneNumber)}
                                      onEditShot={onEditShot}
                                      handleDuplicateShot={handleDuplicateShot}
                                      handleDeleteShot={handleDeleteShot}
                                      getStatusBadge={getStatusBadge}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            )}

                            {/* Detected shots (suggestions) */}
                            {showDetectedShots && getDetectedShotsForScene(scene.sceneId).filter(
                              detected => !isAlreadySaved(detected, scene.shots)
                            ).length > 0 && (
                              <div className="mt-2 pt-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                                  <Sparkles className="h-3 w-3 text-amber-500" />
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    Detected from script
                                  </span>
                                </div>
                                {getDetectedShotsForScene(scene.sceneId)
                                  .filter(detected => !isAlreadySaved(detected, scene.shots))
                                  .map((detected) => (
                                    <div
                                      key={detected.id}
                                      className={cn(
                                        'flex items-start gap-2 p-2 rounded-lg',
                                        'border border-dashed border-amber-500/30',
                                        'bg-amber-500/5 hover:bg-amber-500/10',
                                        'transition-colors group'
                                      )}
                                    >
                                      {/* Shot type badge */}
                                      <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <Camera className="h-2.5 w-2.5 text-amber-600" />
                                      </div>

                                      {/* Shot content */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs break-words line-clamp-2">
                                          {detected.subject || detected.lineContent}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-600"
                                          >
                                            {getShotDisplayName(detected.shotType as Parameters<typeof getShotDisplayName>[0])}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Add button */}
                                      {onAddDetectedShot && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-amber-500/20"
                                          onClick={() => onAddDetectedShot(detected)}
                                          title="Add to shotlist"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </PanelContainer>
  );
}

export const ShotlistPanel = React.memo(ShotlistPanelInner);
