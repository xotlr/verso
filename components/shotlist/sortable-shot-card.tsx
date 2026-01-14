"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shot } from "@/types/shotlist";
import { ShotCard } from "./shot-card";

interface SortableShotCardProps {
  shot: Shot;
  displayNumber?: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function SortableShotCard({
  shot,
  displayNumber,
  onEdit,
  onDelete,
  onDuplicate,
}: SortableShotCardProps) {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/sortable",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full",
          "p-1 rounded text-muted-foreground/40 hover:text-muted-foreground",
          "opacity-0 group-hover/sortable:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary/20"
        )}
        aria-label="Drag to reorder shot"
        aria-describedby="shotlist-drag-instructions"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <ShotCard
        shot={shot}
        displayNumber={displayNumber}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    </div>
  );
}
