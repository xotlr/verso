'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Clapperboard,
  X,
  MoreHorizontal,
  Trash2,
  Copy,
  Building,
  TreePine,
  Building2,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  RotateCw,
  Ungroup,
  Pencil,
  Undo2,
  FolderPlus,
  Film,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { FilterPill } from '@/components/ui/list-page-toolbar';
import { Badge } from '@/components/ui/badge';
import { PanelHeader } from './PanelHeader';
import { PanelSearch } from './PanelSearch';
import { PanelEmptyState } from './PanelEmptyState';
import { usePanelDndSensors } from './use-panel-dnd';

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface ScenesPanelProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  screenplayId?: string;
  onAddScene?: () => void;
  onAddShotToScene?: (sceneId: string) => void;
  className?: string;
}

// Sortable scene item component
interface SortableSceneItemProps {
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

function SortableSceneItem({
  scene,
  sceneIndex,
  isActive,
  isSelected,
  selectedCount = 0,
  navigateToScene,
  formatSceneHeading,
  onSelect,
  onRename,
  onAddShot: _onAddShot,
}: SortableSceneItemProps) {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef<number>(0);
  const touchStartY = React.useRef<number>(0);
  const hasSwiped = React.useRef<boolean>(false);

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
  React.useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  // Haptic feedback on drag start
  React.useEffect(() => {
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
        {selectedCount > 1 && (
          <ContextMenuItem>
            <FolderPlus className="h-3.5 w-3.5 mr-2" />
            Group into Act
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

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

  // Act renaming state
  const [actNames, setActNames] = useState<Map<string, string>>(new Map());
  const [hiddenActs, setHiddenActs] = useState<Set<string>>(new Set());
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = React.useRef<HTMLInputElement>(null);

  // Drag state for overlay
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeScene = useMemo(() =>
    activeId ? scenes.find(s => s.id === activeId) : null
  , [activeId, scenes]);

  // Selection state
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Handle scene selection with shift/cmd modifiers
  const handleSceneSelect = useCallback((sceneId: string, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedId) {
      // Range select
      const allSceneIds = scenes.map(s => s.id);
      const startIdx = allSceneIds.indexOf(lastSelectedId);
      const endIdx = allSceneIds.indexOf(sceneId);
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      const rangeIds = allSceneIds.slice(from, to + 1);
      setSelectedScenes(new Set([...selectedScenes, ...rangeIds]));
    } else if (event.metaKey || event.ctrlKey) {
      // Toggle select
      const newSelection = new Set(selectedScenes);
      if (newSelection.has(sceneId)) {
        newSelection.delete(sceneId);
      } else {
        newSelection.add(sceneId);
      }
      setSelectedScenes(newSelection);
      setLastSelectedId(sceneId);
    } else {
      // Single select or clear
      if (selectedScenes.has(sceneId) && selectedScenes.size === 1) {
        // Clicking selected item clears selection
        setSelectedScenes(new Set());
        setLastSelectedId(null);
      } else {
        setSelectedScenes(new Set([sceneId]));
        setLastSelectedId(sceneId);
      }
    }
  }, [scenes, selectedScenes, lastSelectedId]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedScenes(new Set());
    setLastSelectedId(null);
  }, []);

  // Keyboard handler for Escape to clear selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedScenes.size > 0) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedScenes.size, clearSelection]);

  // Load act names and hidden acts from localStorage
  React.useEffect(() => {
    if (!screenplayId) return;
    const storedNames = localStorage.getItem(`act-names-${screenplayId}`);
    if (storedNames) {
      try {
        const parsed = JSON.parse(storedNames);
        setActNames(new Map(Object.entries(parsed)));
      } catch (e) {
        console.error('Failed to parse act names:', e);
      }
    }
    const storedHidden = localStorage.getItem(`hidden-acts-${screenplayId}`);
    if (storedHidden) {
      try {
        setHiddenActs(new Set(JSON.parse(storedHidden)));
      } catch (e) {
        console.error('Failed to parse hidden acts:', e);
      }
    }
  }, [screenplayId]);

  // Save act names to localStorage
  const saveActNames = useCallback((names: Map<string, string>) => {
    if (!screenplayId) return;
    localStorage.setItem(`act-names-${screenplayId}`, JSON.stringify(Object.fromEntries(names)));
  }, [screenplayId]);

  // Save hidden acts to localStorage
  const saveHiddenActs = useCallback((hidden: Set<string>) => {
    if (!screenplayId) return;
    localStorage.setItem(`hidden-acts-${screenplayId}`, JSON.stringify([...hidden]));
  }, [screenplayId]);

  // Ungroup/hide an act (scenes will show without grouping)
  const ungroupAct = useCallback((actId: string) => {
    const newHidden = new Set(hiddenActs);
    newHidden.add(actId);
    setHiddenActs(newHidden);
    saveHiddenActs(newHidden);
  }, [hiddenActs, saveHiddenActs]);

  // Reset all groupings
  const resetAllGroups = useCallback(() => {
    setHiddenActs(new Set());
    if (screenplayId) {
      localStorage.removeItem(`hidden-acts-${screenplayId}`);
    }
  }, [screenplayId]);

  // Start editing act name
  const startEditingAct = useCallback((actId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingActId(actId);
    setEditingName(currentName);
    setTimeout(() => editInputRef.current?.select(), 0);
  }, []);

  // Save edited act name
  const saveActName = useCallback(() => {
    if (!editingActId) return;
    const trimmedName = editingName.trim();
    if (trimmedName) {
      const newNames = new Map(actNames);
      newNames.set(editingActId, trimmedName);
      setActNames(newNames);
      saveActNames(newNames);
    }
    setEditingActId(null);
    setEditingName('');
  }, [editingActId, editingName, actNames, saveActNames]);

  // Cancel editing
  const cancelEditingAct = useCallback(() => {
    setEditingActId(null);
    setEditingName('');
  }, []);

  // Get display name for act
  const getActDisplayName = useCallback((act: Act) => {
    return actNames.get(act.id) || act.name;
  }, [actNames]);

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
      scenes: filterScenes(act.scenes),
    })).filter(act => act.scenes.length > 0);
  }, [acts, searchQuery, sceneTypeFilters, timeOfDayFilters]);

  // Separate visible (grouped) acts from ungrouped scenes
  const { visibleActs, ungroupedScenes } = useMemo(() => {
    const visible: Act[] = [];
    const ungrouped: SceneInfo[] = [];

    filteredActs.forEach(act => {
      if (hiddenActs.has(act.id)) {
        ungrouped.push(...act.scenes);
      } else {
        visible.push(act);
      }
    });

    return { visibleActs: visible, ungroupedScenes: ungrouped };
  }, [filteredActs, hiddenActs]);

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
        // This would involve moving scene_heading nodes and their associated content
        console.log('Scene reorder requested:', { from: oldIndex, to: newIndex });
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
        <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
          <PanelSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search scenes..."
          />

          {/* Scene Type Filters - Compact */}
          <div className="flex flex-wrap gap-1">
            <FilterPill
              compact
              active={sceneTypeFilters.has('INT')}
              onClick={() => toggleFilter('INT', setSceneTypeFilters)}
              icon={<Building className="h-3 w-3" />}
              label="INT"
              activeColor="blue"
            />
            <FilterPill
              compact
              active={sceneTypeFilters.has('EXT')}
              onClick={() => toggleFilter('EXT', setSceneTypeFilters)}
              icon={<TreePine className="h-3 w-3" />}
              label="EXT"
              activeColor="green"
            />
            <FilterPill
              compact
              active={sceneTypeFilters.has('INT/EXT')}
              onClick={() => toggleFilter('INT/EXT', setSceneTypeFilters)}
              icon={<Building2 className="h-3 w-3" />}
              label="INT/EXT"
              activeColor="purple"
            />
            <span className="w-px h-4 bg-border/60 mx-0.5" />
            <FilterPill
              compact
              active={timeOfDayFilters.has('DAY')}
              onClick={() => toggleFilter('DAY', setTimeOfDayFilters)}
              icon={<Sun className="h-3 w-3" />}
              label="DAY"
              activeColor="yellow"
            />
            <FilterPill
              compact
              active={timeOfDayFilters.has('NIGHT')}
              onClick={() => toggleFilter('NIGHT', setTimeOfDayFilters)}
              icon={<Moon className="h-3 w-3" />}
              label="NIGHT"
              activeColor="blue"
            />
            <FilterPill
              compact
              active={timeOfDayFilters.has('DAWN')}
              onClick={() => toggleFilter('DAWN', setTimeOfDayFilters)}
              icon={<Sunrise className="h-3 w-3" />}
              label="DAWN"
              activeColor="yellow"
            />
            <FilterPill
              compact
              active={timeOfDayFilters.has('DUSK')}
              onClick={() => toggleFilter('DUSK', setTimeOfDayFilters)}
              icon={<Sunset className="h-3 w-3" />}
              label="DUSK"
              activeColor="purple"
            />
            <FilterPill
              compact
              active={timeOfDayFilters.has('CONTINUOUS')}
              onClick={() => toggleFilter('CONTINUOUS', setTimeOfDayFilters)}
              icon={<RotateCw className="h-3 w-3" />}
              label="CONTINUOUS"
              activeColor="primary"
            />
          </div>

          {/* Active filter count & clear */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {activeFilterCount} active
              </Badge>
              <button
                onClick={clearFilters}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <X className="h-2.5 w-2.5" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3">
          {visibleActs.length === 0 && ungroupedScenes.length === 0 ? (
            <PanelEmptyState
              icon={Film}
              title={activeFilterCount > 0 ? 'No matching scenes' : 'No scenes yet'}
              description={activeFilterCount > 0
                ? 'Try adjusting your filters or search term'
                : 'Start writing to see your story structure.'}
              action={activeFilterCount > 0 ? { label: 'Clear filters', onClick: clearFilters } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {/* Restore groups button when there are ungrouped acts */}
              {hiddenActs.size > 0 && (
                <button
                  onClick={resetAllGroups}
                  className={cn(
                    'w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                    'text-[10px] text-muted-foreground',
                    'hover:bg-accent/50 hover:text-foreground',
                    'transition-colors'
                  )}
                >
                  <Undo2 className="h-3 w-3" />
                  Restore all groups ({hiddenActs.size})
                </button>
              )}

              {/* Ungrouped scenes - shown as flat list */}
              {ungroupedScenes.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={ungroupedScenes.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-0.5">
                      {ungroupedScenes.map((scene) => (
                        <SortableSceneItem
                          key={scene.id}
                          scene={scene}
                          sceneIndex={scenes.indexOf(scene)}
                          isActive={scene.id === currentSceneId}
                          isSelected={selectedScenes.has(scene.id)}
                          selectedCount={selectedScenes.size}
                          navigateToScene={navigateToScene}
                          formatSceneHeading={formatSceneHeading}
                          onSelect={handleSceneSelect}
                          onRename={handleSceneRename}
                          onAddShot={onAddShotToScene}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                    {activeScene && ungroupedScenes.some(s => s.id === activeScene.id) && (
                      <div className="bg-background rounded-lg shadow-2xl ring-2 ring-primary border border-border px-2.5 py-2 text-xs font-medium flex items-center gap-2">
                        {formatSceneHeading(activeScene)}
                        {selectedScenes.size > 1 && selectedScenes.has(activeScene.id) && (
                          <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                            +{selectedScenes.size - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}

              {/* Grouped acts */}
              {visibleActs.map((act) => (
                <div key={act.id}>
                  {/* Act header - Procreate-style editable group */}
                  <div
                    className={cn(
                      'w-full flex items-center justify-between',
                      'px-2.5 py-2 rounded-lg',
                      'text-xs font-medium',
                      'hover:bg-accent/50',
                      'transition-colors',
                      'group/act'
                    )}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <button
                        onClick={() => toggleAct(act.id)}
                        className="shrink-0"
                      >
                        {expandedActs.has(act.id) ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <Clapperboard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

                      {editingActId === act.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={saveActName}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveActName();
                            if (e.key === 'Escape') cancelEditingAct();
                          }}
                          className={cn(
                            'bg-transparent border-b border-primary outline-none',
                            'text-xs font-medium min-w-0 flex-1',
                            'px-0.5'
                          )}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => toggleAct(act.id)}
                          onDoubleClick={(e) => startEditingAct(act.id, getActDisplayName(act), e)}
                          className="truncate text-left flex-1 min-w-0"
                          title="Double-click to rename"
                        >
                          {getActDisplayName(act)}
                        </button>
                      )}

                      <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                        ({act.scenes.length})
                      </span>
                    </div>

                    {/* Act actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover/act:opacity-100 transition-opacity shrink-0"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          startEditingAct(act.id, getActDisplayName(act), e as unknown as React.MouseEvent);
                        }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => ungroupAct(act.id)}
                          className="text-destructive"
                        >
                          <Ungroup className="h-3.5 w-3.5 mr-2" />
                          Ungroup
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Scenes list with drag & drop */}
                  {expandedActs.has(act.id) && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext
                        items={act.scenes.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="mt-0.5 space-y-0.5">
                          {act.scenes.map((scene) => (
                            <SortableSceneItem
                              key={scene.id}
                              scene={scene}
                              sceneIndex={scenes.indexOf(scene)}
                              isActive={scene.id === currentSceneId}
                              isSelected={selectedScenes.has(scene.id)}
                              selectedCount={selectedScenes.size}
                              navigateToScene={navigateToScene}
                              formatSceneHeading={formatSceneHeading}
                              onSelect={handleSceneSelect}
                              onRename={handleSceneRename}
                              onAddShot={onAddShotToScene}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                        {activeScene && act.scenes.some(s => s.id === activeScene.id) && (
                          <div className="bg-background rounded-lg shadow-2xl ring-2 ring-primary border border-border px-2.5 py-2 text-xs font-medium flex items-center gap-2">
                            {formatSceneHeading(activeScene)}
                            {selectedScenes.size > 1 && selectedScenes.has(activeScene.id) && (
                              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                +{selectedScenes.size - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </DragOverlay>
                    </DndContext>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
