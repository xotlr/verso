'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Film,
  ChevronDown,
  ChevronUp,
  Clapperboard,
} from 'lucide-react';
import type { SceneInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';

interface Act {
  id: string;
  name: string;
  scenes: SceneInfo[];
}

interface ReadOnlyScenesPanelProps {
  scenes: SceneInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  className?: string;
}

interface SceneItemProps {
  scene: SceneInfo;
  sceneIndex: number;
  isActive?: boolean;
  navigateToScene: (scene: SceneInfo) => void;
  formatSceneHeading: (scene: SceneInfo) => string;
}

function SceneItem({
  scene,
  sceneIndex,
  isActive,
  navigateToScene,
  formatSceneHeading,
}: SceneItemProps) {
  const itemRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to active scene
  React.useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  return (
    <div
      ref={itemRef}
      className={cn(
        'group rounded-lg cursor-pointer',
        'transition-all duration-150',
        isActive
          ? 'bg-primary/10 border-l-2 border-primary shadow-sm'
          : 'hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-sm'
      )}
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
      <div className="w-full flex items-start gap-2 px-2.5 py-2 text-left">
        {/* Scene number */}
        <span className="w-6 font-mono text-[10px] font-medium text-muted-foreground shrink-0 pt-0.5 tabular-nums">
          {scene.sceneNumber || `${sceneIndex + 1}`}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs break-words">
            {formatSceneHeading(scene)}
          </div>
          {scene.timeOfDay && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {scene.timeOfDay}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only scenes panel for public viewers.
 * Navigation only, no editing actions.
 */
export function ReadOnlyScenesPanel({
  scenes,
  view,
  currentSceneId,
  className,
}: ReadOnlyScenesPanelProps) {
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(['act-1']));

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
    }
  }, [view]);

  const formatSceneHeading = useCallback((scene: SceneInfo) => {
    const type = scene.type || 'INT';
    const location = scene.location || 'UNKNOWN';
    return `${type}. ${location}`;
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Scenes</span>
          <span className="text-xs text-muted-foreground">({scenes.length})</span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {acts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Film className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No scenes yet</p>
              <p className="text-xs mt-1">
                This screenplay doesn&apos;t have any scenes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {acts.map((act) => (
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

                  {/* Scenes list */}
                  {expandedActs.has(act.id) && (
                    <div className="mt-0.5 space-y-0.5">
                      {act.scenes.map((scene) => (
                        <SceneItem
                          key={scene.id}
                          scene={scene}
                          sceneIndex={scenes.indexOf(scene)}
                          isActive={scene.id === currentSceneId}
                          navigateToScene={navigateToScene}
                          formatSceneHeading={formatSceneHeading}
                        />
                      ))}
                    </div>
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
