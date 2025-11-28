'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Scene, Character, Location } from '@/types/screenplay';
import { Beat } from '@/components/beat-board';
import { GraphFilterState, GraphLayoutType, StoryNode, GraphLink } from '@/types/graph';
import { useGraphData } from './hooks/use-graph-data';
import { StoryGraphToolbar } from './story-graph-toolbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { sanitizeForD3Text } from '@/lib/utils';

interface StoryGraphProps {
  screenplayId: string;
  screenplayTitle: string;
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  beats: Beat[];
  onBackToEditor?: () => void;
  onSceneClick?: (sceneId: string) => void;
}

// Node sizes by type
const NODE_SIZES = {
  scene: { width: 140, height: 80 },
  character: { radius: 35 },
  beat: { width: 120, height: 70 },
  location: { width: 100, height: 50 },
};

export function StoryGraph({
  screenplayTitle,
  scenes,
  characters,
  locations,
  beats,
  onBackToEditor,
  onSceneClick,
}: StoryGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<GraphFilterState>({
    showScenes: true,
    showCharacters: true,
    showBeats: true,
    showLocations: false,
  });

  const [layout, setLayout] = useState<GraphLayoutType>('force');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const graphData = useGraphData(
    { scenes, characters, locations, beats },
    filters
  );

  // Track zoom transform and simulation for cleanup
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const simulationRef = useRef<d3.Simulation<StoryNode, GraphLink> | null>(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Stop any existing simulation before recreating
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    // Clear previous content and event handlers
    svg.selectAll('*').remove();
    svg.on('.zoom', null); // Remove zoom listeners

    // Create container group for zoom
    const container = svg.append('g').attr('class', 'graph-container');

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        transformRef.current = event.transform;
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Apply saved transform
    svg.call(zoom.transform, transformRef.current);

    // Create a copy of nodes and links for simulation
    const nodes = graphData.nodes.map(d => ({ ...d }));
    const links = graphData.links.map(d => ({ ...d }));

    // Create force simulation
    const simulation = d3.forceSimulation<StoryNode>(nodes)
      .force('link', d3.forceLink<StoryNode, GraphLink>(links)
        .id(d => d.id)
        .distance(150)
        .strength(d => d.strength || 0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(80));

    // Store simulation in ref for cleanup
    simulationRef.current = simulation;

    // Draw links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.color || 'hsl(var(--border))')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => d.type === 'story' ? 2 : 1)
      .attr('stroke-dasharray', d => d.type === 'story' ? '5,5' : 'none');

    // Create drag behavior
    const drag = d3.drag<SVGGElement, StoryNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Draw nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .call(drag);

    // Render different node types with sanitized text
    node.each(function(d) {
      const nodeGroup = d3.select(this);

      if (d.type === 'scene') {
        // Scene: Rectangle
        nodeGroup.append('rect')
          .attr('width', NODE_SIZES.scene.width)
          .attr('height', NODE_SIZES.scene.height)
          .attr('x', -NODE_SIZES.scene.width / 2)
          .attr('y', -NODE_SIZES.scene.height / 2)
          .attr('rx', 8)
          .attr('fill', 'hsl(var(--card))')
          .attr('stroke', d.color || 'hsl(var(--border))')
          .attr('stroke-width', 2);

        // Scene header background
        nodeGroup.append('rect')
          .attr('width', NODE_SIZES.scene.width)
          .attr('height', 24)
          .attr('x', -NODE_SIZES.scene.width / 2)
          .attr('y', -NODE_SIZES.scene.height / 2)
          .attr('rx', 8)
          .attr('fill', d.color ? `${d.color}30` : 'hsl(var(--muted))');

        // Scene number (sanitized)
        nodeGroup.append('text')
          .attr('x', 0)
          .attr('y', -NODE_SIZES.scene.height / 2 + 16)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(d.label, 20));

        // Scene heading (sanitized and truncated)
        const sceneNode = d as StoryNode & { heading: string };
        nodeGroup.append('text')
          .attr('x', 0)
          .attr('y', 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('fill', 'hsl(var(--muted-foreground))')
          .text(sanitizeForD3Text(sceneNode.heading, 20));

      } else if (d.type === 'character') {
        // Character: Circle
        nodeGroup.append('circle')
          .attr('r', NODE_SIZES.character.radius)
          .attr('fill', d.color || 'hsl(var(--primary))')
          .attr('stroke', 'hsl(var(--background))')
          .attr('stroke-width', 2);

        // Character initial (sanitized)
        const sanitizedLabel = sanitizeForD3Text(d.label, 20);
        const initial = sanitizedLabel.charAt(0).toUpperCase();
        nodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .attr('fill', 'white')
          .text(initial);

        // Character name below (sanitized)
        nodeGroup.append('text')
          .attr('y', NODE_SIZES.character.radius + 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(d.label, 12));

      } else if (d.type === 'beat') {
        // Beat: Rounded rectangle
        nodeGroup.append('rect')
          .attr('width', NODE_SIZES.beat.width)
          .attr('height', NODE_SIZES.beat.height)
          .attr('x', -NODE_SIZES.beat.width / 2)
          .attr('y', -NODE_SIZES.beat.height / 2)
          .attr('rx', 6)
          .attr('fill', 'hsl(var(--card))')
          .attr('stroke', d.color || 'hsl(var(--border))')
          .attr('stroke-width', 2);

        // Color indicator
        nodeGroup.append('circle')
          .attr('cx', NODE_SIZES.beat.width / 2 - 12)
          .attr('cy', -NODE_SIZES.beat.height / 2 + 12)
          .attr('r', 5)
          .attr('fill', d.color || 'hsl(var(--primary))');

        // Beat title (sanitized)
        nodeGroup.append('text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(d.label, 15));

      } else if (d.type === 'location') {
        // Location: Pill shape
        nodeGroup.append('rect')
          .attr('width', NODE_SIZES.location.width)
          .attr('height', NODE_SIZES.location.height)
          .attr('x', -NODE_SIZES.location.width / 2)
          .attr('y', -NODE_SIZES.location.height / 2)
          .attr('rx', 25)
          .attr('fill', 'hsl(var(--card))')
          .attr('stroke', d.color || 'hsl(var(--border))')
          .attr('stroke-width', 1);

        // Location name (sanitized)
        nodeGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '9px')
          .attr('fill', 'hsl(var(--foreground))')
          .text(sanitizeForD3Text(d.label, 14));
      }
    });

    // Node click handler
    node.on('click', (event, d) => {
      if (d.type === 'scene' && onSceneClick) {
        const sceneId = d.id.replace('scene-', '');
        onSceneClick(sceneId);
      }
    });

    // Hover effects
    node.on('mouseenter', function() {
      d3.select(this).attr('opacity', 0.8);
    }).on('mouseleave', function() {
      d3.select(this).attr('opacity', 1);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as StoryNode).x || 0)
        .attr('y1', d => (d.source as StoryNode).y || 0)
        .attr('x2', d => (d.target as StoryNode).x || 0)
        .attr('y2', d => (d.target as StoryNode).y || 0);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Cleanup function
    return () => {
      // Stop and clear simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }

      // Remove zoom event listeners
      svg.on('.zoom', null);

      // Remove all event listeners from nodes
      node.on('click', null);
      node.on('mouseenter', null);
      node.on('mouseleave', null);

      // Remove drag listeners
      node.on('.drag', null);

      // Clear all content
      svg.selectAll('*').remove();
    };
  }, [graphData, dimensions, onSceneClick]);

  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBackToEditor && (
              <Button variant="ghost" size="sm" onClick={onBackToEditor}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground">Story Graph</h1>
              <p className="text-sm text-muted-foreground">{screenplayTitle}</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {scenes.length} scenes &middot; {characters.length} characters &middot; {beats.length} beats
          </div>
        </div>
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <StoryGraphToolbar
          filters={filters}
          onFiltersChange={setFilters}
          layout={layout}
          onLayoutChange={setLayout}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
        />

        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
          style={{ background: 'hsl(var(--background))' }}
          role="img"
          aria-label={`Story graph visualization for ${screenplayTitle} with ${graphData.nodes.length} nodes`}
          tabIndex={0}
        >
          <title>Story Graph - {screenplayTitle}</title>
          <desc>
            Interactive visualization showing {scenes.length} scenes,
            {characters.length} characters, and {beats.length} beats
            as connected nodes. Use mouse to pan and zoom.
          </desc>
        </svg>

        {graphData.nodes.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No data to display</p>
              <p className="text-sm">Add scenes, characters, or beats to see the story graph</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryGraph;
