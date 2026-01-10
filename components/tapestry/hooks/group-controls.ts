/**
 * Group Controls Overlay Factory
 *
 * Sets up the controls overlay for expanded groups (drag handle, collapse toggle, delete button).
 * These controls are rendered ON TOP of nodes for proper interactivity.
 */

import { select, type Selection } from 'd3-selection';
import { drag } from 'd3-drag';
import type { TapestryGroup, TapestryState, TapestryConnection } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';
import { calculateConnectionPath } from '../renderers';

interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  nodeCount: number;
}

interface TapestryLookups {
  nodeById: Map<string, any>;
  groupById: Map<string, TapestryGroup>;
  connectionsByNodeId: Map<string, TapestryConnection[]>;
  nodesByGroupId: Map<string, any[]>;
}

interface SetupGroupControlsOptions {
  groups: TapestryGroup[];
  groupControlsOverlay: Selection<SVGGElement, unknown, null, undefined>;
  groupsGroup: Selection<SVGGElement, unknown, null, undefined>;
  nodesGroup: Selection<SVGGElement, unknown, null, undefined>;
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>;
  container: Selection<SVGGElement, unknown, null, undefined>;
  lookups: TapestryLookups;
  groupBoundsMap: Map<string, GroupBounds>;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (state: TapestryState) => void;
  animateCollapse: (groupId: string, collapse: boolean) => void;
}

/**
 * Sets up controls overlay for all expanded groups.
 * Includes drag handle, collapse toggle, and delete button.
 */
