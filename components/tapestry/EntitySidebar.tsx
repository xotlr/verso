'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { SidebarEntity, HighlightState } from '@/lib/tapestry/types';

interface EntitySidebarProps {
  characters: SidebarEntity[];
  locations: SidebarEntity[];
  highlightState: HighlightState;
  onEntityHover: (nodeId: string | null) => void;
  onEntityClick: (nodeId: string) => void;
  sidebarWidth: number;
  paddingLeft: number;
}

/**
 * Entity sidebar component for the Tapestry visualization.
 * Displays characters and locations in a fixed sidebar on the left.
 * Rendered as HTML overlay (not SVG) for better text rendering and interactions.
 */
export function EntitySidebar({
  characters,
  locations,
  highlightState,
  onEntityHover,
  onEntityClick,
  sidebarWidth,
  paddingLeft,
}: EntitySidebarProps) {
  const isEntityHighlighted = useCallback((nodeId: string) => {
    return (
      highlightState.hoveredCharacterId === nodeId ||
      highlightState.lockedCharacterId === nodeId
    );
  }, [highlightState]);

  const isAnyHighlighted = !!(
    highlightState.hoveredCharacterId ||
    highlightState.hoveredSceneId ||
    highlightState.lockedCharacterId ||
    highlightState.lockedSceneId
  );

  return (
    <div
      className="absolute top-0 left-0 h-full pointer-events-none z-10"
      style={{ width: sidebarWidth + paddingLeft }}
    >
      <div
        className="h-full overflow-y-auto pointer-events-auto"
        style={{ paddingLeft, paddingTop: 40 }}
      >
        {/* Characters Section */}
        {characters.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Characters
            </div>
            <div className="space-y-1">
              {characters.map(entity => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  isHighlighted={isEntityHighlighted(entity.nodeId)}
                  isDimmed={isAnyHighlighted && !isEntityHighlighted(entity.nodeId)}
                  onHover={onEntityHover}
                  onClick={onEntityClick}
                  sidebarWidth={sidebarWidth}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locations Section */}
        {locations.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Locations
            </div>
            <div className="space-y-1">
              {locations.map(entity => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  isHighlighted={isEntityHighlighted(entity.nodeId)}
                  isDimmed={isAnyHighlighted && !isEntityHighlighted(entity.nodeId)}
                  onHover={onEntityHover}
                  onClick={onEntityClick}
                  sidebarWidth={sidebarWidth}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EntityCardProps {
  entity: SidebarEntity;
  isHighlighted: boolean;
  isDimmed: boolean;
  onHover: (nodeId: string | null) => void;
  onClick: (nodeId: string) => void;
  sidebarWidth: number;
}

function EntityCard({
  entity,
  isHighlighted,
  isDimmed,
  onHover,
  onClick,
  sidebarWidth,
}: EntityCardProps) {
  const handleMouseEnter = useCallback(() => {
    onHover(entity.nodeId);
  }, [entity.nodeId, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onClick(entity.nodeId);
  }, [entity.nodeId, onClick]);

  // Get initials for avatar
  const initials = entity.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200',
        isHighlighted && 'bg-accent/20',
        isDimmed && 'opacity-30',
        !isHighlighted && !isDimmed && 'hover:bg-accent/10'
      )}
      style={{
        width: sidebarWidth - 8,
        boxShadow: isHighlighted ? `0 0 12px 2px ${entity.color}40` : undefined,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white transition-all',
          isHighlighted && 'ring-2 ring-white/50'
        )}
        style={{ backgroundColor: entity.color }}
      >
        {initials}
      </div>

      {/* Name and stats */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {entity.name}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {entity.type === 'character' && entity.dialogueCount > 0 && (
            <span className="flex items-center gap-0.5">
              <DialogueIcon className="w-3 h-3" />
              {entity.dialogueCount}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <SceneIcon className="w-3 h-3" />
            {entity.connectionCount}
          </span>
        </div>
      </div>

      {/* Connection indicator */}
      <div
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all',
          isHighlighted ? 'scale-150' : 'scale-100'
        )}
        style={{ backgroundColor: entity.color }}
      />
    </div>
  );
}

// Simple icons
function DialogueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 1 0 4.95 11.95l2.12.7a.5.5 0 0 0 .63-.63l-.7-2.12A7 7 0 0 0 8 1Z" />
    </svg>
  );
}

function SceneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Zm2 1v8h8V4H4Z" />
    </svg>
  );
}
