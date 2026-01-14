import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical, Users } from 'lucide-react';
import { Scene } from '@/types/screenplay';
import type { IndexCard, CardStatus } from '@/types/index-cards';
import {
  normalizeTimeOfDay,
  TIME_OF_DAY_LABELS,
} from '@/lib/prosemirror/utils/time-detection';
import { TimeIcon } from './TimeIcon';

// Status configuration
export const STATUS_CONFIG: Record<string, {
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

export const STATUSES = ['draft', 'outline', 'writing', 'revision', 'complete'] as const;

interface SortableCardProps {
  scene: Scene;
  card?: IndexCard;
  characterRankings?: Map<string, number>;
  isSelected?: boolean;
  onStatusChange?: (status: CardStatus) => void;
  onClick?: () => void;
}

/**
 * Sortable index card component with drag-and-drop support.
 */
export const SortableCard = React.memo(function SortableCard({
  scene,
  card,
  characterRankings,
  isSelected,
  onStatusChange,
  onClick,
}: SortableCardProps) {
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
    if (onClick) return; // Don't cycle if in selection mode
    const currentIndex = STATUSES.indexOf(status as typeof STATUSES[number]);
    const nextIndex = (currentIndex + 1) % STATUSES.length;
    onStatusChange?.(STATUSES[nextIndex]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick || cycleStatus}
      className={cn(
        'group relative rounded-md overflow-hidden cursor-pointer',
        'bg-muted/50 border border-border/30',
        'transition-all duration-100 ease-out',
        'hover:bg-muted/70 hover:border-border/50',
        'active:scale-[0.96] active:brightness-90',
        isDragging && 'opacity-50 scale-105 shadow-xl z-50',
        isSelected && 'ring-2 ring-primary ring-offset-2'
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

        {/* Characters */}
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
});