export function setupGroupControls({
  groups,
  groupControlsOverlay,
  groupsGroup,
  nodesGroup,
  connectionsGroup,
  container,
  lookups,
  groupBoundsMap,
  setState,
  saveState,
  animateCollapse,
}: SetupGroupControlsOptions): void {
  groups.forEach(group => {
    const isCollapsed = group.collapsed || false;
    const isAnimating = group.collapseProgress !== undefined;

    // Skip overlay for collapsed or animating groups - the card has its own controls
    if (isCollapsed || isAnimating) return;

    const bounds = groupBoundsMap.get(group.id);

    // Use pre-computed bounds instead of recalculating
    const groupX = bounds?.x ?? group.x;
    const groupY = bounds?.y ?? group.y;
    const displayWidth = bounds?.width ?? group.width;

    const controlsG = groupControlsOverlay.append('g')
      .attr('class', 'group-controls')
      .attr('data-group-id', group.id)
      .attr('transform', `translate(${groupX}, ${groupY})`);

    // Drag handle covering the header - fully transparent
    const dragHandle = controlsG.append('rect')
      .attr('class', 'group-drag-handle')
      .attr('width', displayWidth)
      .attr('height', 32)
      .attr('fill', 'transparent')
      .attr('stroke', 'none')
      .attr('cursor', 'grab')
      .style('pointer-events', 'all');

    // Store positions for this group's drag
    let dragStartX = groupX;
    let dragStartY = groupY;

    const groupDragBehavior = drag<SVGRectElement, unknown>()
      .container(function() { return container.node() as SVGGElement; })
      .clickDistance(5)
      .on('start', function(event) {
        event.sourceEvent?.stopPropagation();
        select(this).attr('cursor', 'grabbing');
        const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
        groupEl.raise().attr('opacity', 0.85).classed('dragging', true);
        // Store starting position
        dragStartX = groupX;
        dragStartY = groupY;
      })
      .on('drag', function(event) {
        const dx = event.dx;
        const dy = event.dy;
        dragStartX += dx;
        dragStartY += dy;

        // Update group background position
        const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
        groupEl.attr('transform', `translate(${dragStartX}, ${dragStartY})`);

        // Update this control overlay position
        select(this.parentNode as Element).attr('transform', `translate(${dragStartX}, ${dragStartY})`);

        // Move child nodes visually and track their new positions
        // O(1) lookup instead of O(N) filter
        const groupChildNodes = lookups.nodesByGroupId.get(group.id) || [];
        const childNodePositions = new Map<string, {x: number, y: number}>();
        groupChildNodes.forEach(node => {
          const nodeEl = nodesGroup.select(`[data-node-id="${node.id}"]`);
          const nodeTransform = nodeEl.attr('transform');
          const nodeMatch = nodeTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (nodeMatch) {
            const nodeX = parseFloat(nodeMatch[1]) + dx;
            const nodeY = parseFloat(nodeMatch[2]) + dy;
            // Preserve rotation if present
            const rotationMatch = nodeTransform?.match(/rotate\([^)]+\)/);
            const rotation = rotationMatch ? ' ' + rotationMatch[0] : '';
            nodeEl.attr('transform', `translate(${nodeX}, ${nodeY})${rotation}`);
            childNodePositions.set(node.id, {x: nodeX, y: nodeY});
          }
        });

        // Update connections for moved nodes - use O(1) lookups
        // Get unique connections involving any child node
        const processedConnIds = new Set<string>();
        for (const node of groupChildNodes) {
          const nodeConns = lookups.connectionsByNodeId.get(node.id) || [];
          for (const conn of nodeConns) {
            if (processedConnIds.has(conn.id)) continue;
            processedConnIds.add(conn.id);

            const sourceInGroup = childNodePositions.has(conn.sourceId);
            const targetInGroup = childNodePositions.has(conn.targetId);
            if (!sourceInGroup && !targetInGroup) continue;

            // O(1) lookups instead of O(N) finds
            const sourceNode = lookups.nodeById.get(conn.sourceId);
            const targetNode = lookups.nodeById.get(conn.targetId);
            if (!sourceNode || !targetNode) continue;

            // Get positions - from map if in group, otherwise from DOM
            let sX: number, sY: number, tX: number, tY: number;

            if (sourceInGroup) {
              const pos = childNodePositions.get(conn.sourceId)!;
              sX = pos.x;
              sY = pos.y;
            } else {
              const sourceEl = nodesGroup.select(`[data-node-id="${sourceNode.id}"]`);
              const sourceTransform = sourceEl.attr('transform');
              const sourceMatch = sourceTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (!sourceMatch) continue;
              sX = parseFloat(sourceMatch[1]);
              sY = parseFloat(sourceMatch[2]);
            }

            if (targetInGroup) {
              const pos = childNodePositions.get(conn.targetId)!;
              tX = pos.x;
              tY = pos.y;
            } else {
              const targetEl = nodesGroup.select(`[data-node-id="${targetNode.id}"]`);
              const targetTransform = targetEl.attr('transform');
              const targetMatch = targetTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (!targetMatch) continue;
              tX = parseFloat(targetMatch[1]);
              tY = parseFloat(targetMatch[2]);
            }

            const sourceDims = getNodeDimensions(sourceNode);
            const targetDims = getNodeDimensions(targetNode);

            const srcX = sX + sourceDims.width;
            const srcY = sY + sourceDims.height / 2;
            const tgtX = tX;
            const tgtY = tY + targetDims.height / 2;

            // Uses extracted utility for connection path
            const pathD = calculateConnectionPath(srcX, srcY, tgtX, tgtY);

            connectionsGroup.selectAll(`[data-conn-id="${conn.id}"] path`).attr('d', pathD);
          }
        }
      })
      .on('end', function() {
        select(this).attr('cursor', 'grab');
        const groupEl = groupsGroup.select(`[data-group-id="${group.id}"]`);
        groupEl.attr('opacity', 1).classed('dragging', false);

        // Calculate how much the group moved from original state positions
        // Use pre-computed bounds for O(1) lookup
        const originalBounds = groupBoundsMap.get(group.id);
        const originalX = originalBounds?.x ?? group.x;
        const originalY = originalBounds?.y ?? group.y;

        const dx = dragStartX - originalX;
        const dy = dragStartY - originalY;

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.map(g => g.id === group.id ? { ...g, x: dragStartX, y: dragStartY } : g),
              nodes: prev.nodes.map(n =>
                n.groupId === group.id ? { ...n, x: n.x + dx, y: n.y + dy } : n
              ),
            };
            saveState(newState);
            return newState;
          });
        }
      });

    dragHandle.call(groupDragBehavior);

    // Collapse toggle overlay
    controlsG.append('text')
      .attr('class', 'collapse-toggle-overlay')
      .attr('x', 14)
      .attr('y', 32 / 2 + 5)
      .attr('font-size', '10px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all')
      .text('▼')
      .on('click', (event) => {
        event.stopPropagation();
        // Animate collapse (expanded -> collapsed)
        animateCollapse(group.id, true);
      });

    // Delete button overlay
    const deleteG = controlsG.append('g')
      .attr('transform', `translate(${displayWidth - 24}, ${32 / 2})`)
        .attr('cursor', 'pointer')
        .attr('opacity', 0.4)
        .on('mouseenter', function() { select(this).attr('opacity', 1); })
        .on('mouseleave', function() { select(this).attr('opacity', 0.4); })
        .on('click', (event) => {
          event.stopPropagation();
          setState(prev => {
            const newState = {
              ...prev,
              groups: prev.groups.filter(g => g.id !== group.id),
              nodes: prev.nodes.map(n => n.groupId === group.id ? { ...n, groupId: undefined } : n),
            };
            saveState(newState);
            return newState;
          });
        });

    deleteG.append('circle')
      .attr('r', 10)
      .attr('fill', 'hsl(var(--destructive) / 0.15)');

    deleteG.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .attr('fill', 'hsl(var(--destructive))')
      .text('×');
  });
}
