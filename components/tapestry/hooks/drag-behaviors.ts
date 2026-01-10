/**
 * Tapestry Drag Behavior Factories
 *
 * Factory functions that create D3 drag behaviors for nodes and groups.
 * These are extracted from the main tapestry component for better organization.
 */

import { drag } from 'd3-drag';
import { select, type Selection } from 'd3-selection';
import type { TapestryNode, TapestryGroup, TapestryState } from '@/types/tapestry';
import {
  getNodeDimensions,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_GROUP_WIDTH,
  DEFAULT_GROUP_HEIGHT,
  GRID_MINOR_SPACING,
} from '@/types/tapestry';
import { calculateConnectionPath } from '../renderers';
import type { TapestryLookups } from '@/lib/tapestry/lookups';
import type { GroupBounds } from '@/lib/tapestry/bounds';

interface CreateNodeDragOptions {
  container: Selection<SVGGElement, unknown, null, undefined>;
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>;
  lookups: TapestryLookups;
  groupBoundsMap: Map<string, GroupBounds>;
  groups: TapestryGroup[];
  snapToGridRef: React.MutableRefObject<boolean>;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
}

/**
 * Creates drag behavior for tapestry nodes.
 * Handles real-time connection updates during drag and snap-to-grid on drop.
 */
export function createNodeDragBehavior({
  container,
  connectionsGroup,
  lookups,
  groupBoundsMap,
  groups,
  snapToGridRef,
  setState,
  saveState,
}: CreateNodeDragOptions) {
  return drag<SVGGElement, TapestryNode>()
    .touchable(() => true)
    .clickDistance(5)
    .container(function() {
      return container.node() as SVGGElement;
    })
    .subject(function(_event, d) {
      return { x: d.x, y: d.y };
    })
    .on('start', function(event) {
      event.sourceEvent?.stopPropagation();
      select(this).raise().attr('opacity', 0.95);
      select(this).attr('cursor', 'grabbing');
    })
    .on('drag', function(event, d) {
      d.x = event.x;
      d.y = event.y;
      select(this).attr('transform', `translate(${d.x}, ${d.y})`);

      // Update all connections involving this node in real-time
      const nodeConns = lookups.connectionsByNodeId.get(d.id) || [];

      nodeConns.forEach(conn => {
        const sourceNode = conn.sourceId === d.id ? d : lookups.nodeById.get(conn.sourceId);
        const targetNode = conn.targetId === d.id ? d : lookups.nodeById.get(conn.targetId);
        if (!sourceNode || !targetNode) return;

        const sourceDims = getNodeDimensions(sourceNode as TapestryNode);
        const targetDims = getNodeDimensions(targetNode as TapestryNode);

        const sourceX = sourceNode.x + sourceDims.width;
        const sourceY = sourceNode.y + sourceDims.height / 2;
        const targetX = targetNode.x;
        const targetY = targetNode.y + targetDims.height / 2;

        const pathD = calculateConnectionPath(sourceX, sourceY, targetX, targetY);
        connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
      });
    })
    .on('end', function(_event, d) {
      select(this).attr('opacity', 1).attr('cursor', 'grab');

      // Check if node was dropped into a group
      const nodeDims = getNodeDimensions(d);
      const nodeCenterX = d.x + nodeDims.width / 2;
      const nodeCenterY = d.y + nodeDims.height / 2;

      let newGroupId: string | undefined = undefined;

      for (const group of groups) {
        const bounds = groupBoundsMap.get(group.id);
        const groupX = bounds?.x ?? group.x ?? 0;
        const groupY = bounds?.y ?? group.y ?? 0;
        const groupWidth = bounds?.width ?? group.width ?? DEFAULT_GROUP_WIDTH;
        const groupHeight = bounds?.height ?? group.height ?? DEFAULT_GROUP_HEIGHT;

        if (nodeCenterX >= groupX && nodeCenterX <= groupX + groupWidth &&
            nodeCenterY >= groupY && nodeCenterY <= groupY + groupHeight) {
          newGroupId = group.id;
          break;
        }
      }

      // Apply snap-to-grid if enabled
      const snapValue = (v: number) => snapToGridRef.current
        ? Math.round(v / GRID_MINOR_SPACING) * GRID_MINOR_SPACING
        : v;
      const finalX = snapValue(d.x);
      const finalY = snapValue(d.y);

      setState(prev => {
        const newState = {
          ...prev,
          nodes: prev.nodes.map(n => n.id === d.id
            ? { ...n, x: finalX, y: finalY, groupId: newGroupId }
            : n
          ),
        };
        saveState(newState);
        return newState;
      });
    });
}

interface GroupPhysicsState {
  cards: Array<{
    x: number; y: number; rot: number;
    vx: number; vy: number; vrot: number;
    tx: number; ty: number; trot: number;
  }>;
  isDragging: boolean;
  dragVelocity: { x: number; y: number };
}

interface CreateGroupDragOptions {
  container: Selection<SVGGElement, unknown, null, undefined>;
  nodesGroup: Selection<SVGGElement, unknown, null, undefined>;
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>;
  lookups: TapestryLookups;
  physicsRef: React.MutableRefObject<Map<string, GroupPhysicsState>>;
  startPhysicsLoop: () => void;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (newState: TapestryState) => void;
}

