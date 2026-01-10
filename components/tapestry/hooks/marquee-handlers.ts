/**
 * Marquee Selection Handler Factory
 *
 * Sets up mousedown, mousemove, mouseup handlers for marquee selection on the SVG canvas.
 */

import { pointer, type Selection } from 'd3-selection';
import type { TapestryNode } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';

interface MarqueeState {
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

/**
 * Check if a node intersects with marquee selection rectangle.
 */
function isNodeInMarquee(
  node: TapestryNode,
  start: { x: number; y: number } | null,
  end: { x: number; y: number } | null
): boolean {
  if (!start || !end) return false;

  const dims = getNodeDimensions(node);
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  // AABB intersection check
  return node.x < maxX && node.x + dims.width > minX &&
         node.y < maxY && node.y + dims.height > minY;
}

interface SetupMarqueeHandlersOptions {
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  container: Selection<SVGGElement, unknown, null, undefined>;
  nodes: TapestryNode[];
  marqueeRef: React.MutableRefObject<MarqueeState>;
  isConnecting: boolean;
  // Marquee state functions
  startMarquee: (x: number, y: number) => void;
  updateMarquee: (x: number, y: number) => void;
  // Setters
  setIsMarqueeSelecting: (value: boolean) => void;
  setMarqueeStart: (point: { x: number; y: number } | null) => void;
  setMarqueeEnd: (point: { x: number; y: number } | null) => void;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsConnecting: (value: boolean) => void;
  setConnectingFrom: (value: string | null) => void;
  setContextMenu: (menu: { x: number; y: number; nodeId?: string; groupId?: string } | null) => void;
}

/**
 * Sets up marquee selection handlers on the SVG element.
 */
export function setupMarqueeHandlers({
  svg,
  container,
  nodes,
  marqueeRef,
  isConnecting,
  startMarquee,
  updateMarquee,
  setIsMarqueeSelecting,
  setMarqueeStart,
  setMarqueeEnd,
  setSelectedNodes,
  setIsConnecting,
  setConnectingFrom,
  setContextMenu,
}: SetupMarqueeHandlersOptions): void {
  // Mousedown - start marquee selection
  svg.on('mousedown', (event) => {
    // Only left button, and only if not clicking on a node/group element
    if (event.button !== 0) return;
    const target = event.target as SVGElement;
    // Check if we're clicking on the canvas background (not a node)
    if (target.tagName === 'rect' && !target.closest('.tapestry-node') && !target.closest('.tapestry-group')) {
      event.preventDefault();
      const [mx, my] = pointer(event, container.node());
      startMarquee(mx, my);
    }
  });

  // Mousemove - update marquee rectangle
  svg.on('mousemove', (event) => {
    if (!marqueeRef.current.start) return;
    const [mx, my] = pointer(event, container.node());
    updateMarquee(mx, my);

    // Update marquee rectangle
    const start = marqueeRef.current.start;
    const end = marqueeRef.current.end;
    if (!start || !end) return;

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    let marqueeRect = container.select<SVGRectElement>('.marquee-rect');
    if (marqueeRect.empty()) {
      marqueeRect = container.append('rect')
        .attr('class', 'marquee-rect')
        .attr('fill', 'hsl(var(--primary) / 0.1)')
        .attr('stroke', 'hsl(var(--primary))')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('pointer-events', 'none');
    }
    marqueeRect
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h);
  });

  // Mouseup - complete marquee selection
  svg.on('mouseup', (_event) => {
    if (!marqueeRef.current.start) return;

    const start = marqueeRef.current.start;
    const end = marqueeRef.current.end;

    // If marquee is too small, treat as click (clear selection)
    const w = Math.abs((end?.x ?? start.x) - start.x);
    const h = Math.abs((end?.y ?? start.y) - start.y);

    if (w < 5 && h < 5) {
      // Treat as simple click - clear selection
      if (isConnecting) {
        setIsConnecting(false);
        setConnectingFrom(null);
      }
      setSelectedNodes(new Set());
      setContextMenu(null);
    } else {
      // Select all nodes within marquee bounds
      const selected = new Set<string>();
      nodes.forEach(node => {
        if (isNodeInMarquee(node, start, end)) {
          selected.add(node.id);
        }
      });
      setSelectedNodes(selected);
    }

    // Clear marquee state
    marqueeRef.current = { start: null, end: null };
    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeEnd(null);
    container.select('.marquee-rect').remove();
  });

  // Right-click on canvas - prevent default to allow panning
  svg.on('contextmenu', (event) => {
    event.preventDefault();
    setContextMenu(null);
  });
}
