/**
 * Group Rendering Factory
 *
 * Renders tapestry groups with collapsible card stack animation.
 * Handles both expanded and collapsed states with spring physics.
 */

import type { Selection } from 'd3-selection';
import type { DragBehavior } from 'd3-drag';
import type { TapestryGroup, TapestryState } from '@/types/tapestry';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '@/types/tapestry';
import type { CardPhysicsState, GroupPhysicsState } from '@/hooks/tapestry/use-tapestry-physics';
import {
  generateScatterOffsets,
  lerp,
  renderGroupContainer,
  renderGroupHeader,
  renderStackedCard,
} from '../renderers';

interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  nodeCount: number;
}

interface TapestryLookups {
  nodesByGroupId: Map<string, any[]>;
}

interface RenderGroupsOptions {
  groups: TapestryGroup[];
  groupsGroup: Selection<SVGGElement, unknown, null, undefined>;
  groupDrag: DragBehavior<SVGGElement, TapestryGroup, TapestryGroup | d3.SubjectPosition>;
  lookups: TapestryLookups;
  groupBoundsMap: Map<string, GroupBounds>;
  physicsRef: React.MutableRefObject<Map<string, GroupPhysicsState>>;
  getRadius: (base: number) => number;
  animateCollapse: (groupId: string, collapse: boolean) => void;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (state: TapestryState) => void;
  setContextMenu: (menu: { x: number; y: number; nodeId?: string; groupId?: string } | null) => void;
}

const GROUP_HEADER_HEIGHT = 32;

/**
 * Renders all groups with their visual representation (expanded or collapsed).
 */
export function renderGroups({
  groups,
  groupsGroup,
  groupDrag,
  lookups,
  groupBoundsMap,
  physicsRef,
  getRadius,
  animateCollapse,
  setState,
  saveState,
  setContextMenu,
}: RenderGroupsOptions): void {
  groups.forEach(group => {
    const isCollapsed = group.collapsed || false;
    const isAnimating = group.collapseProgress !== undefined;
    // Progress: 0 = fully expanded, 1 = fully collapsed
    const progress = group.collapseProgress ?? (isCollapsed ? 1 : 0);

    // Dynamic resize: use pre-computed bounds (O(1) lookup instead of O(N) calculation)
    const childNodes = lookups.nodesByGroupId.get(group.id) || [];
    const bounds = groupBoundsMap.get(group.id);
    let dynamicWidth = group.width;
    let dynamicHeight = group.height;

    if (bounds && bounds.nodeCount > 0) {
      dynamicWidth = bounds.width;
      dynamicHeight = bounds.height;

      // Update group position to be relative to child bounds
      group.x = bounds.x;
      group.y = bounds.y;
    }

    // Collapsed mode: card stack matching node size, Expanded: full container
    const stackCardWidth = DEFAULT_NOTE_WIDTH;
    const stackCardHeight = DEFAULT_NOTE_HEIGHT;
    const maxStackCards = Math.min(childNodes.length, 5);

    // Scattered offsets for messy stack look (seeded by group id for consistent randomness)
    const scatterOffsets = generateScatterOffsets(group.id, maxStackCards);

    const collapsedWidth = stackCardWidth + 30;
    const collapsedHeight = stackCardHeight + 30;

    // Interpolate dimensions during animation: progress 0 = expanded, 1 = collapsed
    const displayWidth = lerp(dynamicWidth, collapsedWidth, progress);
    const displayHeight = lerp(dynamicHeight, collapsedHeight, progress);

    const groupG = groupsGroup.append('g')
      .datum(group)
      .attr('class', 'tapestry-group')
      .attr('data-group-id', group.id)
      .attr('transform', `translate(${group.x}, ${group.y})`)
      .attr('cursor', 'grab')
      .call(groupDrag);

    const childCount = childNodes.length;

    // Initialize spring physics state for collapsed/animating groups
    if (isCollapsed || isAnimating) {
      const cardPhysicsStates: CardPhysicsState[] = [];
      for (let cardIdx = 0; cardIdx < maxStackCards; cardIdx++) {
        const scatter = scatterOffsets[maxStackCards - 1 - cardIdx] || { x: 10, y: 10, rot: 0 };
        cardPhysicsStates.push({
          x: scatter.x, y: scatter.y, rot: scatter.rot,
          vx: 0, vy: 0, vrot: 0,
          tx: scatter.x, ty: scatter.y, trot: scatter.rot,
        });
      }
      physicsRef.current.set(group.id, {
        cards: cardPhysicsStates,
        isDragging: false,
        dragVelocity: { x: 0, y: 0 },
      });
    }

    // Container background - transitions from dashed (expanded) to solid (collapsed)
    renderGroupContainer({
      groupG,
      group,
      displayWidth,
      displayHeight,
      progress,
      getRadius,
    });

    // Header bar - fades out as we collapse (only visible when mostly expanded)
    renderGroupHeader({
      groupG,
      group,
      displayWidth,
      headerHeight: GROUP_HEADER_HEIGHT,
      progress,
    });

    // Render child nodes as cards at interpolated positions
    // When collapsed or animating, render cards that transition between positions
    if (isAnimating || isCollapsed) {
      const cardsToRender = Math.min(childNodes.length, maxStackCards);

      // Render cards back to front (so front card is on top)
      for (let i = cardsToRender - 1; i >= 0; i--) {
        renderStackedCard({
          groupG: groupG as any,
          node: childNodes[i],
          cardIndex: i,
          totalCards: childCount,
          group,
          progress,
          scatterOffsets,
          stackCardWidth,
          stackCardHeight,
          getRadius,
          onExpandClick: () => animateCollapse(group.id, false),
        });
      }
    }

    // Double-click to edit group title
    groupG.on('dblclick', (event) => {
      event.stopPropagation();
      const newTitle = window.prompt('Group title:', group.title);
      if (newTitle && newTitle !== group.title) {
        setState(prev => {
          const newState = {
            ...prev,
            groups: prev.groups.map(g => g.id === group.id ? { ...g, title: newTitle } : g),
          };
          saveState(newState);
          return newState;
        });
      }
    });

    // Right-click context menu for groups
    groupG.on('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        groupId: group.id,
      });
    });
  });
}
