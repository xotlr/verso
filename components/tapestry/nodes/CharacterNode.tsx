'use client';

/**
 * CharacterNode - Polaroid-style character card
 *
 * Displays character with:
 * - Portrait area with initials
 * - Name in handwritten font
 * - Dialogue count stats
 * - Optional pin indicator
 */

import { memo, useMemo } from 'react';
import type { TapestryNode } from '@/types/tapestry';
import { DEFAULT_CHARACTER_WIDTH, DEFAULT_CHARACTER_HEIGHT } from '@/types/tapestry';

// ============================================================================
// Types
// ============================================================================

export interface CharacterNodeProps {
  /** The character node data */
  node: TapestryNode;
  /** Whether this node is selected */
  isSelected: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PORTRAIT_HEIGHT = 60;
const PADDING = 8;
const BORDER_RADIUS = 4;

// ============================================================================
// Utilities
// ============================================================================

function getInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export const CharacterNode = memo(function CharacterNode({
  node,
  isSelected,
}: CharacterNodeProps) {
  const width = node.width ?? DEFAULT_CHARACTER_WIDTH;
  const height = node.height ?? DEFAULT_CHARACTER_HEIGHT;

  const initials = useMemo(() => getInitials(node.title), [node.title]);

  // Use the node's color for the portrait background
  const portraitColor = node.color;

  return (
    <g className="polaroid-node">
      {/* Card background (polaroid frame) */}
      <rect
        className="polaroid-frame"
        x={0}
        y={0}
        width={width}
        height={height}
        rx={BORDER_RADIUS}
        ry={BORDER_RADIUS}
      />

      {/* Portrait area */}
      <rect
        className="polaroid-portrait"
        x={PADDING}
        y={PADDING}
        width={width - PADDING * 2}
        height={PORTRAIT_HEIGHT}
        rx={2}
        ry={2}
        fill={portraitColor}
        opacity={0.2}
      />

      {/* Initials in portrait */}
      <text
        x={width / 2}
        y={PADDING + PORTRAIT_HEIGHT / 2 + 6}
        textAnchor="middle"
        className="polaroid-name"
        fill={portraitColor}
        fontSize={20}
        fontWeight={600}
      >
        {initials}
      </text>

      {/* Character name */}
      <text
        x={width / 2}
        y={PADDING + PORTRAIT_HEIGHT + 20}
        textAnchor="middle"
        className="polaroid-name"
        fontSize={14}
      >
        {node.title || 'Unnamed'}
      </text>

      {/* Stats (dialogue count) */}
      {node.dialogueCount !== undefined && (
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          className="polaroid-stats"
          fontSize={11}
        >
          {node.dialogueCount} lines
        </text>
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

CharacterNode.displayName = 'CharacterNode';
