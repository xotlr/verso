'use client';

/**
 * GroupRenderer - Renders group backgrounds and headers
 *
 * Features:
 * - Colored background with label
 * - Collapse/expand toggle with animation
 * - Draggable header
 * - Stacked card preview with physics when collapsed
 */

import { memo, useCallback, useRef, useMemo } from 'react';
import type { TapestryGroup, TapestryNode } from '@/types/tapestry';
import type { Viewport } from '@/lib/tapestry/virtualization';
import { computeGroupBounds, type GroupBounds } from '@/lib/tapestry/bounds';
import { useTapestryContext } from '../state/TapestryContext';
import { useDragGroup } from '../hooks/useDragGroup';
import type { CardTransform } from '../hooks/useGroupPhysics';

// ============================================================================
// Types
// ============================================================================

export interface GroupRendererProps {
  /** All groups */
  groups: TapestryGroup[];
  /** All nodes (for computing bounds and child relationships) */
  nodes: TapestryNode[];
  /** Current viewport */
  viewport: Viewport;
  /** Selected group IDs */
  selectedGroupIds: Set<string>;
  /** Callback when group is clicked */
  onGroupClick?: (groupId: string) => void;
  /** Callback when collapse toggle is clicked */
  onToggleCollapse?: (groupId: string) => void;
  /** Callback when group drag ends */
  onGroupDragEnd?: (
    groupId: string,
    position: { x: number; y: number },
    childUpdates: Array<{ id: string; x: number; y: number }>
  ) => void;
  /** Callback when group is deleted */
  onGroupDelete?: (groupId: string) => void;
  /** Callback when group drag starts (for physics) */
  onGroupDragStart?: (groupId: string) => void;
  /** Callback during group drag (for physics) */
  onGroupDragMove?: (groupId: string, dx: number, dy: number) => void;
  /** Get card transforms for a collapsed group (from physics hook) */
  getCardTransforms?: (groupId: string) => CardTransform[];
  /** Get collapse animation progress (from animation hook) */
  getCollapseProgress?: (groupId: string) => number | undefined;
}

// ============================================================================
// Constants
// ============================================================================

const HEADER_HEIGHT = 32;
const BORDER_RADIUS = 8;
const COLLAPSED_HEIGHT = 140;
const CARD_WIDTH = 140;
const CARD_HEIGHT = 80;
const CARD_HEADER_HEIGHT = 20;
const MAX_VISIBLE_CARDS = 5;

// ============================================================================
// Single Group Component
// ============================================================================

interface GroupItemProps {
  group: TapestryGroup;
  bounds: GroupBounds;
  nodes: TapestryNode[];
  isSelected: boolean;
  onToggleCollapse?: (groupId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onGroupDragStart?: (groupId: string) => void;
  onGroupDragMove?: (groupId: string, dx: number, dy: number) => void;
  onGroupDragEnd?: (
    groupId: string,
    position: { x: number; y: number },
    childUpdates: Array<{ id: string; x: number; y: number }>
  ) => void;
  cardTransforms?: CardTransform[];
  collapseProgress?: number;
}

const GroupItem = memo(function GroupItem({
  group,
  bounds,
  nodes,
  isSelected,
  onToggleCollapse,
  onGroupClick,
  onGroupDragStart,
  onGroupDragMove,
  onGroupDragEnd,
  cardTransforms,
  collapseProgress,
}: GroupItemProps) {
  const groupRef = useRef<SVGGElement>(null);
  const { transformRef, setIsDragging } = useTapestryContext();

  // Get child nodes for this group
  const childNodes = useMemo(
    () => nodes.filter(n => n.groupId === group.id),
    [nodes, group.id]
  );

  // Determine if we're animating or in final collapsed state
  const isAnimating = collapseProgress !== undefined;
  const effectiveCollapsed = isAnimating
    ? collapseProgress > 0.5  // During animation, show collapsed view after halfway
    : group.collapsed;

  // Use computed bounds or group dimensions
  const expandedWidth = bounds.nodeCount > 0 ? bounds.width : group.width;
  const expandedHeight = bounds.nodeCount > 0 ? bounds.height : group.height;

  // Interpolate dimensions during animation
  const animProgress = collapseProgress ?? (group.collapsed ? 1 : 0);
  const width = expandedWidth; // Width stays same
  const height = expandedHeight + (COLLAPSED_HEIGHT - expandedHeight) * animProgress;

  const x = bounds.nodeCount > 0 ? bounds.x : group.x;
  const y = bounds.nodeCount > 0 ? bounds.y : group.y;

  // Drag handling with physics integration
  const { dragProps } = useDragGroup({
    group: { ...group, x, y },
    groupRef,
    transformRef,
    nodes,
    onDragStart: () => {
      setIsDragging(true);
      onGroupDragStart?.(group.id);
    },
    onDragMove: (_groupId, dx, dy) => {
      onGroupDragMove?.(group.id, dx, dy);
    },
    onDragEnd: (groupId, position, childUpdates) => {
      setIsDragging(false);
      onGroupDragEnd?.(groupId, position, childUpdates);
    },
  });

  // Handle collapse toggle
  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse?.(group.id);
    },
    [group.id, onToggleCollapse]
  );

