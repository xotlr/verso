'use client';

/**
 * ConnectionRenderer - Renders connection paths between nodes
 *
 * Features:
 * - Curved bezier paths
 * - Color by connection type
 * - Opacity based on highlight state
 * - Inline label editing
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { TapestryNode, TapestryConnection } from '@/types/tapestry';
import { CONNECTION_COLORS } from '@/types/tapestry';
import { getNodeDimensions } from '@/types/tapestry';
import type { HighlightState } from '@/lib/tapestry/types';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionRendererProps {
  /** All connections */
  connections: TapestryConnection[];
  /** Node lookup by ID */
  nodeById: Map<string, TapestryNode>;
  /** Visible node IDs for culling */
  visibleNodeIds: Set<string>;
  /** IDs of collapsed groups (to hide connections to/from their members) */
  collapsedGroupIds?: Set<string>;
  /** Highlight state */
  highlightState: HighlightState;
  /** Selected connection IDs */
  selectedConnectionIds?: Set<string>;
  /** Callback when connection is clicked */
  onConnectionClick?: (connectionId: string) => void;
  /** Callback when connection is hovered */
  onConnectionHover?: (connectionId: string | null) => void;
  /** Callback when connection label is edited */
  onLabelEdit?: (connectionId: string, label: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPACITY = 0.25;
const HIGHLIGHTED_OPACITY = 0.7;
const DIMMED_OPACITY = 0.1;

// ============================================================================
// Path calculation
// ============================================================================

function getNodeCenter(node: TapestryNode): { x: number; y: number } {
  const { width, height } = getNodeDimensions(node);
  return {
    x: node.x + width / 2,
    y: node.y + height / 2,
  };
}

function generateCurvedPath(
  source: { x: number; y: number },
  target: { x: number; y: number }
): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  // Control points for smooth bezier curve
  // Offset control points horizontally for a nice curve
  const curvature = Math.min(Math.abs(dx) * 0.5, 100);

  const cx1 = source.x + curvature;
  const cy1 = source.y;
  const cx2 = target.x - curvature;
  const cy2 = target.y;

  return `M ${source.x} ${source.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${target.x} ${target.y}`;
}

// ============================================================================
// Editable Label Component
// ============================================================================

interface ConnectionLabelProps {
  connectionId: string;
  label: string;
  x: number;
  y: number;
  opacity: number;
  onLabelEdit?: (connectionId: string, label: string) => void;
}

const ConnectionLabel = memo(function ConnectionLabel({
  connectionId,
  label,
  x,
  y,
  opacity,
  onLabelEdit,
}: ConnectionLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLabelEdit) {
      setEditValue(label);
      setIsEditing(true);
    }
  }, [label, onLabelEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onLabelEdit?.(connectionId, editValue.trim());
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(label);
      setIsEditing(false);
    }
  }, [connectionId, editValue, label, onLabelEdit]);

  const handleBlur = useCallback(() => {
    if (editValue.trim() !== label) {
      onLabelEdit?.(connectionId, editValue.trim());
    }
    setIsEditing(false);
  }, [connectionId, editValue, label, onLabelEdit]);

  if (isEditing) {
    return (
      <foreignObject
        x={x - 60}
        y={y - 16}
        width={120}
        height={24}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-full px-2 text-xs text-center bg-background border border-border rounded outline-none focus:ring-1 focus:ring-primary"
          style={{ fontSize: '12px' }}
        />
      </foreignObject>
    );
  }

  return (
    <text
      className="connection-label-handwritten cursor-pointer"
      x={x}
      y={y - 8}
      textAnchor="middle"
      opacity={opacity}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`Connection label: ${label}. Double-click to edit.`}
    >
      {label}
    </text>
  );
});

ConnectionLabel.displayName = 'ConnectionLabel';

// ============================================================================
// Component
// ============================================================================

export const ConnectionRenderer = memo(function ConnectionRenderer({
  connections,
  nodeById,
  visibleNodeIds,
  collapsedGroupIds = new Set(),
  highlightState,
  selectedConnectionIds = new Set(),
  onConnectionClick,
  onConnectionHover,
  onLabelEdit,
}: ConnectionRendererProps) {
  // Filter to visible connections (excluding those to/from collapsed groups)
  const visibleConnections = useMemo(() => {
    return connections.filter(conn => {
      // At least one endpoint must be visible
      if (!visibleNodeIds.has(conn.sourceId) && !visibleNodeIds.has(conn.targetId)) {
        return false;
      }

      // Hide connections where either endpoint is in a collapsed group
      const sourceNode = nodeById.get(conn.sourceId);
      const targetNode = nodeById.get(conn.targetId);

      if (sourceNode?.groupId && collapsedGroupIds.has(sourceNode.groupId)) {
        return false;
      }
      if (targetNode?.groupId && collapsedGroupIds.has(targetNode.groupId)) {
        return false;
      }

      return true;
    });
  }, [connections, visibleNodeIds, collapsedGroupIds, nodeById]);

  // Get highlighted node ID
  const highlightedNodeId = useMemo(() => {
    return (
      highlightState.lockedCharacterId ||
      highlightState.lockedSceneId ||
      highlightState.hoveredCharacterId ||
      highlightState.hoveredSceneId
    );
  }, [highlightState]);

  const hasHighlight = highlightedNodeId !== null;

  // Calculate opacity for a connection
  const getOpacity = useCallback(
    (conn: TapestryConnection): number => {
      if (selectedConnectionIds.has(conn.id)) {
        return HIGHLIGHTED_OPACITY;
      }

      if (!hasHighlight) {
        return DEFAULT_OPACITY;
      }

      // Highlight if connected to highlighted node
      if (
        conn.sourceId === highlightedNodeId ||
        conn.targetId === highlightedNodeId
      ) {
        return HIGHLIGHTED_OPACITY;
      }

      return DIMMED_OPACITY;
    },
    [hasHighlight, highlightedNodeId, selectedConnectionIds]
  );

  return (
    <g className="connections-layer">
      {visibleConnections.map(conn => {
        const sourceNode = nodeById.get(conn.sourceId);
        const targetNode = nodeById.get(conn.targetId);

        if (!sourceNode || !targetNode) return null;

        const source = getNodeCenter(sourceNode);
        const target = getNodeCenter(targetNode);
        const path = generateCurvedPath(source, target);
        const color = conn.color || CONNECTION_COLORS[conn.type] || CONNECTION_COLORS.custom;
        const opacity = getOpacity(conn);

        return (
          <g
            key={conn.id}
            className="connection"
            data-conn-id={conn.id}
          >
            {/* Invisible wider path for easier clicking */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'pointer' }}
              onClick={() => onConnectionClick?.(conn.id)}
              onMouseEnter={() => onConnectionHover?.(conn.id)}
              onMouseLeave={() => onConnectionHover?.(null)}
            />

            {/* Visible path */}
            <path
              className="connection-path"
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={opacity}
              pointerEvents="none"
            />

            {/* Editable label */}
            {conn.label && (
              <ConnectionLabel
                connectionId={conn.id}
                label={conn.label}
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2}
                opacity={opacity}
                onLabelEdit={onLabelEdit}
              />
            )}

            {/* Arrow for directed connections */}
            {conn.directed && (
              <polygon
                points="-6,-4 0,0 -6,4"
                fill={color}
                opacity={opacity}
                transform={`translate(${target.x}, ${target.y}) rotate(${
                  Math.atan2(target.y - source.y, target.x - source.x) * (180 / Math.PI)
                })`}
              />
            )}
          </g>
        );
      })}
    </g>
  );
});

ConnectionRenderer.displayName = 'ConnectionRenderer';
