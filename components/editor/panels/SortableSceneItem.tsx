'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Trash2,
  Copy,
  Pencil,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';

export interface SortableSceneItemProps {
  scene: SceneInfo;
  sceneIndex: number;
  isActive?: boolean;
  isSelected?: boolean;
  selectedCount?: number;
  navigateToScene: (scene: SceneInfo) => void;
  formatSceneHeading: (scene: SceneInfo) => string;
  onSelect?: (sceneId: string, event: React.MouseEvent) => void;
  onRename?: (scene: SceneInfo) => void;
  onAddShot?: (sceneId: string) => void;
}

export function SortableSceneItem({
  scene,
  sceneIndex,
  isActive,
  isSelected,
  selectedCount = 0,
  navigateToScene,
  formatSceneHeading,
  onSelect,
  onRename,
}: SortableSceneItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const hasSwiped = useRef<boolean>(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: scene.id });

  // Auto-scroll to active scene
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  // Haptic feedback on drag start
  useEffect(() => {
    if (isDragging && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [isDragging]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  // Combine refs
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  // Swipe right to select (Procreate-style)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    hasSwiped.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (hasSwiped.current) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

    // Swipe right: 40px horizontal, less than 30px vertical
    if (deltaX > 40 && deltaY < 30) {
      hasSwiped.current = true;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
      // Toggle selection
      onSelect?.(scene.id, { shiftKey: false, metaKey: true, ctrlKey: true } as unknown as React.MouseEvent);
    }
  };

  // Handle click with modifier keys for selection
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging || hasSwiped.current) return;

    // If shift/cmd/ctrl is held, handle selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      onSelect?.(scene.id, e);
    } else if (selectedCount > 0 && !isSelected) {
      // Clicking unselected item when there's a selection - clear and navigate
      onSelect?.(scene.id, e);
      navigateToScene(scene);
    } else if (selectedCount > 0 && isSelected) {
      // Clicking selected item - just navigate (keep selection for context menu)
      navigateToScene(scene);
    } else {
      // Normal click - navigate
      navigateToScene(scene);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={combinedRef}
          style={style}
          {...attributes}
          {...listeners}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className={cn(
            'group rounded-md',
            'transition-all duration-150',
            'cursor-grab active:cursor-grabbing',
            isSelected
              ? 'bg-primary/20 shadow-sm'
              : isActive
                ? 'bg-primary/10 border-l-2 border-primary shadow-sm'
                : 'hover:bg-accent/50',
            isDragging && 'bg-accent shadow-xl ring-2 ring-primary/50 scale-[1.02] rotate-[1deg]',
            isSorting && !isDragging && 'transition-transform duration-200'
          )}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigateToScene(scene);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
            {/* Scene number - click to toggle selection */}
            <button
              className={cn(
                'w-6 font-mono text-[10px] font-medium shrink-0 tabular-nums',
                'hover:text-primary transition-colors',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(scene.id, { ...e, metaKey: true, ctrlKey: true } as React.MouseEvent);
              }}
              title="Click to select"
            >
              {scene.sceneNumber || `${sceneIndex + 1}`}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={cn(
                'font-medium text-xs break-words',
                isSelected && 'text-primary'
              )}>
                {formatSceneHeading(scene)}
              </div>
            </div>

            {/* Navigate arrow - always visible on right */}
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-opacity',
                'text-muted-foreground/50 group-hover:text-muted-foreground',
                isActive && 'text-primary'
              )}
            />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => navigateToScene(scene)}>
          <ChevronRight className="h-3.5 w-3.5 mr-2" />
          Go to scene
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRename?.(scene)}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Copy className="h-3.5 w-3.5 mr-2" />
          Duplicate{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
