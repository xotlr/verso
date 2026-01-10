'use client';

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ScreenplayListCard, ScreenplayListCardData } from '@/components/screenplay/screenplay-list-card';
import { useWorkspaceDndState, DraggableData, DraggableScreenplayData } from './workspace-dnd-context';

interface DraggableScreenplayCardProps {
  fullScreenplay: DraggableScreenplayData;
  screenplay: ScreenplayListCardData;
  href?: string;
  showFavorite?: boolean;
  showGenre?: boolean;
  showProject?: boolean;
  showTeam?: boolean;
  showWordCount?: boolean;
  onEdit?: () => void;
  onRename?: () => void;
  onExport?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onMoveToProject?: () => void;
  onRemoveFromProject?: () => void;
  onCreateProject?: () => void;
  onAddToStack?: () => void;
  onMoveToTeam?: () => void;
  onRemoveFromTeam?: () => void;
  onArchive?: () => void;
}

export function DraggableScreenplayCard({
  fullScreenplay,
  screenplay,
  href,
  showFavorite,
  showGenre,
  showProject,
  showTeam,
  showWordCount,
  onEdit,
  onRename,
  onExport,
  onToggleFavorite,
  onDelete,
  onMoveToProject,
  onRemoveFromProject,
  onCreateProject,
  onAddToStack,
  onMoveToTeam,
  onRemoveFromTeam,
  onArchive,
}: DraggableScreenplayCardProps) {
  const { activeId, activeType } = useWorkspaceDndState();

  // Make the card draggable
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `screenplay-${fullScreenplay.id}`,
    data: {
      type: 'screenplay',
      id: fullScreenplay.id,
      screenplay: fullScreenplay,
    } as DraggableData,
  });

  // Make the card a drop target (for other screenplays to be dropped onto)
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `droppable-screenplay-${fullScreenplay.id}`,
    data: {
      type: 'screenplay',
      id: fullScreenplay.id,
      screenplay: fullScreenplay,
    } as DraggableData,
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Check if this card is being hovered by another dragged item
  const isDropTarget = isOver && activeId && activeId !== fullScreenplay.id && activeType === 'screenplay';

  // When dragging, show a dimmed placeholder
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="opacity-30 transition-opacity"
      >
        <ScreenplayListCard
          screenplay={screenplay}
          href={href}
          showFavorite={showFavorite}
          showGenre={showGenre}
          showProject={showProject}
          showTeam={showTeam}
          showWordCount={showWordCount}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...dragAttributes}
      {...dragListeners}
      className="relative touch-manipulation cursor-grab active:cursor-grabbing transition-all duration-200"
    >
      {/* Visual indicator when another screenplay is dragged over */}
      {isDropTarget && (
        <div className="absolute inset-0 z-10 rounded-xl bg-primary/10 border-2 border-dashed border-primary pointer-events-none flex items-center justify-center">
          <span className="text-sm font-medium text-primary bg-background/90 px-3 py-1 rounded-full">
            Drop to create stack
          </span>
        </div>
      )}
      <ScreenplayListCard
        screenplay={screenplay}
        href={href}
        showFavorite={showFavorite}
        showGenre={showGenre}
        showProject={showProject}
        showTeam={showTeam}
        showWordCount={showWordCount}
        onEdit={onEdit}
        onRename={onRename}
        onExport={onExport}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
        onMoveToProject={onMoveToProject}
        onRemoveFromProject={onRemoveFromProject}
        onCreateProject={onCreateProject}
        onAddToStack={onAddToStack}
        onMoveToTeam={onMoveToTeam}
        onRemoveFromTeam={onRemoveFromTeam}
        onArchive={onArchive}
      />
    </div>
  );
}