/**
 * Creates drag behavior for groups (both collapsed and expanded).
 * Handles spring physics for collapsed groups and updates child node positions.
 */
export function createGroupDragBehavior({
  container,
  nodesGroup,
  connectionsGroup,
  lookups,
  physicsRef,
  startPhysicsLoop,
  setState,
  saveState,
}: CreateGroupDragOptions) {
  const collapsedStackWidth = DEFAULT_NOTE_WIDTH + 30;
  const collapsedStackHeight = DEFAULT_NOTE_HEIGHT + 30;

  return drag<SVGGElement, TapestryGroup>()
    .touchable(() => true)
    .clickDistance(5)
    .container(function() {
      return container.node() as SVGGElement;
    })
    .subject(function(_, d) {
      return { x: d.x, y: d.y };
    })
    .on('start', function(event, d) {
      event.sourceEvent?.stopPropagation();
      select(this).raise().attr('opacity', 0.9).classed('dragging', true);

      // Initialize spring physics for collapsed groups
      const physics = physicsRef.current.get(d.id);
      if (physics) {
        physics.isDragging = true;
        physics.dragVelocity = { x: 0, y: 0 };
        startPhysicsLoop();
      }
    })
    .on('drag', function(event, d) {
      const dx = event.x - d.x;
      const dy = event.y - d.y;
      d.x = event.x;
      d.y = event.y;
      select(this).attr('transform', `translate(${d.x}, ${d.y})`);

      // Update physics drag velocity (spring physics loop handles card transforms)
      const physics = physicsRef.current.get(d.id);
      if (physics) {
        physics.dragVelocity.x = physics.dragVelocity.x * 0.7 + dx * 0.3;
        physics.dragVelocity.y = physics.dragVelocity.y * 0.7 + dy * 0.3;
      }

      // Move child nodes visually during drag
      const childNodes = lookups.nodesByGroupId.get(d.id) || [];

      childNodes.forEach(node => {
        node.x += dx;
        node.y += dy;
        // Update the visual position of the node
        nodesGroup.select(`[data-node-id="${node.id}"]`)
          .attr('transform', `translate(${node.x}, ${node.y})`);
      });

      // Update connection paths for nodes in this group
      const processedConnIds = new Set<string>();
      for (const node of childNodes) {
        const nodeConns = lookups.connectionsByNodeId.get(node.id) || [];
        for (const conn of nodeConns) {
          if (processedConnIds.has(conn.id)) continue;
          processedConnIds.add(conn.id);

          const sourceNode = lookups.nodeById.get(conn.sourceId);
          const targetNode = lookups.nodeById.get(conn.targetId);
          if (!sourceNode || !targetNode) continue;

          let sourceX: number, sourceY: number, targetX: number, targetY: number;

          // Source endpoint - handle collapsed groups
          const sourceGroup = sourceNode.groupId ? lookups.groupById.get(sourceNode.groupId) : undefined;
          if (sourceGroup?.collapsed) {
            sourceX = sourceGroup.x + collapsedStackWidth;
            sourceY = sourceGroup.y + collapsedStackHeight / 2;
          } else {
            sourceX = sourceNode.x + (sourceNode.width || DEFAULT_NOTE_WIDTH);
            sourceY = sourceNode.y + (sourceNode.height || DEFAULT_NOTE_HEIGHT) / 2;
          }

          // Target endpoint - handle collapsed groups
          const targetGroup = targetNode.groupId ? lookups.groupById.get(targetNode.groupId) : undefined;
          if (targetGroup?.collapsed) {
            targetX = targetGroup.x;
            targetY = targetGroup.y + collapsedStackHeight / 2;
          } else {
            targetX = targetNode.x;
            targetY = targetNode.y + (targetNode.height || DEFAULT_NOTE_HEIGHT) / 2;
          }

          // Generate curved path
          const midX = (sourceX + targetX) / 2;
          const pathD = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

          connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
        }
      }
    })
    .on('end', function(_, d) {
      select(this).attr('opacity', 1).classed('dragging', false);

      // Stop dragging but keep physics running for drift/settle effect
      const physics = physicsRef.current.get(d.id);
      if (physics) {
        physics.isDragging = false;
        startPhysicsLoop(); // Continue for settle animation
      }

      setState(prev => {
        // Calculate delta from original position
        const originalGroup = prev.groups.find(g => g.id === d.id);
        const dx = originalGroup ? d.x - originalGroup.x : 0;
        const dy = originalGroup ? d.y - originalGroup.y : 0;

        const newState = {
          ...prev,
          groups: prev.groups.map(g => g.id === d.id ? { ...g, x: d.x, y: d.y } : g),
          // Update all child nodes' positions
          nodes: prev.nodes.map(n =>
            n.groupId === d.id ? { ...n, x: n.x + dx, y: n.y + dy } : n
          ),
        };
        saveState(newState);
        return newState;
      });
    });
}
