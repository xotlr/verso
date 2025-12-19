'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import type { ScreenplayItem, StackItem } from '@/hooks/use-workspace-data';
import { ScreenplayListCard } from '@/components/screenplay/screenplay-list-card';

// What types of items can be dragged
export type DraggableType = 'screenplay' | 'stack';

// Flexible type that works with both full ScreenplayItem and partial screenplay data
export type DraggableScreenplayData = Omit<ScreenplayItem, 'content'> & { content?: string };

// Data attached to a draggable item
export interface DraggableData {
  type: DraggableType;
  id: string;
  screenplay?: DraggableScreenplayData;
  stack?: StackItem;
}

// Context for drag state
interface WorkspaceDndContextValue {
  activeId: string | null;
  activeType: DraggableType | null;
  overId: string | null;
  overType: DraggableType | null;
}

export const WorkspaceDndStateContext = React.createContext<WorkspaceDndContextValue>({
  activeId: null,
  activeType: null,
  overId: null,
  overType: null,
});

interface WorkspaceDndContextProps {
  children: React.ReactNode;
  onCreateStack: (draggedId: string, targetId: string) => Promise<StackItem | null>;
  onAddToStack: (screenplayId: string, stackId: string) => Promise<void>;
  disabled?: boolean;
}

export function WorkspaceDndContext({
  children,
  onCreateStack,
  onAddToStack,
  disabled = false,
}: WorkspaceDndContextProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<DraggableType | null>(null);
  const [activeData, setActiveData] = useState<DraggableData | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overType, setOverType] = useState<DraggableType | null>(null);

  // Configure sensors for both pointer and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // 10px movement to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms long press for mobile
        tolerance: 5,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DraggableData | undefined;

    if (data) {
      setActiveId(data.id);
      setActiveType(data.type);
      setActiveData(data);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;

    if (!over) {
      setOverId(null);
      setOverType(null);
      return;
    }

    const overData = over.data.current as DraggableData | undefined;
    if (overData) {
      setOverId(overData.id);
      setOverType(overData.type);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset state
    setActiveId(null);
    setActiveType(null);
    setActiveData(null);
    setOverId(null);
    setOverType(null);

    if (!over || !active) return;

    const activeData = active.data.current as DraggableData | undefined;
    const overData = over.data.current as DraggableData | undefined;

    if (!activeData || !overData) return;
    if (activeData.id === overData.id) return;

    // Screenplay dragged onto another screenplay -> create stack
    if (activeData.type === 'screenplay' && overData.type === 'screenplay') {
      await onCreateStack(activeData.id, overData.id);
    }
    // Screenplay dragged onto a stack -> add to stack
    else if (activeData.type === 'screenplay' && overData.type === 'stack') {
      await onAddToStack(activeData.id, overData.id);
    }
    // Stack dragged onto stack -> could merge (future enhancement)
  }, [onCreateStack, onAddToStack]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveType(null);
    setActiveData(null);
    setOverId(null);
    setOverType(null);
  }, []);

  const contextValue = useMemo(() => ({
    activeId,
    activeType,
    overId,
    overType,
  }), [activeId, activeType, overId, overType]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <WorkspaceDndStateContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        {/* Drag overlay - shows a preview of the dragged item */}
        <DragOverlay dropAnimation={null}>
          {activeData?.type === 'screenplay' && activeData.screenplay && (
            <div className="opacity-80 scale-105 rotate-2 pointer-events-none">
              <ScreenplayListCard
                screenplay={{
                  id: activeData.screenplay.id,
                  title: activeData.screenplay.title,
                  logline: activeData.screenplay.logline,
                  synopsis: activeData.screenplay.synopsis,
                  updatedAt: activeData.screenplay.updatedAt,
                  wordCount: activeData.screenplay.wordCount,
                  genre: activeData.screenplay.genre,
                  isFavorite: activeData.screenplay.isFavorite,
                  project: activeData.screenplay.project,
                  author: activeData.screenplay.author,
                  user: activeData.screenplay.user,
                  type: activeData.screenplay.type || undefined,
                  season: activeData.screenplay.season,
                  episode: activeData.screenplay.episode,
                  episodeTitle: activeData.screenplay.episodeTitle,
                  series: activeData.screenplay.series,
                }}
                href="#"
                showFavorite={false}
                showGenre={false}
                showProject={false}
                showWordCount={false}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </WorkspaceDndStateContext.Provider>
  );
}

// Hook to access drag state
export function useWorkspaceDndState() {
  return React.useContext(WorkspaceDndStateContext);
}
