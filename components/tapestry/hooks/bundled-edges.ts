/**
 * Bundled Edge Rendering Factory
 *
 * Renders connections using hierarchical edge bundling for improved visualization
 * when the new layout mode is active.
 */

import { select, type Selection } from 'd3-selection';
import type { TapestryNode, TapestryGroup, TapestryState } from '@/types/tapestry';
import { generateBundledEdgePath, EDGE_OPACITY } from '@/lib/tapestry';
import type { EdgeBundle, BundledEdge, LayoutResult } from '@/lib/tapestry/types';

interface RenderBundledEdgesOptions {
  connectionsGroup: Selection<SVGGElement, unknown, null, undefined>;
  edgeBundles: EdgeBundle[];
  layout: LayoutResult;
  nodes: TapestryNode[];
  groups: TapestryGroup[];
  highlightedConnections: Set<string>;
  highlightedEdges: Set<string>;
  hasAnyHighlight: boolean;
  selectedNodesSize: number;
  nodeMatchesFilters: (node: TapestryNode) => boolean;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (state: TapestryState) => void;
}

/**
 * Renders bundled edges with hierarchical bundling visualization.
 */
export function renderBundledEdges({
  connectionsGroup,
  edgeBundles,
  layout,
  nodes,
  groups,
  highlightedConnections,
  highlightedEdges,
  hasAnyHighlight,
  selectedNodesSize,
  nodeMatchesFilters,
  setState,
  saveState,
}: RenderBundledEdgesOptions): void {
  edgeBundles.forEach(bundle => {
    const bundleGroup = connectionsGroup.append('g')
      .attr('class', 'edge-bundle')
      .attr('data-entity-id', bundle.sourceEntityId);

    bundle.edges.forEach((edge: BundledEdge) => {
      // Check if source/target are in collapsed groups
      const sourceNode = nodes.find(n => n.id === bundle.sourceEntityId);
      const targetNode = nodes.find(n => n.id === edge.targetNodeId);

      const sourceGroup = sourceNode?.groupId ? groups.find(g => g.id === sourceNode.groupId) : null;
      const targetGroup = targetNode?.groupId ? groups.find(g => g.id === targetNode.groupId) : null;
      const sourceInCollapsed = sourceGroup?.collapsed;
      const targetInCollapsed = targetGroup?.collapsed;

      // Skip if both ends are in collapsed groups
      if (sourceInCollapsed && targetInCollapsed) return;

      // Generate bundled path
      const pathD = generateBundledEdgePath(bundle, edge, layout);

      // Check highlight from BOTH node selection and sidebar
      const isHighlightedByNodeSelection = highlightedConnections.has(edge.connectionId);
      const isHighlightedBySidebar = highlightedEdges.has(edge.connectionId);
      const isHighlighted = isHighlightedByNodeSelection || isHighlightedBySidebar;
      const hasAnyHighlightActive = hasAnyHighlight || selectedNodesSize > 0;

      // Calculate opacity based on highlight state - hide if either end is in collapsed group
      const isPartiallyCollapsed = sourceInCollapsed || targetInCollapsed;
      const edgeOpacity = isPartiallyCollapsed ? 0.3 : (isHighlighted ? 1 : (hasAnyHighlightActive ? 0.1 : EDGE_OPACITY.default));

      // Check if edge should be filtered out
      const sourceMatches = sourceNode ? nodeMatchesFilters(sourceNode) : true;
      const targetMatches = targetNode ? nodeMatchesFilters(targetNode) : true;
      const connectionVisible = sourceMatches && targetMatches;

      const pathId = `bundled-path-${edge.connectionId}`;

      const edgeGroup = bundleGroup.append('g')
        .attr('class', 'bundled-edge')
        .attr('cursor', 'pointer')
        .attr('opacity', connectionVisible ? edgeOpacity : 0.05);

      // Monochromatic color scheme
      const lineColor = 'hsl(var(--muted-foreground))';
      const highlightColor = 'hsl(var(--primary))';

      // Background path for depth
      edgeGroup.append('path')
        .attr('d', pathD)
        .attr('stroke', lineColor)
        .attr('stroke-width', Math.max(1, edge.thickness * 0.5) + 1)
        .attr('stroke-linecap', 'round')
        .attr('fill', 'none')
        .attr('opacity', 0.1);

      // Main path - monochromatic
      const mainPath = edgeGroup.append('path')
        .attr('id', pathId)
        .attr('class', `connection-path ${isHighlighted ? 'highlighted' : ''}`)
        .attr('d', pathD)
        .attr('stroke', isHighlighted ? highlightColor : lineColor)
        .attr('stroke-width', Math.max(1, edge.thickness * 0.5))
        .attr('stroke-linecap', 'round')
        .attr('fill', 'none')
        .style('--connection-accent-color', highlightColor);

      // Hover interactions (only when no node/sidebar is highlighting)
      edgeGroup
        .on('mouseenter', function() {
          if (!hasAnyHighlightActive) {
            select(this).attr('opacity', 1);
            mainPath.attr('stroke', highlightColor);
          }
        })
        .on('mouseleave', function() {
          if (!hasAnyHighlightActive) {
            select(this).attr('opacity', EDGE_OPACITY.default);
            mainPath.attr('stroke', lineColor);
          }
        })
        .on('click', () => {
          // Remove connection
          setState(prev => {
            const conn = prev.connections.find(c => c.id === edge.connectionId);
            if (!conn) return prev;
            const newState = {
              ...prev,
              connections: prev.connections.filter(c => c.id !== edge.connectionId),
            };
            saveState(newState);
            return newState;
          });
        });
    });
  });
}
