'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/ui/sidebar';
import {
  ChevronDown,
  ChevronUp,
  Film,
  Clapperboard,
  Plus,
  GripVertical,
  X,
} from 'lucide-react';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface StoryArcSidebarProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Floating overlay panel showing screenplay structure with Acts and Scenes.
 */
export function StoryArcSidebar({
  scenes,
  view,
  isOpen,
  onClose,
  className,
}: StoryArcSidebarProps) {
  const { isMobile } = useSidebar();

  // Calculate left position: sidebar width + gap
  // Sidebar is always 3.5rem (icon-only mode)
  const sidebarLeft = isMobile ? '0rem' : '3.5rem';

  // Group scenes into acts
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

  const [expandedActs, setExpandedActs] = useState<Set<string>>(
    new Set(acts.map(a => a.id))
  );

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
    onClose();
  }, [view, onClose]);

  const formatSceneHeading = (scene: SceneInfo) => {
    const type = scene.type || 'INT';
    const location = scene.location || 'UNKNOWN';
    return `${type}. ${location}`;
  };

  return (
    <div
      className={cn(
        'fixed top-14 bottom-0 z-30 w-72',
        'left-0 md:left-[var(--sidebar-left)]',
        'flex flex-col bg-card border border-border shadow-2xl rounded-r-lg',
        'transition-all duration-300 ease-in-out',
        isOpen
          ? 'translate-x-0 opacity-100'
          : '-translate-x-full opacity-0 pointer-events-none',
        className
      )}
      style={{
        '--sidebar-left': sidebarLeft,
      } as React.CSSProperties}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Scenes</h2>
            <span className="text-xs text-muted-foreground">
              ({scenes.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Acts and Scenes list */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {acts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No scenes yet.
                <br />
                <span className="text-xs">Start writing to see your story structure.</span>
              </div>
            ) : (
              acts.map((act) => (
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
                        <button
                          key={scene.id}
                          onClick={() => navigateToScene(scene)}
                          className={cn(
                            'w-full flex items-center gap-2',
                            'pl-3 pr-2 py-1.5 rounded-lg',
                            'text-left text-xs',
                            'hover:bg-accent',
                            'transition-colors',
                            'group'
                          )}
                        >
                          <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab" />
                          <span className="w-6 font-mono text-muted-foreground text-[10px]">
                            {scene.sceneNumber || `${scenes.indexOf(scene) + 1}`}
                          </span>
                          <span className="flex-1 truncate">
                            {formatSceneHeading(scene)}
                          </span>
                          {scene.timeOfDay && (
                            <span className="text-[10px] text-muted-foreground/60 uppercase">
                              {scene.timeOfDay.slice(0, 3)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2 h-8"
            onClick={() => {
              view?.focus();
              onClose();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Scene
          </Button>
        </div>
    </div>
  );
}
