'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Shot,
  SceneWithShots,
  SHOT_TYPE_LABELS,
  SHOT_STATUS_COLORS,
  ShotType,
  ShotStatus,
} from '@/types/shotlist';

interface ShotlistPanelProps {
  screenplayId: string;
  scenesWithShots: SceneWithShots[];
  onShotsChange?: (shots: Shot[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
  className?: string;
}

/**
 * Shotlist panel showing shots grouped by scene.
 * Compact sidebar version of the full shotlist view.
 */
export function ShotlistPanel({
  screenplayId,
  scenesWithShots,
  onShotsChange,
  onSceneClick: _onSceneClick,
  onEditShot,
  onAddShot,
  className,
}: ShotlistPanelProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
    new Set(scenesWithShots.slice(0, 3).map((s) => s.sceneId))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShotStatus | 'all'>('all');

  // Expand first scene when data loads
  useEffect(() => {
    if (scenesWithShots.length > 0 && expandedScenes.size === 0) {
      setExpandedScenes(new Set([scenesWithShots[0].sceneId]));
    }
  }, [scenesWithShots, expandedScenes.size]);

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

  const getStatusBadge = (status: ShotStatus) => {
    const colors = SHOT_STATUS_COLORS[status] || SHOT_STATUS_COLORS.planned;
    return colors;
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Clapperboard className="h-4 w-4 text-primary" />
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
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'planned', 'setup', 'shot', 'approved'] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                        statusFilter === status
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {status === 'all'
                        ? 'All'
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
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
                  <div key={scene.sceneId} className="rounded-lg border">
                    {/* Scene header */}
                    <button
                      onClick={() => toggleScene(scene.sceneId)}
                      className={cn(
                        'w-full flex items-center gap-2',
                        'px-2 py-2 rounded-t-lg',
                        'text-xs',
                        'hover:bg-accent/50',
                        'transition-colors'
                      )}
                    >
                      {expandedScenes.has(scene.sceneId) ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <Film className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium shrink-0">
                        {scene.sceneNumber}
                      </span>
                      <span className="truncate text-muted-foreground flex-1 text-left">
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
                    </button>

                    {/* Shots list */}
                    {expandedScenes.has(scene.sceneId) && (
                      <div className="border-t space-y-1 p-2">
                        {scene.shots.length === 0 ? (
                          <button
                            onClick={() => onAddShot?.(scene.sceneId)}
                            className={cn(
                              'w-full py-4 border border-dashed rounded-lg',
                              'text-muted-foreground hover:text-foreground',
                              'hover:border-primary/50 transition-colors',
                              'flex flex-col items-center gap-1 text-xs'
                            )}
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add shot</span>
                          </button>
                        ) : (
                          scene.shots.map((shot) => (
                            <div
                              key={shot.id}
                              className={cn(
                                'flex items-start gap-2 p-2 rounded-lg',
                                'hover:bg-accent/30 transition-colors',
                                'group'
                              )}
                            >
                              {/* Shot number */}
                              <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-medium">
                                  {shot.shotNumber}
                                </span>
                              </div>

                              {/* Shot content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs line-clamp-2">
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
                          ))
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
