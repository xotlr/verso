'use client';

/**
 * NodeRenderer - Renders visible nodes with virtualization
 *
 * Maps nodes to their appropriate component based on type,
 * wrapping each in BaseNode for drag handling.
 */

import { memo, useCallback, useMemo } from 'react';
import type { TapestryNode } from '@/types/tapestry';
import type { Viewport } from '@/lib/tapestry/virtualization';
import { getVisibleNodes, getVisibleNodeIds } from '@/lib/tapestry/virtualization';
import type { HighlightState } from '@/lib/tapestry/types';

import { BaseNode } from '../nodes/BaseNode';
import { CharacterNode } from '../nodes/CharacterNode';
import { SceneNode } from '../nodes/SceneNode';
import { NoteNode } from '../nodes/NoteNode';

// ============================================================================
// Types
// ============================================================================

export interface NodeRendererProps {
  /** All nodes */
  nodes: TapestryNode[];
  /** Current viewport for virtualization */
  viewport: Viewport;
  /** Selected node IDs */
  selectedNodeIds: Set<string>;
  /** Highlight state for hover/lock */
  highlightState: HighlightState;
  /** Callback when node is clicked */
  onNodeClick?: (nodeId: string, event: React.MouseEvent) => void;
  /** Callback when node drag starts */
  onDragStart?: (nodeId: string) => void;
  /** Callback during node drag */
  onDragMove?: (nodeId: string, x: number, y: number) => void;
  /** Callback when node drag ends */
  onDragEnd?: (nodeId: string, x: number, y: number) => void;
  /** Callback when node is deleted */
  onDelete?: (nodeId: string) => void;
  /** Callback when node edit is requested */
  onEdit?: (nodeId: string) => void;
  /** Grid size for snap */
  gridSize?: number;
  /** Padding around viewport for pre-rendering */
  viewportPadding?: number;
}

// ============================================================================
// Component
// ============================================================================

export const NodeRenderer = memo(function NodeRenderer({
  nodes,
  viewport,
  selectedNodeIds,
  highlightState,
  onNodeClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onEdit,
  gridSize = 0,
  viewportPadding = 100,
}: NodeRendererProps) {
  // Get visible nodes
  const visibleNodes = useMemo(
    () => getVisibleNodes(nodes, viewport, viewportPadding),
    [nodes, viewport, viewportPadding]
  );

  // Determine which node is highlighted
  const highlightedNodeId = useMemo(() => {
    return (
      highlightState.lockedCharacterId ||
      highlightState.lockedSceneId ||
      highlightState.hoveredCharacterId ||
      highlightState.hoveredSceneId
    );
  }, [highlightState]);

  // Check if any node is highlighted (for dimming others)
  const hasHighlight = highlightedNodeId !== null;

  // Render a single node based on type
  const renderNodeContent = useCallback(
    (node: TapestryNode, isSelected: boolean) => {
      switch (node.type) {
        case 'character':
          return <CharacterNode node={node} isSelected={isSelected} />;
        case 'scene':
          return <SceneNode node={node} isSelected={isSelected} />;
        case 'note':
        case 'location':
        case 'item':
        default:
          return <NoteNode node={node} isSelected={isSelected} />;
      }
    },
    []
  );

  return (
    <g className="nodes-layer" role="listbox" aria-label="Tapestry nodes">
      {visibleNodes.map((node, index) => {
        const isSelected = selectedNodeIds.has(node.id);
        const isHighlighted = node.id === highlightedNodeId;
        const isDimmed = hasHighlight && !isHighlighted && !isSelected;

        return (
          <BaseNode
            key={node.id}
            node={node}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            onClick={onNodeClick}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
            onEdit={onEdit}
            gridSize={gridSize}
            tabIndex={index}
          >
            {renderNodeContent(node, isSelected)}
          </BaseNode>
        );
      })}
    </g>
  );
});

NodeRenderer.displayName = 'NodeRenderer';
