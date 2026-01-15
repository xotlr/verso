'use client';

/**
 * BaseNode - Wrapper component for all tapestry nodes
 *
 * Provides:
 * - Drag handling via useDragNode
 * - Selection highlighting
 * - Keyboard accessibility
 * - ARIA attributes
 */

import { memo, useRef, useCallback, type ReactNode, type KeyboardEvent } from 'react';
import { useTapestryContext } from '../state/TapestryContext';
import { useDragNode } from '../hooks/useDragNode';
import type { TapestryNode } from '@/types/tapestry';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BaseNodeProps {
  /** The node data */
  node: TapestryNode;
  /** Whether this node is selected */
  isSelected: boolean;
  /** Whether this node is highlighted (hovered/locked) */
  isHighlighted: boolean;
  /** Whether other nodes are highlighted (dim this one) */
  isDimmed: boolean;
  /** Children to render inside the node group */
  children: ReactNode;
  /** Optional custom class name */
  className?: string;
  /** Callback when node is clicked */
  onClick?: (nodeId: string, event: React.MouseEvent) => void;
  /** Callback when drag starts */
  onDragStart?: (nodeId: string) => void;
  /** Callback during drag */
  onDragMove?: (nodeId: string, x: number, y: number) => void;
  /** Callback when drag ends */
  onDragEnd?: (nodeId: string, x: number, y: number) => void;
  /** Callback for delete action */
  onDelete?: (nodeId: string) => void;
  /** Callback for edit action */
  onEdit?: (nodeId: string) => void;
  /** Grid size for snapping (0 = disabled) */
  gridSize?: number;
  /** Whether interactions are enabled */
  enabled?: boolean;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
}

// ============================================================================
// Component
// ============================================================================

export const BaseNode = memo(function BaseNode({
  node,
  isSelected,
  isHighlighted,
  isDimmed,
  children,
  className,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onEdit,
  gridSize = 0,
  enabled = true,
  tabIndex = 0,
}: BaseNodeProps) {
  const nodeRef = useRef<SVGGElement>(null);
  const { transformRef, selection } = useTapestryContext();

  // Drag handling
  const { dragProps } = useDragNode({
    node,
    nodeRef,
    transformRef,
    isSelected,
    selectedNodeIds: selection.selectedNodeIds,
    gridSize,
    onDragStart,
    onDragMove,
    onDragEnd,
    enabled,
  });

  // Handle click
  const handleClick = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      // Don't trigger click if we just finished dragging
      onClick?.(node.id, event);
    },
    [node.id, onClick]
  );

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<SVGGElement>) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          // Simulate click for selection
          onClick?.(node.id, event as unknown as React.MouseEvent);
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          onDelete?.(node.id);
          break;
        case 'e':
        case 'E':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onEdit?.(node.id);
          }
          break;
      }
    },
    [node.id, onClick, onDelete, onEdit]
  );

  // Build aria-label
  const ariaLabel = `${node.title || 'Untitled'}, ${node.type} node`;

  return (
    <g
      ref={nodeRef}
      transform={`translate(${node.x}, ${node.y})`}
      className={cn(
        'tapestry-node',
        `${node.type}-node`,
        isSelected && 'selected',
        isHighlighted && `${node.type}-highlighted`,
        isDimmed && 'opacity-30',
        className
      )}
      role="option"
      aria-selected={isSelected || isHighlighted}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      data-node-id={node.id}
      data-node-type={node.type}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...dragProps}
    >
      {children}
    </g>
  );
});

BaseNode.displayName = 'BaseNode';