  // Handle group click
  const handleClick = useCallback(() => {
    onGroupClick?.(group.id);
  }, [group.id, onGroupClick]);

  // Parse color for lighter fill
  const fillOpacity = 0.1;

  // Card count for stack display
  const cardCount = Math.min(childNodes.length, MAX_VISIBLE_CARDS);

  // Use physics transforms if available, otherwise generate static positions
  const stackTransforms = cardTransforms && cardTransforms.length > 0
    ? cardTransforms
    : Array.from({ length: cardCount }, (_, i) => ({
        x: i * 4,
        y: i * 3,
        rot: (i - cardCount / 2) * 2,
      }));

  return (
    <g
      ref={groupRef}
      className={`tapestry-group ${effectiveCollapsed ? 'collapsed' : ''} ${isSelected ? 'selected' : ''}`}
      data-group-id={group.id}
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
    >
      {/* Background */}
      <rect
        className="group-body"
        x={0}
        y={0}
        width={width}
        height={height}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill={group.color}
        fillOpacity={fillOpacity}
        stroke={group.color}
        strokeWidth={isSelected ? 2 : 1}
        strokeOpacity={0.5}
      />

      {/* Header bar */}
      <rect
        className="group-header"
        x={0}
        y={0}
        width={width}
        height={HEADER_HEIGHT}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill={group.color}
        fillOpacity={0.3}
        {...dragProps}
      />
      {/* Square off bottom corners of header */}
      <rect
        x={0}
        y={HEADER_HEIGHT - BORDER_RADIUS}
        width={width}
        height={BORDER_RADIUS}
        fill={group.color}
        fillOpacity={0.3}
        style={{ pointerEvents: 'none' }}
      />

      {/* Collapse toggle */}
      <g
        className="collapse-toggle"
        transform={`translate(12, ${HEADER_HEIGHT / 2})`}
        onClick={handleToggleClick}
        style={{ cursor: 'pointer' }}
      >
        <circle r={10} fill="transparent" />
        <path
          d={effectiveCollapsed ? 'M -4 -2 L 0 2 L 4 -2' : 'M -4 2 L 0 -2 L 4 2'}
          fill="none"
          stroke={group.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: isAnimating ? 'none' : 'd 0.2s ease-out',
          }}
        />
      </g>

      {/* Title */}
      <text
        x={32}
        y={HEADER_HEIGHT / 2 + 5}
        fill={group.color}
        fontSize={14}
        fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {group.title}
        {bounds.nodeCount > 0 && (
          <tspan fill={group.color} fillOpacity={0.7} fontSize={12}>
            {' '}({bounds.nodeCount})
          </tspan>
        )}
      </text>

