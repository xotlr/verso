'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Film,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Search,
  X,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  GripVertical,
  Building,
  TreePine,
  Building2,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  RotateCw,
  Camera,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SceneInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { FilterPill } from '@/components/ui/list-page-toolbar';
import { Badge } from '@/components/ui/badge';

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface ScenesPanelProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  onAddScene?: () => void;
  onAddShotToScene?: (sceneId: string) => void;
  className?: string;
}

// Sortable scene item component
interface SortableSceneItemProps {
  scene: SceneInfo;
  sceneIndex: number;
  isActive?: boolean;
  navigateToScene: (scene: SceneInfo) => void;
  formatSceneHeading: (scene: SceneInfo) => string;
  onAddShot?: (sceneId: string) => void;
}

function SortableSceneItem({
  scene,
  sceneIndex,
  isActive,
  navigateToScene,
  formatSceneHeading,
  onAddShot,
}: SortableSceneItemProps) {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  // Auto-scroll to active scene
  React.useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // Combine refs
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div
      ref={combinedRef}
      style={style}
      className={cn(
        'group rounded-lg',
        'transition-all duration-150',
        isActive
          ? 'bg-primary/10 border-l-2 border-primary shadow-sm'
          : 'hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-sm',
        isDragging && 'bg-accent shadow-lg'
      )}
    >
      <div
        className="w-full flex items-start gap-1.5 px-2.5 py-2 text-left cursor-pointer"
        onClick={() => navigateToScene(scene)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToScene(scene);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 pt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Scene number */}
        <span className="w-6 font-mono text-[10px] font-medium text-muted-foreground shrink-0 pt-0.5 tabular-nums">
          {scene.sceneNumber || `${sceneIndex + 1}`}
        </span>

        {/* Content - stacked, wrapping enabled */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs break-words">
            {formatSceneHeading(scene)}
          </div>
        </div>

        {/* Actions - stop propagation to prevent navigation */}
        <div
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {onAddShot && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAddShot(scene.id)}
              title="Add shot to this scene"
            >
              <Camera className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigateToScene(scene)}>
                <Film className="h-3.5 w-3.5 mr-2" />
                Go to scene
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
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
  onAddScene,
  onAddShotToScene,
  className,
}: ScenesPanelProps) {
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(['act-1']));
  const [searchQuery, setSearchQuery] = useState('');
  const [sceneTypeFilters, setSceneTypeFilters] = useState<Set<string>>(new Set());
  const [timeOfDayFilters, setTimeOfDayFilters] = useState<Set<string>>(new Set());

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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const hasFilters = searchQuery || sceneTypeFilters.size > 0 || timeOfDayFilters.size > 0;
    if (!hasFilters) return acts;

    return acts.map(act => ({
      ...act,
      scenes: act.scenes.filter(scene => {
        // Search filter
        const matchesSearch = !searchQuery ||
          scene.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scene.type.toLowerCase().includes(searchQuery.toLowerCase());

        // Scene type filter
        const matchesType = sceneTypeFilters.size === 0 ||
          sceneTypeFilters.has(scene.type.toUpperCase());

        // Time of day filter
        const matchesToD = timeOfDayFilters.size === 0 ||
          timeOfDayFilters.has(scene.timeOfDay?.toUpperCase() || 'DAY');

        return matchesSearch && matchesType && matchesToD;
      }),
    })).filter(act => act.scenes.length > 0);
  }, [acts, searchQuery, sceneTypeFilters, timeOfDayFilters]);

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

  // Handle drag end - log reorder for now (document reordering is a separate feature)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Find the scenes in the current order
      const oldIndex = scenes.findIndex(s => s.id === active.id);
      const newIndex = scenes.findIndex(s => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // TODO: Implement actual document reordering via ProseMirror transaction
        // This would involve moving scene_heading nodes and their associated content
        console.log('Scene reorder requested:', { from: oldIndex, to: newIndex });
      }
    }
  }, [scenes]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <h2 className="font-semibold text-sm">Scenes</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {scenes.length}
        </span>
        {onAddScene && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddScene}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      {scenes.length > 5 && (
        <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search scenes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

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
      <ScrollArea className="flex-1">
        <div className="p-3">
          {filteredActs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-xs">
                {activeFilterCount > 0 ? 'No matching scenes' : 'No scenes yet'}
              </p>
              <p className="text-[10px] mt-1">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters or search term'
                  : 'Start writing to see your story structure.'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-[10px] text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActs.map((act) => (
                <div key={act.id}>
                  {/* Act header */}
                  <button
                    onClick={() => toggleAct(act.id)}
                    className={cn(
                      'w-full flex items-center justify-between',
                      'px-2.5 py-2 rounded-lg',
                      'text-xs font-medium',
                      'hover:bg-accent/50',
                      'transition-colors'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clapperboard className="h-3.5 w-3.5 text-muted-foreground" />
                      {act.name}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({act.scenes.length})
                      </span>
                    </span>
                    {expandedActs.has(act.id) ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Scenes list with drag & drop */}
                  {expandedActs.has(act.id) && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
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
                              navigateToScene={navigateToScene}
                              formatSceneHeading={formatSceneHeading}
                              onAddShot={onAddShotToScene}
                            />
                          ))}
                        </div>
                      </SortableContext>
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
