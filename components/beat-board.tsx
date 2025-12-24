'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Scene } from '@/types/screenplay';
import { BeatBoardProps, ActConfig } from '@/types/beat-board';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, X, Check, Pencil } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Re-export types for backwards compatibility
export type { ActId, BeatBoardProps, SceneMeta, Beat, ActConfig } from '@/types/beat-board';

// Scene card in sortable context
const SortableSceneCard = React.memo(function SortableSceneCard({
  scene,
  onSceneClick,
}: {
  scene: Scene;
  onSceneClick?: (sceneId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Extract location from heading (remove INT./EXT. and time of day)
  const location = useMemo(() => {
    const heading = scene.heading || '';
    return heading
      .replace(/^(?:INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s*/i, '')
      .replace(/\s+-\s+\w+$/i, '')
      .trim() || 'Unknown Location';
  }, [scene.heading]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-background border border-border/50 rounded-lg p-3 cursor-grab active:cursor-grabbing',
        'hover:border-border hover:shadow-sm',
        'transition-all duration-200',
        isDragging && 'opacity-50 shadow-md ring-2 ring-primary/20'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          onClick={() => onSceneClick?.(scene.id)}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Scene {scene.number}
            </span>
            {scene.timeOfDay && (
              <span className="text-[9px] text-muted-foreground/70 uppercase">
                {scene.timeOfDay}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate">
            {location}
          </p>
        </button>
      </div>
    </div>
  );
});

// Drag overlay card (shown while dragging)
const SceneCardOverlay = React.memo(function SceneCardOverlay({ scene }: { scene: Scene }) {
  const location = useMemo(() => {
    const heading = scene.heading || '';
    return heading
      .replace(/^(?:INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s*/i, '')
      .replace(/\s+-\s+\w+$/i, '')
      .trim() || 'Unknown Location';
  }, [scene.heading]);

  return (
    <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
          Scene {scene.number}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground truncate mt-0.5">
        {location}
      </p>
    </div>
  );
});

// Editable act header
const EditableActHeader = React.memo(function EditableActHeader({
  act,
  sceneCount,
  onRename,
  onDelete,
  canDelete,
}: {
  act: ActConfig;
  sceneCount: number;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(act.label);

  const handleSave = () => {
    if (editValue.trim()) {
      onRename(act.id, editValue.trim());
    } else {
      setEditValue(act.label);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(act.label);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="h-7 text-sm font-semibold"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={handleSave}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="group/edit flex items-center gap-1.5 text-left"
          >
            <h3 className="text-sm font-semibold text-foreground">{act.label}</h3>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium">
          {sceneCount}
        </span>
        {canDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(act.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
});

// Act column component with droppable
const ActColumn = React.memo(function ActColumn({
  act,
  scenes,
  onSceneClick,
  onRename,
  onDelete,
  canDelete,
  isUnassigned = false,
}: {
  act: ActConfig;
  scenes: Scene[];
  onSceneClick?: (sceneId: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  isUnassigned?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: act.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[240px] max-w-[300px] rounded-lg border p-4 transition-colors',
        'bg-card border-border/60',
        isOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {isUnassigned ? (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground">{act.label}</h3>
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium">
            {scenes.length}
          </span>
        </div>
      ) : (
        <EditableActHeader
          act={act}
          sceneCount={scenes.length}
          onRename={onRename}
          onDelete={onDelete}
          canDelete={canDelete}
        />
      )}

      <SortableContext
        items={scenes.map(s => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[120px]">
          {scenes.length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground/50 border border-dashed border-border/50 rounded-lg">
              Drag scenes here
            </div>
          ) : (
            scenes.map(scene => (
              <SortableSceneCard
                key={scene.id}
                scene={scene}
                onSceneClick={onSceneClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
});

// Add act button
const AddActButton = React.memo(function AddActButton({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className={cn(
        'min-w-[200px] rounded-lg border-2 border-dashed p-4 transition-colors',
        'border-border/40 hover:border-border hover:bg-card/50',
        'flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground'
      )}
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm font-medium">Add Act</span>
    </button>
  );
});

// Main Beat Board Component
export function BeatBoard({
  scenes,
  sceneMetas,
  acts,
  onActChange,
  onActsChange,
  onSceneClick,
}: BeatBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // Group scenes by act
  const scenesByAct = useMemo(() => {
    const grouped: Record<string, Scene[]> = { unassigned: [] };

    // Initialize groups for all acts
    acts.forEach(act => {
      grouped[act.id] = [];
    });

    scenes.forEach(scene => {
      const meta = sceneMetas[scene.id];
      const actId = meta?.act || 'unassigned';
      // If act doesn't exist anymore, put in unassigned
      if (!grouped[actId]) {
        grouped.unassigned.push(scene);
      } else {
        grouped[actId].push(scene);
      }
    });

    // Sort scenes by scene number within each act
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.number - b.number);
    });

    return grouped;
  }, [scenes, sceneMetas, acts]);

  const activeScene = useMemo(
    () => scenes.find(s => s.id === activeId),
    [scenes, activeId]
  );

  // Find which act a scene belongs to
  const findSceneAct = useCallback((sceneId: string): string => {
    const meta = sceneMetas[sceneId];
    return meta?.act || 'unassigned';
  }, [sceneMetas]);

  // All valid act IDs (including unassigned)
  const actIds = useMemo(() => ['unassigned', ...acts.map(a => a.id)], [acts]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeSceneId = active.id as string;
    const overId = over.id as string;
    const currentAct = findSceneAct(activeSceneId);

    // Check if dropped on an act column (droppable)
    if (actIds.includes(overId)) {
      const targetAct = overId === 'unassigned' ? null : overId;
      if (overId !== currentAct) {
        onActChange(activeSceneId, targetAct);
      }
      return;
    }

    // Dropped on another scene - get that scene's act
    const targetSceneAct = findSceneAct(overId);
    if (targetSceneAct !== currentAct) {
      onActChange(activeSceneId, targetSceneAct === 'unassigned' ? null : targetSceneAct);
    }
  };

  const handleAddAct = useCallback(() => {
    const newActId = `act-${Date.now()}`;
    const newAct: ActConfig = {
      id: newActId,
      label: `Act ${acts.length + 1}`,
    };
    onActsChange([...acts, newAct]);
  }, [acts, onActsChange]);

  const handleRenameAct = useCallback((actId: string, newLabel: string) => {
    onActsChange(acts.map(a => a.id === actId ? { ...a, label: newLabel } : a));
  }, [acts, onActsChange]);

  const handleDeleteAct = useCallback((actId: string) => {
    // Move scenes from deleted act to unassigned
    const scenesInAct = scenesByAct[actId] || [];
    scenesInAct.forEach(scene => {
      onActChange(scene.id, null);
    });
    // Remove the act
    onActsChange(acts.filter(a => a.id !== actId));
  }, [acts, scenesByAct, onActChange, onActsChange]);

  return (
    <ScrollArea className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4 min-w-max">
          {/* Unassigned column */}
          <ActColumn
            act={{ id: 'unassigned', label: 'Unassigned' }}
            scenes={scenesByAct.unassigned || []}
            onSceneClick={onSceneClick}
            onRename={() => {}}
            onDelete={() => {}}
            canDelete={false}
            isUnassigned
          />

          {/* Act columns */}
          {acts.map(act => (
            <ActColumn
              key={act.id}
              act={act}
              scenes={scenesByAct[act.id] || []}
              onSceneClick={onSceneClick}
              onRename={handleRenameAct}
              onDelete={handleDeleteAct}
              canDelete={acts.length > 1}
            />
          ))}

          {/* Add act button */}
          <AddActButton onAdd={handleAddAct} />
        </div>

        <DragOverlay>
          {activeScene ? <SceneCardOverlay scene={activeScene} /> : null}
        </DragOverlay>
      </DndContext>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