      {/* Stacked cards with physics when collapsed - looks like actual scene nodes */}
      {(effectiveCollapsed || isAnimating) && childNodes.length > 0 && (
        <g
          className="stacked-cards"
          transform={`translate(${width / 2 - CARD_WIDTH / 2}, ${HEADER_HEIGHT + 12})`}
          style={{
            opacity: isAnimating ? animProgress : 1,
            transition: isAnimating ? 'none' : 'opacity 0.2s ease-out',
          }}
        >
          {stackTransforms.slice(0, cardCount).map((transform, i) => {
            const node = childNodes[i];
            const nodeColor = node?.color || group.color;

            return (
              <g
                key={i}
                className="stacked-card"
                transform={`translate(${transform.x}, ${transform.y}) rotate(${transform.rot}, ${CARD_WIDTH / 2}, ${CARD_HEIGHT / 2})`}
                style={{
                  filter: `drop-shadow(0 ${2 + i}px ${4 + i * 2}px rgba(0,0,0,0.15))`,
                }}
              >
                {/* Card body */}
                <rect
                  x={0}
                  y={0}
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  rx={6}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                {/* Colored header stripe */}
                <rect
                  x={0}
                  y={0}
                  width={CARD_WIDTH}
                  height={CARD_HEADER_HEIGHT}
                  rx={6}
                  fill={nodeColor}
                  fillOpacity={0.9}
                />
                {/* Square off bottom corners of header */}
                <rect
                  x={0}
                  y={CARD_HEADER_HEIGHT - 6}
                  width={CARD_WIDTH}
                  height={6}
                  fill={nodeColor}
                  fillOpacity={0.9}
                />
                {/* Scene title in header */}
                {node && (
                  <text
                    x={8}
                    y={CARD_HEADER_HEIGHT - 5}
                    fontSize={11}
                    fontWeight={600}
                    fill="white"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.title || `Scene ${node.sceneNumber || ''}`}
                  </text>
                )}
                {/* Content preview */}
                {node && (
                  <text
                    x={8}
                    y={CARD_HEADER_HEIGHT + 16}
                    fontSize={10}
                    fill="hsl(var(--muted-foreground))"
                    style={{ pointerEvents: 'none' }}
                  >
                    <tspan x={8} dy={0}>
                      {(node.content || '').slice(0, 20)}
                    </tspan>
                    <tspan x={8} dy={12}>
                      {(node.content || '').slice(20, 40)}
                    </tspan>
                  </text>
                )}
              </g>
            );
          })}
          {/* Show count badge if more cards than visible */}
          {childNodes.length > MAX_VISIBLE_CARDS && (
            <g transform={`translate(${CARD_WIDTH + 12}, ${CARD_HEIGHT / 2 - 12})`}>
              <rect
                x={0}
                y={0}
                width={32}
                height={24}
                rx={12}
                fill={group.color}
              />
              <text
                x={16}
                y={16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="white"
                style={{ pointerEvents: 'none' }}
              >
                +{childNodes.length - MAX_VISIBLE_CARDS}
              </text>
            </g>
          )}
        </g>
      )}

      {/* Selection ring */}
      {isSelected && (
        <rect
          x={-2}
          y={-2}
          width={width + 4}
          height={height + 4}
          rx={BORDER_RADIUS + 2}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
      )}
    </g>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const GroupRenderer = memo(function GroupRenderer({
  groups,
  nodes,
  viewport,
  selectedGroupIds,
  onGroupClick,
  onToggleCollapse,
  onGroupDragEnd,
  onGroupDelete,
  onGroupDragStart,
  onGroupDragMove,
  getCardTransforms,
  getCollapseProgress,
}: GroupRendererProps) {
  // Compute bounds for all groups
  const groupBounds = useMemo(
    () => computeGroupBounds(nodes, groups),
    [nodes, groups]
  );

  // Filter to visible groups (simple viewport check)
  const visibleGroups = useMemo(() => {
    return groups.filter(group => {
      const bounds = groupBounds.get(group.id);
      if (!bounds) return true; // Show groups without bounds

      const gx = bounds.nodeCount > 0 ? bounds.x : group.x;
      const gy = bounds.nodeCount > 0 ? bounds.y : group.y;
      const gw = bounds.nodeCount > 0 ? bounds.width : group.width;
      const gh = bounds.nodeCount > 0 ? bounds.height : group.height;

      // AABB intersection with viewport
      const padding = 100;
      return (
        gx < viewport.x + viewport.width + padding &&
        gx + gw > viewport.x - padding &&
        gy < viewport.y + viewport.height + padding &&
        gy + gh > viewport.y - padding
      );
    });
  }, [groups, groupBounds, viewport]);

  return (
    <g className="groups-layer">
      {visibleGroups.map(group => {
        const bounds = groupBounds.get(group.id) || {
          x: group.x,
          y: group.y,
          width: group.width,
          height: group.height,
          nodeCount: 0,
        };

        return (
          <GroupItem
            key={group.id}
            group={group}
            bounds={bounds}
            nodes={nodes}
            isSelected={selectedGroupIds.has(group.id)}
            onToggleCollapse={onToggleCollapse}
            onGroupClick={onGroupClick}
            onGroupDragStart={onGroupDragStart}
            onGroupDragMove={onGroupDragMove}
            onGroupDragEnd={onGroupDragEnd}
            cardTransforms={getCardTransforms?.(group.id)}
            collapseProgress={getCollapseProgress?.(group.id)}
          />
        );
      })}
    </g>
  );
});

GroupRenderer.displayName = 'GroupRenderer';
