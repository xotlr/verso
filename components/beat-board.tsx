'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Scene } from '@/types/screenplay';
import { Beat, ActId, BeatBoardProps, ACTS_CONFIG } from '@/types/beat-board';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  Film,
  ChevronLeft,
} from 'lucide-react';
import { useVisualizationColors } from '@/lib/visualization-colors';
import { ActColorScheme } from '@/types/settings';
import { BeatEditor } from '@/components/beat-board/beat-editor';

// Re-export types for backwards compatibility
export type { Beat, ActId, BeatBoardProps } from '@/types/beat-board';

// Sortable Beat Card - memoized to prevent unnecessary re-renders
const SortableBeatCard = React.memo(function SortableBeatCard({
  beat,
  scenes,
  onEdit,
  onDelete,
  onSceneClick,
}: {
  beat: Beat;
  scenes: Scene[];
  onEdit: (beat: Beat) => void;
  onDelete: (beatId: string) => void;
  onSceneClick?: (sceneId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const linkedScenes = useMemo(
    () => scenes.filter(s => beat.sceneIds.includes(s.id)),
    [scenes, beat.sceneIds]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 mb-2',
        'hover:border-primary/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: beat.color }}
            />
            <h4 className="font-medium text-sm text-foreground truncate">
              {beat.title}
            </h4>
          </div>

          {beat.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {beat.description}
            </p>
          )}

          {linkedScenes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedScenes.map(scene => (
                <button
                  key={scene.id}
                  onClick={() => onSceneClick?.(scene.id)}
                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded hover:bg-accent"
                >
                  <Film className="h-3 w-3" />
                  {scene.number}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onEdit(beat)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={() => onDelete(beat.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});

// Beat Card (for drag overlay) - memoized
const BeatCard = React.memo(function BeatCard({ beat }: { beat: Beat }) {
  return (
    <div className="bg-card border border-primary rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: beat.color }}
        />
        <h4 className="font-medium text-sm">{beat.title}</h4>
      </div>
    </div>
  );
});

// Act Column - memoized to prevent unnecessary re-renders
const ActColumn = React.memo(function ActColumn({
  act,
  actColors,
  beats,
  scenes,
  onAddBeat,
  onEditBeat,
  onDeleteBeat,
  onSceneClick,
}: {
  act: { id: ActId; label: string };
  actColors: ActColorScheme;
  beats: Beat[];
  scenes: Scene[];
  onAddBeat: (actId: ActId) => void;
  onEditBeat: (beat: Beat) => void;
  onDeleteBeat: (beatId: string) => void;
  onSceneClick?: (sceneId: string) => void;
}) {
  // Memoize filtered beats to prevent recalculation on every render
  const actBeats = useMemo(
    () => beats.filter(b => b.act === act.id).sort((a, b) => a.order - b.order),
    [beats, act.id]
  );

  return (
    <div
      className="flex-1 min-w-[280px] max-w-[350px] rounded-xl border p-4"
      style={{ backgroundColor: actColors.bg, borderColor: actColors.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{act.label}</h3>
        <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded">
          {actBeats.length} beats
        </span>
      </div>

      <SortableContext
        items={actBeats.map(b => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {actBeats.map(beat => (
            <SortableBeatCard
              key={beat.id}
              beat={beat}
              scenes={scenes}
              onEdit={onEditBeat}
              onDelete={onDeleteBeat}
              onSceneClick={onSceneClick}
            />
          ))}
        </div>
      </SortableContext>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 border-dashed border"
        onClick={() => onAddBeat(act.id)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Beat
      </Button>
    </div>
  );
});

// Main Beat Board Component
export function BeatBoard({
  scenes,
  beats: initialBeats,
  onBeatsChange,
  onSceneClick,
  onBackToEditor,
}: BeatBoardProps) {
  const vizColors = useVisualizationColors();
  const [beats, setBeats] = useState<Beat[]>(initialBeats);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [isCreating, setIsCreating] = useState<ActId | null>(null);

  // Track if beats changed from internal user action
  const isInternalChange = useRef(false);
  const prevBeatsRef = useRef<Beat[]>(initialBeats);

  // Store onBeatsChange in a ref to avoid it triggering re-renders
  const onBeatsChangeRef = useRef(onBeatsChange);
  onBeatsChangeRef.current = onBeatsChange;

  // Sync external prop changes to internal state (when parent updates beats)
  useEffect(() => {
    // Only sync if the prop changed externally (not from our own onBeatsChange call)
    if (!isInternalChange.current) {
      setBeats(initialBeats);
    }
    isInternalChange.current = false;
  }, [initialBeats]);

  // Wrapper to track internal beats changes
  const updateBeats = useCallback((updater: (prev: Beat[]) => Beat[]) => {
    setBeats(prev => {
      const newBeats = updater(prev);
      // Only notify parent if beats actually changed
      if (JSON.stringify(newBeats) !== JSON.stringify(prevBeatsRef.current)) {
        isInternalChange.current = true;
        prevBeatsRef.current = newBeats;
        // Use setTimeout to defer the callback, avoiding state update during render
        setTimeout(() => {
          onBeatsChangeRef.current(newBeats);
        }, 0);
      }
      return newBeats;
    });
  }, []);

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

  const activeBeat = useMemo(
    () => beats.find(b => b.id === activeId),
    [beats, activeId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeBeat = beats.find(b => b.id === activeId);
    const overBeat = beats.find(b => b.id === overId);

    if (!activeBeat) return;

    // If dragging over another beat in a different act
    if (overBeat && activeBeat.act !== overBeat.act) {
      updateBeats(prev => {
        const updated = prev.map(b =>
          b.id === activeId ? { ...b, act: overBeat.act } : b
        );
        return updated;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    updateBeats(prev => {
      const oldIndex = prev.findIndex(b => b.id === activeId);
      const newIndex = prev.findIndex(b => b.id === overId);

      const newBeats = arrayMove(prev, oldIndex, newIndex);

      // Update order values
      return newBeats.map((b, i) => ({ ...b, order: i }));
    });
  };

  const handleAddBeat = (actId: ActId) => {
    setIsCreating(actId);
    setEditingBeat({
      id: '',
      title: '',
      description: '',
      color: vizColors.beatColors[beats.length % vizColors.beatColors.length],
      act: actId,
      sceneIds: [],
      order: beats.filter(b => b.act === actId).length,
    });
  };

  const handleSaveBeat = useCallback((beat: Beat) => {
    updateBeats(prev => {
      const existingIndex = prev.findIndex(b => b.id === beat.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = beat;
        return updated;
      }
      return [...prev, { ...beat, id: `beat-${Date.now()}` }];
    });
    setEditingBeat(null);
    setIsCreating(null);
  }, [updateBeats]);

  const handleDeleteBeat = useCallback((beatId: string) => {
    updateBeats(prev => prev.filter(b => b.id !== beatId));
  }, [updateBeats]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBackToEditor && (
              <Button variant="ghost" size="sm" onClick={onBackToEditor}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">Beat Board</h1>
              <p className="text-sm text-muted-foreground">
                Organize your story structure visually
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {beats.length} beats · {scenes.length} scenes
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {ACTS_CONFIG.map(act => (
              <ActColumn
                key={act.id}
                act={act}
                actColors={vizColors.actColors[act.id]}
                beats={beats}
                scenes={scenes}
                onAddBeat={handleAddBeat}
                onEditBeat={setEditingBeat}
                onDeleteBeat={handleDeleteBeat}
                onSceneClick={onSceneClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeBeat ? <BeatCard beat={activeBeat} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Beat Editor Modal */}
      <BeatEditor
        beat={editingBeat}
        scenes={scenes}
        isOpen={!!(editingBeat || isCreating)}
        onSave={handleSaveBeat}
        onCancel={() => {
          setEditingBeat(null);
          setIsCreating(null);
        }}
        beatColors={vizColors.beatColors}
      />
    </div>
  );
}

export default BeatBoard;
