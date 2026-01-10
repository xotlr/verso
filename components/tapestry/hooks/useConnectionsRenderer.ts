'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TapestryConnection, TapestryNode } from '@/types/tapestry';
import { getNodeDimensions, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT } from '@/types/tapestry';
import type { TapestryLookups } from '@/lib/tapestry/lookups';
import type { GSelection } from './types';

interface ConnectionsRendererProps {
  connectionsGroup: GSelection | null;
  connections: TapestryConnection[];
  lookups: TapestryLookups;
  highlightedConnections: Set<string>;
  showAllLines: boolean;
  nodeMatchesFilters: (node: TapestryNode) => boolean;
  onConnectionClick?: (connectionId: string) => void;
  onConnectionDoubleClick?: (connectionId: string, screenX: number, screenY: number) => void;
  transformRef: React.MutableRefObject<d3.ZoomTransform>;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

/**
 * Renders connections layer using D3 data joins.
 * Only re-renders when connections or highlight state changes.
 */
export function useConnectionsRenderer({
  connectionsGroup,
  connections,
  lookups,
  highlightedConnections,
  showAllLines,
  nodeMatchesFilters,
  onConnectionClick,
  onConnectionDoubleClick,
  transformRef,
  svgRef,
}: ConnectionsRendererProps): void {
  // Track previous state to diff
  const prevConnectionsRef = useRef<string>('');
  const prevHighlightsRef = useRef<string>('');

  useEffect(() => {
    if (!connectionsGroup) return;

    // Quick check if we need to update at all
    const currentConnIds = connections.map(c => c.id).sort().join(',');
    const currentHighlights = Array.from(highlightedConnections).sort().join(',');

    const connectionsChanged = currentConnIds !== prevConnectionsRef.current;
    const highlightsChanged = currentHighlights !== prevHighlightsRef.current;

    if (!connectionsChanged && !highlightsChanged) {
      return; // Nothing to update
    }

    prevConnectionsRef.current = currentConnIds;
    prevHighlightsRef.current = currentHighlights;

    const mutedColor = 'hsl(var(--muted-foreground))';
    const highlightColor = 'hsl(var(--primary))';

    // Filter to valid connections (both endpoints exist and aren't in collapsed groups)
    const validConnections = connections.filter(conn => {
      const sourceNode = lookups.nodeById.get(conn.sourceId);
      const targetNode = lookups.nodeById.get(conn.targetId);
      if (!sourceNode || !targetNode) return false;

      const sourceGroup = sourceNode.groupId ? lookups.groupById.get(sourceNode.groupId) : undefined;
      const targetGroup = targetNode.groupId ? lookups.groupById.get(targetNode.groupId) : undefined;

      // Skip if both ends are in collapsed groups
      if (sourceGroup?.collapsed && targetGroup?.collapsed) return false;

      return true;
    });

    // D3 data join
    const selection = connectionsGroup
      .selectAll<SVGGElement, TapestryConnection>('.connection')
      .data(validConnections, d => d.id);

    // EXIT: Remove connections that no longer exist
    selection.exit().remove();

    // ENTER: Add new connections
    const enter = selection.enter()
      .append('g')
      .attr('class', 'connection')
      .attr('cursor', 'pointer');

    // Add path elements to entering groups
    enter.each(function(conn) {
      const group = d3.select(this);
      group.attr('data-conn-id', conn.id);

      // Background path
      group.append('path')
        .attr('class', 'conn-bg')
        .attr('stroke', mutedColor)
        .attr('stroke-linecap', 'round')
        .attr('fill', 'none');

      // Main path
      group.append('path')
        .attr('class', 'conn-main')
        .attr('stroke-linecap', 'round')
        .attr('fill', 'none');

      // Hit area for clicks
      group.append('rect')
        .attr('class', 'conn-hitarea')
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer');

      // Label
      group.append('text')
        .attr('class', 'connection-label-handwritten')
        .attr('font-family', 'var(--font-caveat), cursive')
        .attr('font-size', '13px')
        .style('pointer-events', 'none');
    });

    // UPDATE + ENTER: Update all connections
    const merged = selection.merge(enter);

    merged.each(function(conn) {
      const group = d3.select(this);
      const sourceNode = lookups.nodeById.get(conn.sourceId);
      const targetNode = lookups.nodeById.get(conn.targetId);
      if (!sourceNode || !targetNode) return;

      // Check collapsed groups
      const sourceGroup = sourceNode.groupId ? lookups.groupById.get(sourceNode.groupId) : undefined;
      const targetGroup = targetNode.groupId ? lookups.groupById.get(targetNode.groupId) : undefined;
      const sourceInCollapsed = sourceGroup?.collapsed;
      const targetInCollapsed = targetGroup?.collapsed;

      // Calculate endpoints
      const sourceDims = getNodeDimensions(sourceNode);
      const targetDims = getNodeDimensions(targetNode);

      const collapsedStackWidth = DEFAULT_NOTE_WIDTH + 30;
      const collapsedStackHeight = DEFAULT_NOTE_HEIGHT + 30;

      let sourceX: number, sourceY: number, targetX: number, targetY: number;

      if (sourceInCollapsed && sourceGroup) {
        sourceX = sourceGroup.x + collapsedStackWidth;
        sourceY = sourceGroup.y + collapsedStackHeight / 2;
      } else {
        sourceX = sourceNode.x + sourceDims.width;
        sourceY = sourceNode.y + sourceDims.height / 2;
      }

      if (targetInCollapsed && targetGroup) {
        targetX = targetGroup.x;
        targetY = targetGroup.y + collapsedStackHeight / 2;
      } else {
        targetX = targetNode.x;
        targetY = targetNode.y + targetDims.height / 2;
      }

      // Generate path
      const dx = Math.abs(targetX - sourceX);
      const controlOffset = Math.max(40, dx * 0.3);
      const pathD = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

      // Determine visibility
      const sourceMatches = nodeMatchesFilters(sourceNode);
      const targetMatches = nodeMatchesFilters(targetNode);
      const connectionVisible = sourceMatches && targetMatches;
      const isHighlighted = highlightedConnections.has(conn.id);
      const shouldShow = showAllLines || isHighlighted;

      // Opacity
      let opacity = 0;
      if (shouldShow && connectionVisible) {
        opacity = isHighlighted ? 1 : (showAllLines ? 0.25 : 0);
      } else if (!connectionVisible) {
        opacity = 0.05;
      }

      group.attr('opacity', opacity);

      // Update background path
      group.select('.conn-bg')
        .attr('d', pathD)
        .attr('stroke-width', isHighlighted ? 3 : 2)
        .attr('opacity', isHighlighted ? 0.4 : 0.15);

      // Update main path
      const mainPath = group.select('.conn-main')
        .attr('d', pathD)
        .attr('stroke', isHighlighted ? highlightColor : mutedColor)
        .attr('stroke-width', isHighlighted ? 2 : 1.5)
        .attr('stroke-dasharray', isHighlighted ? 'none' : '8 4')
        .attr('marker-end', conn.directed ? 'url(#arrow)' : null);

      // Update hit area
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      group.select('.conn-hitarea')
        .attr('x', midX - 50)
        .attr('y', midY - 15)
        .attr('width', 100)
        .attr('height', 30);

      // Update label
      group.select('.connection-label-handwritten')
        .attr('dy', -8)
        .attr('fill', conn.label ? 'hsl(var(--foreground) / 0.7)' : 'hsl(var(--muted-foreground) / 0.4)')
        .html(`<textPath href="#path-${conn.id}" startOffset="50%" text-anchor="middle">${conn.label || '···'}</textPath>`);

      // Ensure main path has ID for textPath
      mainPath.attr('id', `path-${conn.id}`);
    });

    // Event handlers (attached once on enter)
    enter
      .on('click', function(event, conn) {
        event.stopPropagation();
        onConnectionClick?.(conn.id);
      })
      .on('dblclick', function(event, conn) {
        event.stopPropagation();
        const sourceNode = lookups.nodeById.get(conn.sourceId);
        const targetNode = lookups.nodeById.get(conn.targetId);
        if (!sourceNode || !targetNode) return;

        const sourceDims = getNodeDimensions(sourceNode);
        const targetDims = getNodeDimensions(targetNode);
        const midX = (sourceNode.x + sourceDims.width + targetNode.x) / 2;
        const midY = (sourceNode.y + sourceDims.height / 2 + targetNode.y + targetDims.height / 2) / 2;

        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          const screenX = midX * transformRef.current.k + transformRef.current.x + svgRect.left;
          const screenY = midY * transformRef.current.k + transformRef.current.y + svgRect.top;
          onConnectionDoubleClick?.(conn.id, screenX, screenY);
        }
      })
      .on('mouseenter', function() {
        const mainPath = d3.select(this).select('.conn-main');
        mainPath
          .attr('stroke', highlightColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', 'none');
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function(_, conn) {
        const isHighlighted = highlightedConnections.has(conn.id);
        const mainPath = d3.select(this).select('.conn-main');
        mainPath
          .attr('stroke', isHighlighted ? highlightColor : mutedColor)
          .attr('stroke-width', isHighlighted ? 2 : 1.5)
          .attr('stroke-dasharray', isHighlighted ? 'none' : '8 4');

        // Restore opacity based on current state
        const sourceNode = lookups.nodeById.get(conn.sourceId);
        const targetNode = lookups.nodeById.get(conn.targetId);
        const sourceMatches = sourceNode ? nodeMatchesFilters(sourceNode) : false;
        const targetMatches = targetNode ? nodeMatchesFilters(targetNode) : false;
        const shouldShow = showAllLines || isHighlighted;
        const opacity = shouldShow && sourceMatches && targetMatches
          ? (isHighlighted ? 1 : 0.25)
          : 0.05;
        d3.select(this).attr('opacity', opacity);
      });

  }, [connectionsGroup, connections, lookups, highlightedConnections, showAllLines, nodeMatchesFilters, onConnectionClick, onConnectionDoubleClick, transformRef, svgRef]);
}
