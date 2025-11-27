'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Scene } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Edit2,
  Film,
  Users,
  Clock,
  MapPin,
} from 'lucide-react';

// Card status colors
const STATUS_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600', label: 'Draft' },
  outline: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-300 dark:border-blue-700', label: 'Outline' },
  writing: { bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-300 dark:border-yellow-700', label: 'Writing' },
  revision: { bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-300 dark:border-orange-700', label: 'Revision' },
  complete: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-300 dark:border-green-700', label: 'Complete' },
};

export interface IndexCard {
  sceneId: string;
  color: string;
  status: keyof typeof STATUS_COLORS;
  summary: string;
  notes?: string;
}

export interface IndexCardsProps {
  scenes: Scene[];
  cards: IndexCard[];
  onCardsChange: (cards: IndexCard[]) => void;
  onScenesReorder: (scenes: Scene[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onSceneEdit?: (scene: Scene) => void;
}

// Sortable Card Component
function SortableCard({
  scene,
  card,
  onEdit,
  onClick,
  onStatusChange,
}: {
  scene: Scene;
  card?: IndexCard;
  onEdit?: () => void;
  onClick?: () => void;
  onStatusChange?: (status: keyof typeof STATUS_COLORS) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status = card?.status || 'draft';
  const statusStyle = STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative w-[220px] h-[140px] rounded-lg border-2 overflow-hidden',
        'transition-all duration-200',
        statusStyle.bg,
        statusStyle.border,
        isDragging && 'opacity-50 scale-105 shadow-xl z-50'
      )}
    >
      {/* Color stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{ backgroundColor: card?.color || '#888888' }}
      />

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 left-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Scene number badge */}
      <div className="absolute top-3 right-2 flex items-center gap-1 text-xs font-mono bg-background/80 px-1.5 py-0.5 rounded">
        <Film className="h-3 w-3" />
        {scene.number}
      </div>

      {/* Content */}
      <button
        onClick={onClick}
        className="w-full h-full pt-6 px-3 pb-2 text-left"
      >
        <div className="space-y-1.5">
          {/* Heading */}
          <h4 className="font-medium text-xs text-foreground line-clamp-2 leading-tight">
            {scene.heading}
          </h4>

          {/* Summary */}
          {(card?.summary || scene.synopsis) && (
            <p className="text-[10px] text-muted-foreground line-clamp-2">
              {card?.summary || scene.synopsis}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {scene.location?.type}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {scene.timeOfDay}
            </span>
            {scene.characters.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />
                {scene.characters.length}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Status badge (clickable) */}
      <div className="absolute bottom-2 left-2">
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded border',
            statusStyle.border,
            'hover:bg-background/50'
          )}
        >
          {statusStyle.label}
        </button>

        {/* Status dropdown */}
        {showStatusMenu && (
          <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-md shadow-lg p-1 z-50">
            {Object.entries(STATUS_COLORS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  onStatusChange?.(key as keyof typeof STATUS_COLORS);
                  setShowStatusMenu(false);
                }}
                className={cn(
                  'w-full text-left px-2 py-1 text-xs rounded',
                  status === key ? 'bg-accent' : 'hover:bg-accent'
                )}
              >
                {value.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
      >
        <Edit2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// Card display (for drag overlay)
function CardDisplay({ scene, card }: { scene: Scene; card?: IndexCard }) {
  const status = card?.status || 'draft';
  const statusStyle = STATUS_COLORS[status];

  return (
    <div
      className={cn(
        'w-[220px] h-[140px] rounded-lg border-2 overflow-hidden shadow-2xl',
        statusStyle.bg,
        statusStyle.border
      )}
    >
      <div
        className="h-2"
        style={{ backgroundColor: card?.color || '#888888' }}
      />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Film className="h-3 w-3" />
          <span className="font-mono text-xs">Scene {scene.number}</span>
        </div>
        <h4 className="font-medium text-xs line-clamp-2">{scene.heading}</h4>
      </div>
    </div>
  );
}

// Main Index Cards Component
export function IndexCards({
  scenes,
  cards,
  onCardsChange,
  onScenesReorder,
  onSceneClick,
  onSceneEdit,
}: IndexCardsProps) {
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

  const activeScene = scenes.find(s => s.id === activeId);
  const activeCard = cards.find(c => c.sceneId === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = scenes.findIndex(s => s.id === active.id);
    const newIndex = scenes.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newScenes = arrayMove(scenes, oldIndex, newIndex).map((s, i) => ({
        ...s,
        number: i + 1,
      }));
      onScenesReorder(newScenes);
    }
  };

  const handleStatusChange = (sceneId: string, status: keyof typeof STATUS_COLORS) => {
    const existingCard = cards.find(c => c.sceneId === sceneId);
    if (existingCard) {
      onCardsChange(
        cards.map(c => (c.sceneId === sceneId ? { ...c, status } : c))
      );
    } else {
      onCardsChange([
        ...cards,
        {
          sceneId,
          color: '#888888',
          status,
          summary: '',
        },
      ]);
    }
  };

  const getCard = (sceneId: string) => cards.find(c => c.sceneId === sceneId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Index Cards</h2>
            <p className="text-sm text-muted-foreground">
              Drag to reorder scenes. Click status to change.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {Object.entries(STATUS_COLORS).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', value.bg, 'border', value.border)} />
                  <span>{value.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map(s => s.id)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-4">
              {scenes.map(scene => (
                <SortableCard
                  key={scene.id}
                  scene={scene}
                  card={getCard(scene.id)}
                  onEdit={() => onSceneEdit?.(scene)}
                  onClick={() => onSceneClick?.(scene.id)}
                  onStatusChange={(status) => handleStatusChange(scene.id, status)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeScene ? (
              <CardDisplay scene={activeScene} card={activeCard} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {scenes.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scenes yet</p>
              <p className="text-sm">Write some scenes in the editor to see them here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IndexCards;
