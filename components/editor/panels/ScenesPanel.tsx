'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Undo2, Film } from 'lucide-react';
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
import { PanelHeader } from './PanelHeader';
import { PanelEmptyState } from './PanelEmptyState';
import { usePanelDndSensors } from './use-panel-dnd';
import { SortableSceneItem } from './SortableSceneItem';
import { SceneFilters } from './SceneFilters';
import { ActHeader, type Act } from './ActHeader';
import { useSceneSelection } from './use-scene-selection';
import { useActManagement } from './use-act-management';

interface ScenesPanelProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  screenplayId?: string;
  onAddScene?: () => void;
  onAddShotToScene?: (sceneId: string) => void;
  className?: string;
}

// Flattened item types for virtualization
type FlatListItem =
  | { type: 'restore-button'; id: string }
  | { type: 'ungrouped-scene'; id: string; scene: SceneInfo; sceneIndex: number }
  | { type: 'act-header'; id: string; act: Act }
  | { type: 'act-scene'; id: string; scene: SceneInfo; sceneIndex: number; actId: string };

/**
 * Scenes panel showing hierarchical act/scene structure with navigation.
 * Supports filtering by scene type (INT/EXT) and time of day.
 */
export function ScenesPanel({
  scenes,
  view,
  currentSceneId,
  screenplayId,
  onAddScene,
  onAddShotToScene,
  className,
}: ScenesPanelProps) {
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(['act-1']));
  const [searchQuery, setSearchQuery] = useState('');
  const [sceneTypeFilters, setSceneTypeFilters] = useState<Set<string>>(new Set());
  const [timeOfDayFilters, setTimeOfDayFilters] = useState<Set<string>>(new Set());

  // Drag state for overlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeScene = useMemo(() =>
    activeId ? scenes.find(s => s.id === activeId) : null
  , [activeId, scenes]);

  // Custom hooks for selection and act management
  const sceneIds = useMemo(() => scenes.map(s => s.id), [scenes]);
  const { selectedScenes, selectedCount, handleSelect } = useSceneSelection({ sceneIds });
  const {
    editingActId,
    editingName,
    hiddenActsCount,
    ungroupAct,
    resetAllGroups,
    groupScenes,
    ungroupScenes,
    startEditingAct,
    saveActName,
    cancelEditingAct,
    setEditingName,
    getActDisplayName,
    isActHidden,
    getSceneCustomGroup,
  } = useActManagement({ screenplayId });

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

  // Group scenes into acts (every 10 scenes)
  const acts = useMemo(() => {
    if (scenes.length === 0) return [];

    const actsData: Act[] = [];
    let currentAct: Act | null = null;
    let actIndex = 0;

    scenes.forEach((scene, idx) => {
      if (idx === 0 || idx % 10 === 0) {
        actIndex++;
        currentAct = {
          id: `act-${actIndex}`,
          name: `Act ${actIndex}`,
          scenes: [],
        };
        actsData.push(currentAct);
      }

      if (currentAct) {
        currentAct.scenes.push(scene);
      }
    });

    return actsData;
  }, [scenes]);

  // Filter scenes by search query and filters
  const filteredActs = useMemo(() => {
    const filterScenes = (sceneList: SceneInfo[]) => {
      const hasFilters = searchQuery || sceneTypeFilters.size > 0 || timeOfDayFilters.size > 0;
      if (!hasFilters) return sceneList;

      return sceneList.filter(scene => {
        const matchesSearch = !searchQuery ||
          scene.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scene.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = sceneTypeFilters.size === 0 ||
          sceneTypeFilters.has(scene.type.toUpperCase());
        const matchesToD = timeOfDayFilters.size === 0 ||
          timeOfDayFilters.has(scene.timeOfDay?.toUpperCase() || 'DAY');
        return matchesSearch && matchesType && matchesToD;
      });
    };

    return acts.map(act => ({
      ...act,
      scenes: filterScenes(act.scenes as SceneInfo[]),
    })).filter(act => act.scenes.length > 0);
  }, [acts, searchQuery, sceneTypeFilters, timeOfDayFilters]);

  // Separate visible (grouped) acts from ungrouped scenes
  const { visibleActs, ungroupedScenes } = useMemo(() => {
    const visible: typeof filteredActs = [];
    const ungrouped: SceneInfo[] = [];

    filteredActs.forEach(act => {
      if (isActHidden(act.id)) {
        ungrouped.push(...(act.scenes as SceneInfo[]));
      } else {
        visible.push(act);
      }
    });

    return { visibleActs: visible, ungroupedScenes: ungrouped };
  }, [filteredActs, isActHidden]);

  // Flatten hierarchy for virtualization
  const flattenedItems = useMemo((): FlatListItem[] => {
    const items: FlatListItem[] = [];

    // Restore button if there are hidden acts
    if (hiddenActsCount > 0) {
      items.push({ type: 'restore-button', id: 'restore-groups' });
    }

    // Ungrouped scenes
    ungroupedScenes.forEach((scene) => {
      items.push({
        type: 'ungrouped-scene',
        id: scene.id,
        scene,
        sceneIndex: scenes.indexOf(scene),
      });
    });

    // Grouped acts with their scenes
    visibleActs.forEach((act) => {
      items.push({ type: 'act-header', id: act.id, act: act as Act });

      if (expandedActs.has(act.id)) {
        (act.scenes as SceneInfo[]).forEach((scene) => {
          items.push({
            type: 'act-scene',
            id: scene.id,
            scene,
            sceneIndex: scenes.indexOf(scene),
            actId: act.id,
          });
        });
      }
    });

    return items;
  }, [hiddenActsCount, ungroupedScenes, visibleActs, expandedActs, scenes]);

  // All scene IDs for sortable context
  const allSceneIds = useMemo(() => {
    return flattenedItems
      .filter((item): item is Extract<FlatListItem, { type: 'ungrouped-scene' | 'act-scene' }> =>
        item.type === 'ungrouped-scene' || item.type === 'act-scene'
      )
      .map(item => item.id);
  }, [flattenedItems]);

  // Virtualization hook
  const { parentRef, isVirtualized, virtualItems, totalSize, getItem, allItems } =
    usePanelVirtualization({
      items: flattenedItems,
      estimateSize: 44,
      getItemKey: (item) => item.id,
      minItemsForVirtualization: 25,
    });

  const toggleAct = useCallback((actId: string) => {
    setExpandedActs(prev => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  }, []);

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
      // Select the entire heading text (excluding the node boundaries)
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
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, []);

  // Handle drag end - log reorder for now (document reordering is a separate feature)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Find the scenes in the current order
      const oldIndex = scenes.findIndex(s => s.id === active.id);
      const newIndex = scenes.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // TODO: Implement actual document reordering via ProseMirror transaction
        // Light haptic on drop
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

  // Handle grouping selected scenes
  const handleGroupScenes = useCallback((sceneId: string) => {
    // If scene is selected and there are selections, group all selected
    // Otherwise just group this single scene
    const scenesToGroup = selectedScenes.has(sceneId) && selectedCount > 0
      ? Array.from(selectedScenes)
      : [sceneId];
    groupScenes(scenesToGroup);
  }, [selectedScenes, selectedCount, groupScenes]);

  // Handle ungrouping selected scenes
  const handleUngroupScenes = useCallback((sceneId: string) => {
    const scenesToUngroup = selectedScenes.has(sceneId) && selectedCount > 0
      ? Array.from(selectedScenes)
      : [sceneId];
    ungroupScenes(scenesToUngroup);
  }, [selectedScenes, selectedCount, ungroupScenes]);

  // Render a single flattened item
  const renderFlatItem = useCallback((item: FlatListItem) => {
    switch (item.type) {
      case 'restore-button':
        return (
          <button
            key={item.id}
            onClick={resetAllGroups}
            className={cn(
              'w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'text-[10px] text-muted-foreground',
              'hover:bg-accent/50 hover:text-foreground',
              'transition-colors'
            )}
          >
            <Undo2 className="h-3 w-3" />
            Restore all groups ({hiddenActsCount})
          </button>
        );

      case 'act-header':
        return (
          <ActHeader
            key={item.id}
            act={item.act}
            isExpanded={expandedActs.has(item.act.id)}
            isEditing={editingActId === item.act.id}
            editingName={editingName}
            displayName={getActDisplayName(item.act)}
            onToggle={() => toggleAct(item.act.id)}
            onStartEditing={(e) => startEditingAct(item.act.id, getActDisplayName(item.act), e)}
            onEditingNameChange={setEditingName}
            onSaveEdit={saveActName}
            onCancelEdit={cancelEditingAct}
            onUngroup={() => ungroupAct(item.act.id)}
          />
        );

      case 'ungrouped-scene':
      case 'act-scene': {
        const customGroup = getSceneCustomGroup(item.scene.id);
        return (
          <SortableSceneItem
            key={item.id}
            scene={item.scene}
            sceneIndex={item.sceneIndex}
            isActive={item.scene.id === currentSceneId}
            isSelected={selectedScenes.has(item.scene.id)}
            selectedCount={selectedCount}
            isInCustomGroup={!!customGroup}
            navigateToScene={navigateToScene}
            formatSceneHeading={formatSceneHeading}
            onSelect={handleSelect}
            onRename={handleSceneRename}
            onAddShot={onAddShotToScene}
            onGroup={() => handleGroupScenes(item.scene.id)}
            onUngroup={() => handleUngroupScenes(item.scene.id)}
          />
        );
      }
    }
  }, [
    resetAllGroups, hiddenActsCount, expandedActs, editingActId, editingName,
    getActDisplayName, toggleAct, startEditingAct, setEditingName, saveActName,
    cancelEditingAct, ungroupAct, currentSceneId, selectedScenes, selectedCount,
    navigateToScene, formatSceneHeading, handleSelect, handleSceneRename, onAddShotToScene,
    getSceneCustomGroup, handleGroupScenes, handleUngroupScenes
  ]);

  // Render drag overlay
  const renderDragOverlay = () => (
    <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
      {activeScene && allSceneIds.includes(activeScene.id) && (
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

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      <PanelHeader
        title="Scenes"
        count={scenes.length}
        onAdd={onAddScene}
        addLabel="Add scene"
      />

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
          {flattenedItems.length === 0 ? (
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
                items={allSceneIds}
                strategy={verticalListSortingStrategy}
              >
                {isVirtualized && virtualItems ? (
                  // Virtualized rendering for large lists
                  <div style={{ height: totalSize, position: 'relative' }}>
                    {virtualItems.map((virtualItem) => {
                      const item = getItem(virtualItem);
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
                          {renderFlatItem(item)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Non-virtualized rendering for small lists
                  <div className="space-y-0.5">
                    {allItems.map((item) => renderFlatItem(item))}
                  </div>
                )}
              </SortableContext>
              {renderDragOverlay()}
            </DndContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
