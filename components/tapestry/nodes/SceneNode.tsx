'use client';

/**
 * SceneNode - Scene card with header and content
 *
 * Displays scene with:
 * - Colored header bar with scene number
 * - Time of day icon
 * - Scene heading/title
 * - Content preview
 */

import { memo } from 'react';
import type { TapestryNode } from '@/types/tapestry';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, TIME_ICONS, NODE_HEADER_HEIGHT } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface SceneNodeProps {
  /** The scene node data */
  node: TapestryNode;
  /** Whether this node is selected */
  isSelected: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const BORDER_RADIUS = 6;
const PADDING = 10;

// ============================================================================
// Component
// ============================================================================

export const SceneNode = memo(function SceneNode({
  node,
  isSelected,
}: SceneNodeProps) {
  const width = node.width ?? DEFAULT_NOTE_WIDTH;
  const height = node.height ?? DEFAULT_NOTE_HEIGHT;

  const timeIcon = node.timeOfDay ? TIME_ICONS[node.timeOfDay] || '' : '';

  return (
    <g className="scene-node">
      {/* Card background */}
      <rect
        className="node-bg"
        x={0}
        y={0}
        width={width}
        height={height}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />

      {/* Header bar */}
      <rect
        className="node-header"
        x={0}
        y={0}
        width={width}
        height={NODE_HEADER_HEIGHT}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
        fill={node.color}
      />
      {/* Square off bottom corners of header */}
      <rect
        className="node-header-bottom"
        x={0}
        y={NODE_HEADER_HEIGHT - BORDER_RADIUS}
        width={width}
        height={BORDER_RADIUS}
        fill={node.color}
      />

      {/* Scene number */}
      {node.sceneNumber !== undefined && (
        <text
          x={PADDING}
          y={NODE_HEADER_HEIGHT / 2 + 4}
          className="node-type-icon"
          fill="hsl(var(--card))"
          fontSize={12}
          fontWeight={600}
        >
          {node.sceneNumber}
        </text>
      )}

      {/* Time of day icon */}
      {timeIcon && (
        <text
          x={width - PADDING}
          y={NODE_HEADER_HEIGHT / 2 + 4}
          textAnchor="end"
          className="time-icon"
          fill="hsl(var(--card))"
          fontSize={12}
        >
          {timeIcon}
        </text>
      )}

      {/* Title */}
      <text
        x={PADDING}
        y={NODE_HEADER_HEIGHT + 18}
        className="node-title"
        fill="hsl(var(--foreground))"
        fontSize={13}
        fontWeight={500}
      >
        <tspan>
          {truncateText(node.title, width - PADDING * 2, 13)}
        </tspan>
      </text>

      {/* Content preview */}
      {node.content && (
        <foreignObject
          x={PADDING}
          y={NODE_HEADER_HEIGHT + 28}
          width={width - PADDING * 2}
          height={height - NODE_HEADER_HEIGHT - 38}
        >
          <div
            className="text-xs text-muted-foreground overflow-hidden line-clamp-3"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {node.content}
          </div>
        </foreignObject>
      )}

      {/* Pin indicator */}
      {node.pinned && (
        <g className="node-thumbtack" transform={`translate(${width - 12}, 6)`}>
          <circle r={4} fill="hsl(var(--primary))" />
          <circle r={2} fill="hsl(var(--primary-foreground))" />
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={-2}
          y={-2}
          width={width + 4}
          height={height + 4}
          rx={BORDER_RADIUS + 2}
          ry={BORDER_RADIUS + 2}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          className="selection-ring"
        />
      )}
    </g>
  );
});

SceneNode.displayName = 'SceneNode';

// ============================================================================
// Utilities
// ============================================================================

function truncateText(text: string, maxWidth: number, fontSize: number): string {
  if (!text) return '';

  // Rough estimate: average character width is about 0.6 * fontSize
  const avgCharWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  if (text.length <= maxChars) return text;

  return text.slice(0, maxChars - 2) + '...';
}
