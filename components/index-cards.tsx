'use client';

import React, { useState, useMemo } from 'react';
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
  Film,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  CloudSun,
  Clock,
  Filter,
  Users,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  normalizeTimeOfDay,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ORDER,
  type TimeOfDay,
} from '@/lib/prosemirror/utils/time-detection';

// Status configuration - background tint makes status instantly visible
const STATUS_CONFIG: Record<string, {
  bg: string;
  bgHover: string;
  accent: string;
  label: string;
}> = {
  draft: {
    bg: 'bg-zinc-500/5 dark:bg-zinc-400/5',
    bgHover: 'hover:bg-zinc-500/12 dark:hover:bg-zinc-400/12',
    accent: 'bg-zinc-500',
    label: 'Draft',
  },
  outline: {
    bg: 'bg-blue-500/8 dark:bg-blue-400/8',
    bgHover: 'hover:bg-blue-500/15 dark:hover:bg-blue-400/15',
    accent: 'bg-blue-500',
    label: 'Outline',
  },
  writing: {
    bg: 'bg-amber-500/8 dark:bg-amber-400/8',
    bgHover: 'hover:bg-amber-500/15 dark:hover:bg-amber-400/15',
    accent: 'bg-amber-500',
    label: 'Writing',
  },
  revision: {
    bg: 'bg-orange-500/8 dark:bg-orange-400/8',
    bgHover: 'hover:bg-orange-500/15 dark:hover:bg-orange-400/15',
    accent: 'bg-orange-500',
    label: 'Revision',
  },
  complete: {
    bg: 'bg-emerald-500/8 dark:bg-emerald-400/8',
    bgHover: 'hover:bg-emerald-500/15 dark:hover:bg-emerald-400/15',
    accent: 'bg-emerald-500',
    label: 'Done',
  },
};

const STATUSES = ['draft', 'outline', 'writing', 'revision', 'complete'] as const;

export interface IndexCard {
  sceneId: string;
  color: string;
  status: keyof typeof STATUS_CONFIG;
  summary: string;
  notes?: string;
}

