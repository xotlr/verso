'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Film } from 'lucide-react';
import { usePanelVirtualization } from '@/hooks/use-panel-virtualization';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelContainer } from './PanelContainer';
import { PanelEmptyState } from './PanelEmptyState';
import { PanelSkeleton } from './PanelSkeleton';
import { usePanelDndSensors } from './use-panel-dnd';
import { SortableSceneItem } from './SortableSceneItem';
import { SceneFilters } from './SceneFilters';
import { useSceneSelection } from './use-scene-selection';

interface ScenesPanelProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  screenplayId?: string;
  onAddShotToScene?: (sceneId: string) => void;
  className?: string;
}

/**
 * Scenes panel showing flat scene list with navigation.
 * Supports filtering by scene type (INT/EXT) and time of day.
 */
function ScenesPanelInner({
  scenes,
  view,
  currentSceneId,
  onAddShotToScene,
  className,
}: ScenesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sceneTypeFilters, setSceneTypeFilters] = useState<Set<string>>(new Set());
  const [timeOfDayFilters, setTimeOfDayFilters] = useState<Set<string>>(new Set());

  // Drag state for overlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeScene = useMemo(() =>
    activeId ? scenes.find(s => s.id === activeId) : null
  , [activeId, scenes]);

  // Custom hook for selection
  const sceneIds = useMemo(() => scenes.map(s => s.id), [scenes]);
  const { selectedScenes, selectedCount, handleSelect } = useSceneSelection({ sceneIds });

  // Toggle filter helper
  const toggleFilter = useCallback((
    filter: string,
    setFilters: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSceneTypeFilters(new Set());
    setTimeOfDayFilters(new Set());
  }, []);

  // Active filter count
  const activeFilterCount = sceneTypeFilters.size + timeOfDayFilters.size + (searchQuery ? 1 : 0);

  // Sensors for drag & drop
  const sensors = usePanelDndSensors();

  // Filter scenes by search query and filters
  const filteredScenes = useMemo(() => {
    const hasFilters = searchQuery || sceneTypeFilters.size > 0 || timeOfDayFilters.size > 0;
    if (!hasFilters) return scenes;

    return scenes.filter(scene => {
      const matchesSearch = !searchQuery ||
        scene.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scene.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = sceneTypeFilters.size === 0 ||
        sceneTypeFilters.has(scene.type.toUpperCase());
      const matchesToD = timeOfDayFilters.size === 0 ||
        timeOfDayFilters.has(scene.timeOfDay?.toUpperCase() || 'DAY');
      return matchesSearch && matchesType && matchesToD;
    });
  }, [scenes, searchQuery, sceneTypeFilters, timeOfDayFilters]);

  // Scene IDs for sortable context
  const sortableSceneIds = useMemo(() => filteredScenes.map(s => s.id), [filteredScenes]);

  // Virtualization hook
  const { parentRef, isVirtualized, virtualItems, totalSize, getItem, allItems } =
    usePanelVirtualization({
      items: filteredScenes,
      estimateSize: 44,
      getItemKey: (scene) => scene.id,
      minItemsForVirtualization: 25,
    });

  const navigateToScene = useCallback((scene: SceneInfo) => {
    if (!view) return;

    let found = false;
    let targetPos = 0;

    view.state.doc.forEach((node, offset) => {
      if (!found && node.type.name === 'scene_heading') {
        if (offset === scene.position) {
          targetPos = offset + 1;
          found = true;
        }
      }
    });

    if (found) {
      const tr = view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(targetPos))
      );
      view.dispatch(tr.scrollIntoView());
      view.focus();
    }
  }, [view]);

  const formatSceneHeading = useCallback((scene: SceneInfo) => {
    const type = scene.type || 'INT';
    const location = scene.location || 'UNKNOWN';
    return `${type}. ${location}`;
  }, []);

  // Handle scene rename - navigate and select the heading text for inline editing
  const handleSceneRename = useCallback((scene: SceneInfo) => {
    if (!view) return;

    let found = false;
    let nodeStart = 0;
    let nodeEnd = 0;

    view.state.doc.forEach((node, offset) => {
      if (!found && node.type.name === 'scene_heading') {
        if (offset === scene.position) {
          nodeStart = offset;
          nodeEnd = offset + node.nodeSize;
          found = true;
        }
      }
    });

    if (found) {
      const $start = view.state.doc.resolve(nodeStart + 1);
      const $end = view.state.doc.resolve(nodeEnd - 1);
      const tr = view.state.tr.setSelection(TextSelection.between($start, $end));
      view.dispatch(tr.scrollIntoView());
      view.focus();
    }
  }, [view]);

  // Handle drag start - set active ID for overlay
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex(s => s.id === active.id);
      const newIndex = scenes.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Scene reordering requires ProseMirror node manipulation - haptic feedback only for now
        if (navigator.vibrate) {
          navigator.vibrate([5, 50, 5]);
        }
      }
    }
  }, [scenes]);

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Render a single scene item
  const renderSceneItem = useCallback((scene: SceneInfo, index: number) => {
    return (
      <SortableSceneItem
        key={scene.id}
        scene={scene}
        sceneIndex={index}
        isActive={scene.id === currentSceneId}
        isSelected={selectedScenes.has(scene.id)}
        selectedCount={selectedCount}
        navigateToScene={navigateToScene}
        formatSceneHeading={formatSceneHeading}
        onSelect={handleSelect}
        onRename={handleSceneRename}
        onAddShot={onAddShotToScene}
      />
    );
  }, [
    currentSceneId, selectedScenes, selectedCount,
    navigateToScene, formatSceneHeading, handleSelect, handleSceneRename, onAddShotToScene
  ]);

  // Render drag overlay
  const renderDragOverlay = () => (
    <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
      {activeScene && sortableSceneIds.includes(activeScene.id) && (
        <div className="bg-background rounded-lg shadow-2xl ring-2 ring-primary border border-border px-2.5 py-2 text-xs font-medium flex items-center gap-2">
          {formatSceneHeading(activeScene)}
          {selectedCount > 1 && selectedScenes.has(activeScene.id) && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
              +{selectedCount - 1}
            </span>
          )}
        </div>
      )}
    </DragOverlay>
  );

  // Show skeleton when editor view hasn't initialized yet
  if (!view && scenes.length === 0) {
    return (
      <PanelContainer className={className}>
        <PanelSkeleton variant="scenes" />
      </PanelContainer>
    );
  }

  return (
    <PanelContainer className={className}>
      {/* Screen reader instructions for drag-and-drop */}
      <div id="scene-drag-instructions" className="sr-only">
        Press Space or Enter to start dragging. Use arrow keys to move. Press Space or Enter to drop, or Escape to cancel.
      </div>

      {/* Search & Filters */}
      {scenes.length > 5 && (
        <SceneFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sceneTypeFilters={sceneTypeFilters}
          timeOfDayFilters={timeOfDayFilters}
          onToggleSceneType={(type) => toggleFilter(type, setSceneTypeFilters)}
          onToggleTimeOfDay={(time) => toggleFilter(time, setTimeOfDayFilters)}
          onClearFilters={clearFilters}
        />
      )}

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0" viewportRef={parentRef}>
        <div className="p-3">
          {filteredScenes.length === 0 ? (
            <PanelEmptyState
              icon={Film}
              title={activeFilterCount > 0 ? 'No matching scenes' : 'No scenes yet'}
              description={activeFilterCount > 0
                ? 'Try adjusting your filters or search term'
                : 'Start writing to see your story structure.'}
              action={activeFilterCount > 0 ? { label: 'Clear filters', onClick: clearFilters } : undefined}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={sortableSceneIds}
                strategy={verticalListSortingStrategy}
              >
                {isVirtualized && virtualItems ? (
                  // Virtualized rendering for large lists
                  <div style={{ height: totalSize, position: 'relative' }}>
                    {virtualItems.map((virtualItem) => {
                      const scene = getItem(virtualItem);
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          {renderSceneItem(scene, virtualItem.index)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Non-virtualized rendering for small lists
                  <div className="space-y-0.5">
                    {allItems.map((scene, index) => renderSceneItem(scene, index))}
                  </div>
                )}
              </SortableContext>
              {renderDragOverlay()}
            </DndContext>
          )}
        </div>
      </ScrollArea>
    </PanelContainer>
  );
}

export const ScenesPanel = React.memo(ScenesPanelInner);
