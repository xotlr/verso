'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { StackCard, StackCardData } from '@/components/stack-card';
import { useWorkspaceDndState, DraggableData } from './workspace-dnd-context';

interface DroppableStackCardProps {
  stack: StackCardData;
  href?: string;
  onEdit?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
}

export function DroppableStackCard({
  stack,
  href,
  onEdit,
  onUngroup,
  onDelete,
}: DroppableStackCardProps) {
  const { activeId, activeType } = useWorkspaceDndState();

  // Make the stack card a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-stack-${stack.id}`,
    data: {
      type: 'stack',
      id: stack.id,
      stack: stack,
    } as DraggableData,
  });

  // Check if a screenplay is being dragged over this stack
  const isDropTarget = isOver && activeId && activeType === 'screenplay';

  return (
    <div
      ref={setNodeRef}
      className="relative transition-all duration-200"
    >
      {/* Visual indicator when a screenplay is dragged over */}
      {isDropTarget && (
        <div className="absolute inset-0 z-10 rounded-xl bg-primary/10 border-2 border-dashed border-primary pointer-events-none flex items-center justify-center">
          <span className="text-sm font-medium text-primary bg-background/90 px-3 py-1 rounded-full">
            Add to stack
          </span>
        </div>
      )}
      <StackCard
        stack={stack}
        href={href}
        onEdit={onEdit}
        onUngroup={onUngroup}
        onDelete={onDelete}
      />
    </div>
  );
}
