'use client';

import { useCallback, useMemo, memo, type KeyboardEvent } from 'react';
import { cn, getInitials } from '@/lib/utils';
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
    <nav
      className="absolute top-0 left-0 h-full pointer-events-none z-10"
      style={{ width: sidebarWidth + paddingLeft }}
      aria-label="Tapestry entities"
    >
      <div
        className="h-full overflow-y-auto pointer-events-auto"
        style={{ paddingLeft, paddingTop: 40 }}
      >
        {/* Characters Section */}
        {characters.length > 0 && (
          <section className="mb-4" aria-label="Characters">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Characters
            </h3>
            <ul className="space-y-1" role="listbox" aria-label={`${characters.length} characters`}>
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
            </ul>
          </section>
        )}

        {/* Locations Section */}
        {locations.length > 0 && (
          <section aria-label="Locations">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Locations
            </h3>
            <ul className="space-y-1" role="listbox" aria-label={`${locations.length} locations`}>
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
            </ul>
          </section>
        )}
      </div>
    </nav>
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

// Memoized EntityCard prevents unnecessary re-renders when parent updates
const EntityCard = memo(function EntityCard({
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

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(entity.nodeId);
    }
  }, [entity.nodeId, onClick]);

  const handleFocus = useCallback(() => {
    onHover(entity.nodeId);
  }, [entity.nodeId, onHover]);

  const handleBlur = useCallback(() => {
    onHover(null);
  }, [onHover]);

  // Get initials for avatar - memoized
  const initials = useMemo(() => getInitials(entity.name), [entity.name]);

  // Build accessible label with entity info
  const ariaLabel = entity.type === 'character'
    ? `${entity.name}, ${entity.dialogueCount} lines, ${entity.connectionCount} scenes`
    : `${entity.name}, ${entity.connectionCount} scenes`;

  return (
    <li
      role="option"
      tabIndex={0}
      aria-selected={isHighlighted}
      aria-label={ariaLabel}
      className={cn(
        'group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
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
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white transition-all',
          isHighlighted && 'ring-2 ring-white/50'
        )}
        style={{ backgroundColor: entity.color }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Name and stats */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {entity.name}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden="true">
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
        aria-hidden="true"
      />
    </li>
  );
});

// Simple icons with accessibility
function DialogueIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      role="img"
    >
      <path d="M8 1a7 7 0 1 0 4.95 11.95l2.12.7a.5.5 0 0 0 .63-.63l-.7-2.12A7 7 0 0 0 8 1Z" />
    </svg>
  );
}

function SceneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      role="img"
    >
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Zm2 1v8h8V4H4Z" />
    </svg>
  );
}
