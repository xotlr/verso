'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Camera,
  GripVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Shot,
  SHOT_TYPE_LABELS,
  ShotType,
  ShotStatus,
} from '@/types/shotlist';

export interface SortableShotItemProps {
  shot: Shot;
  displayNumber: string;
  onEditShot?: (shot: Shot) => void;
  handleDuplicateShot: (shot: Shot) => void;
  handleDeleteShot: (shotId: string) => void;
  getStatusBadge: (status: ShotStatus) => string;
}

/**
 * Sortable shot item for the shotlist panel.
 * Supports drag-and-drop reordering within a scene.
 */
export const SortableShotItem = React.memo(function SortableShotItem({
  shot,
  displayNumber,
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
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 pt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Reorder shot ${displayNumber}`}
        aria-describedby="shot-drag-instructions"
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {/* Shot number */}
      <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
        <span className="text-[10px] font-medium">
          {displayNumber}
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
              className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
              aria-label={`More options for shot ${displayNumber}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
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
});