export interface IndexCardsProps {
  scenes: Scene[];
  cards: IndexCard[];
  characterRankings?: Map<string, number>;
  onCardsChange: (cards: IndexCard[]) => void;
  onScenesReorder: (scenes: Scene[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onSceneEdit?: (scene: Scene) => void;
}

// Time of day icon with better coverage
function TimeIcon({ time, className }: { time?: string; className?: string }) {
  const normalized = normalizeTimeOfDay(time);
  const iconClass = cn('h-3 w-3', className);

  switch (normalized) {
    case 'NIGHT':
      return <Moon className={iconClass} />;
    case 'DAWN':
      return <Sunrise className={iconClass} />;
    case 'MORNING':
      return <CloudSun className={iconClass} />;
    case 'AFTERNOON':
      return <Sun className={iconClass} />;
    case 'DUSK':
    case 'EVENING':
      return <Sunset className={iconClass} />;
    case 'CONTINUOUS':
      return <Clock className={iconClass} />;
    default:
      return <Sun className={iconClass} />;
  }
}

// Sortable Card Component
function SortableCard({
  scene,
  card,
  characterRankings,
  onStatusChange,
}: {
  scene: Scene;
  card?: IndexCard;
  characterRankings?: Map<string, number>;
  onStatusChange?: (status: keyof typeof STATUS_CONFIG) => void;
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

  const status = card?.status || 'draft';
  const statusStyle = STATUS_CONFIG[status];
  const normalizedTime = normalizeTimeOfDay(scene.timeOfDay);

  // Cycle through statuses on click
  const cycleStatus = () => {
    const currentIndex = STATUSES.indexOf(status as typeof STATUSES[number]);
    const nextIndex = (currentIndex + 1) % STATUSES.length;
    onStatusChange?.(STATUSES[nextIndex]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={cycleStatus}
      className={cn(
        'group relative rounded-md overflow-hidden cursor-pointer',
        'bg-muted/50 border border-border/30',
        'transition-all duration-100 ease-out',
        'hover:bg-muted/70 hover:border-border/50',
        'active:scale-[0.96] active:brightness-90',
        isDragging && 'opacity-50 scale-105 shadow-xl z-50'
      )}
    >
      {/* Status accent bar */}
      <div className={cn('h-0.5', statusStyle.accent)} />

      {/* Card content */}
      <div className="p-2">
        {/* Header row */}
        <div className="flex items-center gap-1 mb-1">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors"
          >
            <GripVertical className="h-2.5 w-2.5" />
          </button>

          {/* Scene number */}
          <span className="text-[9px] font-bold text-muted-foreground/70 tabular-nums">
            {scene.number}
          </span>

          {/* Time of day */}
          <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground/60 ml-auto">
            <TimeIcon time={scene.timeOfDay} className="h-2.5 w-2.5" />
            <span className="uppercase tracking-wide">
              {TIME_OF_DAY_LABELS[normalizedTime]}
            </span>
          </div>
        </div>

        {/* Scene heading */}
        <h4 className="text-[10px] font-medium text-foreground line-clamp-2 leading-snug">
          {scene.heading}
        </h4>

        {/* Characters - sorted by popularity (most dialogue first) */}
        {scene.characters.length > 0 && (() => {
          const sorted = [...scene.characters].sort((a, b) => {
            const rankA = characterRankings?.get(a) ?? Infinity;
            const rankB = characterRankings?.get(b) ?? Infinity;
            return rankA - rankB;
          });
          return (
            <div className="flex items-center gap-1 mt-1 text-[8px] text-muted-foreground/60">
              <Users className="h-2 w-2 shrink-0" />
              <span className="truncate">
                {sorted.slice(0, 3).join(', ')}
                {sorted.length > 3 && ` +${sorted.length - 3}`}
              </span>
            </div>
          );
        })()}

        {/* Status indicator */}
        <div className="flex items-center gap-1 mt-1 text-[7px] font-medium uppercase tracking-wide text-muted-foreground/60">
          <div className={cn('w-1 h-1 rounded-full', statusStyle.accent)} />
          {statusStyle.label}
        </div>
      </div>
    </div>
  );
}

// Card display (for drag overlay)
function CardDisplay({ scene, card }: { scene: Scene; card?: IndexCard }) {
  const status = card?.status || 'draft';
  const statusStyle = STATUS_CONFIG[status];

  return (
    <div
      className="rounded-md overflow-hidden shadow-2xl bg-muted border border-border"
      style={{ width: 140 }}
    >
      <div className={cn('h-0.5', statusStyle.accent)} />
      <div className="p-2">
        <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground mb-1">
          <Film className="h-2.5 w-2.5" />
          <span>{scene.number}</span>
        </div>
        <h4 className="text-[10px] font-medium line-clamp-2">{scene.heading}</h4>
      </div>
    </div>
  );
}

// Main Index Cards Component
export function IndexCards({
  scenes,
  cards,
  characterRankings,
  onCardsChange,
  onScenesReorder,
}: IndexCardsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeOfDay | 'ALL'>('ALL');

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

  const getCard = (sceneId: string) => cards.find(c => c.sceneId === sceneId);

  // Get available times from scenes
  const availableTimes = useMemo(() => {
    const times = new Set<TimeOfDay>();
    scenes.forEach(scene => {
      times.add(normalizeTimeOfDay(scene.timeOfDay));
    });
    return Array.from(times).sort((a, b) => TIME_OF_DAY_ORDER[a] - TIME_OF_DAY_ORDER[b]);
  }, [scenes]);

  // Filter scenes by time
  const filteredScenes = useMemo(() => {
    if (timeFilter === 'ALL') return scenes;
    return scenes.filter(s => normalizeTimeOfDay(s.timeOfDay) === timeFilter);
  }, [scenes, timeFilter]);

  // Count scenes by time
  const timeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: scenes.length };
    scenes.forEach(scene => {
      const time = normalizeTimeOfDay(scene.timeOfDay);
      counts[time] = (counts[time] || 0) + 1;
    });
    return counts;
  }, [scenes]);

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

  const handleStatusChange = (sceneId: string, status: keyof typeof STATUS_CONFIG) => {
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

  // Count scenes by status
  const statusCounts = STATUSES.reduce((acc, status) => {
    acc[status] = scenes.filter(s => (getCard(s.id)?.status || 'draft') === status).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Time filter chips */}
          {availableTimes.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground/50 mr-1" />
              <button
                onClick={() => setTimeFilter('ALL')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all',
                  timeFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                All
                <span className="opacity-60">({timeCounts.ALL})</span>
              </button>
              {availableTimes.map(time => (
                <button
                  key={time}
                  onClick={() => setTimeFilter(time)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all',
                    timeFilter === time
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <TimeIcon time={time} className="h-2.5 w-2.5" />
                  {TIME_OF_DAY_LABELS[time]}
                  <span className="opacity-60">({timeCounts[time] || 0})</span>
                </button>
              ))}
            </div>
          )}

          {/* Status progress bar */}
          <div className="flex items-center gap-0.5 h-1.5 bg-muted/30 rounded-full overflow-hidden">
            {STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const count = statusCounts[status];
              const percentage = scenes.length > 0 ? (count / scenes.length) * 100 : 0;

              if (count === 0) return null;

              return (
                <div
                  key={status}
                  className={cn('h-full transition-all duration-500', config.accent)}
                  style={{ width: `${percentage}%` }}
                  title={`${config.label}: ${count}`}
                />
              );
            })}
          </div>

          {/* Status legend - compact */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground/70">
            {STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const count = statusCounts[status];
              if (count === 0) return null;
              return (
                <div key={status} className="flex items-center gap-1">
                  <div className={cn('w-1.5 h-1.5 rounded-full', config.accent)} />
                  <span>{config.label}</span>
                  <span className="opacity-60">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Cards grid - tight bento style */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredScenes.map(s => s.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-px">
                {filteredScenes.map(scene => (
                  <SortableCard
                    key={scene.id}
                    scene={scene}
                    card={getCard(scene.id)}
                    characterRankings={characterRankings}
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

          {filteredScenes.length === 0 && scenes.length > 0 && (
            <div className="flex items-center justify-center h-32 bg-muted/20 rounded-xl">
              <p className="text-sm text-muted-foreground">
                No {TIME_OF_DAY_LABELS[timeFilter as TimeOfDay]} scenes
              </p>
            </div>
          )}

          {scenes.length === 0 && (
            <div className="flex items-center justify-center h-48 bg-muted/20 rounded-xl">
              <div className="text-center p-6">
                <Film className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium text-foreground text-sm">No scenes yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Write scenes in the editor to see them here
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
