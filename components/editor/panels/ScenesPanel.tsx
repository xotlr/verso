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
  GripVertical,
  Search,
  X,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SceneInfo } from '@/hooks/editor/useProseMirrorEditor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface ScenesPanelProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  onAddScene?: () => void;
  className?: string;
}

/**
 * Scenes panel showing hierarchical act/scene structure with navigation.
 */
export function ScenesPanel({
  scenes,
  view,
  onAddScene,
  className,
}: ScenesPanelProps) {
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(['act-1']));
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter scenes by search query
  const filteredActs = useMemo(() => {
    if (!searchQuery) return acts;

    return acts.map(act => ({
      ...act,
      scenes: act.scenes.filter(scene =>
        scene.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scene.type.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter(act => act.scenes.length > 0);
  }, [acts, searchQuery]);

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

  const formatSceneHeading = (scene: SceneInfo) => {
    const type = scene.type || 'INT';
    const location = scene.location || 'UNKNOWN';
    return `${type}. ${location}`;
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Scenes</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {scenes.length}
        </span>
        {onAddScene && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddScene}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Search */}
      {scenes.length > 5 && (
        <div className="px-3 py-2 border-b border-border">
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
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {filteredActs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Film className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">
                {searchQuery ? 'No matching scenes' : 'No scenes yet'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start writing to see your story structure.'}
              </p>
            </div>
          ) : (
            filteredActs.map((act) => (
              <div key={act.id} className="mb-2">
                {/* Act header */}
                <button
                  onClick={() => toggleAct(act.id)}
                  className={cn(
                    'w-full flex items-center justify-between',
                    'px-2 py-2 rounded-lg',
                    'text-xs font-medium',
                    'hover:bg-accent',
                    'transition-colors'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Clapperboard className="h-3.5 w-3.5 text-muted-foreground" />
                    {act.name}
                    <span className="text-muted-foreground">
                      ({act.scenes.length})
                    </span>
                  </span>
                  {expandedActs.has(act.id) ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                {/* Scenes list */}
                {expandedActs.has(act.id) && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    {act.scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={cn(
                          'w-full flex items-center gap-2',
                          'pl-3 pr-1 py-1.5 rounded-lg',
                          'text-left text-xs',
                          'hover:bg-accent',
                          'transition-colors',
                          'group'
                        )}
                      >
                        <button
                          onClick={() => navigateToScene(scene)}
                          className="flex-1 flex items-center gap-2 min-w-0"
                        >
                          <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                          <span className="w-5 font-mono text-muted-foreground text-[10px] shrink-0">
                            {scene.sceneNumber || `${scenes.indexOf(scene) + 1}`}
                          </span>
                          <span className="flex-1 truncate">
                            {formatSceneHeading(scene)}
                          </span>
                          {scene.timeOfDay && (
                            <span className="text-[10px] text-muted-foreground/60 uppercase shrink-0">
                              {scene.timeOfDay.slice(0, 3)}
                            </span>
                          )}
                        </button>

                        {/* Scene actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
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
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
