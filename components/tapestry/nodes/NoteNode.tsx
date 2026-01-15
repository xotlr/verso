'use client';

/**
 * NoteNode - Simple card for notes, items, and locations
 *
 * A versatile card that adapts styling based on node type:
 * - Note: Handwritten style
 * - Location: Place marker icon
 * - Item: Package/prop icon
 */

import { memo } from 'react';
import type { TapestryNode, TapestryNodeType } from '@/types/tapestry';
import { DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, NODE_HEADER_HEIGHT } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface NoteNodeProps {
  /** The node data */
  node: TapestryNode;
  /** Whether this node is selected */
  isSelected: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const BORDER_RADIUS = 6;
const PADDING = 10;

const TYPE_ICONS: Record<TapestryNodeType, string> = {
  note: '📝',
  location: '📍',
  item: '📦',
  scene: '🎬',
  character: '👤',
};

// ============================================================================
// Component
// ============================================================================

export const NoteNode = memo(function NoteNode({
  node,
  isSelected,
}: NoteNodeProps) {
  const width = node.width ?? DEFAULT_NOTE_WIDTH;
  const height = node.height ?? DEFAULT_NOTE_HEIGHT;

  const icon = TYPE_ICONS[node.type] || TYPE_ICONS.note;
  const isHandwritten = node.type === 'note';

  return (
    <g className={`note-node ${node.type}-node`}>
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
      <rect
        className="node-header-bottom"
        x={0}
        y={NODE_HEADER_HEIGHT - BORDER_RADIUS}
        width={width}
        height={BORDER_RADIUS}
        fill={node.color}
      />

      {/* Type icon */}
      <text
        x={PADDING}
        y={NODE_HEADER_HEIGHT / 2 + 5}
        className="node-type-icon"
        fontSize={12}
      >
        {icon}
      </text>

      {/* Title */}
      <text
        x={PADDING + 20}
        y={NODE_HEADER_HEIGHT / 2 + 4}
        className="node-title"
        fill="hsl(var(--card))"
        fontSize={12}
        fontWeight={500}
      >
        {truncateText(node.title || 'Untitled', width - PADDING * 2 - 24, 12)}
      </text>

      {/* Content */}
      <foreignObject
        x={PADDING}
        y={NODE_HEADER_HEIGHT + 8}
        width={width - PADDING * 2}
        height={height - NODE_HEADER_HEIGHT - 16}
      >
        <div
          className={`text-sm overflow-hidden line-clamp-4 ${
            isHandwritten ? 'handwritten' : ''
          }`}
          style={{
            color: 'hsl(var(--foreground))',
            fontFamily: isHandwritten ? 'var(--font-caveat), Caveat, cursive' : 'var(--font-sans)',
            fontSize: isHandwritten ? '15px' : '13px',
            lineHeight: isHandwritten ? 1.3 : 1.4,
          }}
        >
          {node.content || 'No content'}
        </div>
      </foreignObject>

      {/* Pin indicator */}
      {node.pinned && (
        <g className="node-thumbtack" transform={`translate(${width - 12}, 6)`}>
          <circle r={4} fill="hsl(var(--primary))" />
          <circle r={2} fill="hsl(var(--primary-foreground))" />
        </g>
      )}

      {/* Location-specific: location type badge */}
      {node.type === 'location' && node.locationType && (
        <text
          x={width - PADDING}
          y={NODE_HEADER_HEIGHT / 2 + 4}
          textAnchor="end"
          fill="hsl(var(--card))"
          fontSize={10}
          fontWeight={600}
        >
          {node.locationType}
        </text>
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

NoteNode.displayName = 'NoteNode';

// ============================================================================
// Utilities
// ============================================================================

function truncateText(text: string, maxWidth: number, fontSize: number): string {
  if (!text) return '';

  const avgCharWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  if (text.length <= maxChars) return text;

  return text.slice(0, maxChars - 2) + '...';
}
