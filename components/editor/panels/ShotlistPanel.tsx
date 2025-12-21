'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clapperboard,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Camera,
  Film,
  GripVertical,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Shot,
  SceneWithShots,
  DetectedShot,
  SHOT_TYPE_LABELS,
  SHOT_STATUS_COLORS,
  ShotType,
  ShotStatus,
} from '@/types/shotlist';
import { getShotDisplayName } from '@/lib/screenplay-patterns';

interface ShotlistPanelProps {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  detectedShots?: DetectedShot[];
  currentSceneId?: string | null;
  onShotsChange?: (shots: Shot[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
  onAddDetectedShot?: (shot: DetectedShot) => void;
  className?: string;
}

// Sortable shot item component
interface SortableShotItemProps {
  shot: Shot;
  onEditShot?: (shot: Shot) => void;
  handleDuplicateShot: (shot: Shot) => void;
  handleDeleteShot: (shotId: string) => void;
  getStatusBadge: (status: ShotStatus) => string;
}

function SortableShotItem({
  shot,
  onEditShot,
  handleDuplicateShot,
  handleDeleteShot,
  getStatusBadge,
}: SortableShotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg',
        'hover:bg-accent/30 transition-colors',
        'group',
        isDragging && 'bg-accent shadow-lg'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 pt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Shot number */}
      <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
        <span className="text-[10px] font-medium">
          {shot.shotNumber}
        </span>
      </div>

      {/* Shot content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs break-words">
          {shot.description || 'No description'}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge
            variant="secondary"
            className={cn(
              'text-[9px] px-1 py-0',
              getStatusBadge(shot.status as ShotStatus)
            )}
          >
            {shot.status}
          </Badge>
          {shot.shotType && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Camera className="h-2.5 w-2.5" />
              {SHOT_TYPE_LABELS[shot.shotType as ShotType]?.split(' ')[0] || shot.shotType}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={() => onEditShot?.(shot)}
            >
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDuplicateShot(shot)}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDeleteShot(shot.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Shotlist panel showing shots grouped by scene.
 * Compact sidebar version of the full shotlist view.
 */
export function ShotlistPanel({
  screenplayId,
  scenesWithShots,
  detectedShots = [],
  currentSceneId,
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
  const sceneRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const handleDeleteShot = useCallback(
    async (shotId: string) => {
      if (!confirm('Delete this shot?')) return;

      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots/${shotId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) throw new Error('Failed to delete shot');

        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange?.(allShots.filter((s) => s.id !== shotId));
      } catch (error) {
        console.error('Error deleting shot:', error);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

  const handleDuplicateShot = useCallback(
    async (shot: Shot) => {
      try {
        const response = await fetch(
          `/api/screenplays/${screenplayId}/shots`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneId: shot.sceneId,
              description: shot.description,
              shotType: shot.shotType,
              cameraAngle: shot.cameraAngle,
              movement: shot.movement,
              duration: shot.duration,
              lens: shot.lens,
              equipment: shot.equipment,
              lighting: shot.lighting,
              audio: shot.audio,
              notes: shot.notes,
              status: 'planned',
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to duplicate shot');

        const newShot = await response.json();
        const allShots = scenesWithShots.flatMap((s) => s.shots);
        onShotsChange?.([...allShots, newShot]);
      } catch (error) {
        console.error('Error duplicating shot:', error);
      }
    },
    [screenplayId, scenesWithShots, onShotsChange]
  );

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

  const getStatusBadge = useCallback((status: ShotStatus) => {
    const colors = SHOT_STATUS_COLORS[status] || SHOT_STATUS_COLORS.planned;
    return colors;
  }, []);

  // Sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - log reorder for now
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Find which scene contains these shots
      const allShots = scenesWithShots.flatMap(s => s.shots);
      const oldIndex = allShots.findIndex(s => s.id === active.id);
      const newIndex = allShots.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // TODO: Implement actual shot reordering persistence via API
        console.log('Shot reorder requested:', { from: oldIndex, to: newIndex });
      }
    }
  }, [scenesWithShots]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <h2 className="font-semibold text-sm">Shotlist</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {totalShots}
        </span>
      </div>

      {/* Content */}
      {scenesWithShots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm p-3">
          <Clapperboard className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No scenes yet</p>
          <p className="text-xs mt-1">
            Add scenes to your script to plan shots.
          </p>
        </div>
      ) : (
        <>
          {/* Search and Filter */}
          {totalShots > 3 && (
            <div className="p-3 space-y-2 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search shots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'planned', 'setup', 'shot', 'approved'] as const).map(
                  (status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'h-auto px-2 py-0.5 rounded-full text-[10px] font-medium',
                        statusFilter !== status && 'text-muted-foreground hover:text-foreground'
                      )}
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
          <ScrollArea className="flex-1">
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
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddShot(scene.sceneId);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Shots list with Drag & Drop */}
                    {expandedScenes.has(scene.sceneId) && (
                      <div className="border-t space-y-1 p-2">
                        {scene.shots.length === 0 && getDetectedShotsForScene(scene.sceneId).length === 0 ? (
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
                            {getDetectedShotsForScene(scene.sceneId).filter(
                              detected => !isAlreadySaved(detected, scene.shots)
                            ).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-dashed border-border/50">
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
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-amber-500/20"
                                          onClick={() => onAddDetectedShot(detected)}
                                          title="Add to shotlist"
                                        >
                                          <Plus className="h-3 w-3" />
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
    </div>
  );
}
