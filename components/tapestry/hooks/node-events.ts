/**
 * Node Event Handler Factory
 *
 * Sets up click, double-click, context menu, and keyboard event handlers for tapestry nodes.
 */

import { select, type Selection } from 'd3-selection';
import type { TapestryNode, TapestryState, TapestryConnection } from '@/types/tapestry';
import { createConnection } from '@/types/tapestry';

interface NodeEventHandlerOptions {
  node: TapestryNode;
  nodeGroup: Selection<SVGGElement, TapestryNode, null, undefined>;
  // Refs
  lastTapRef: React.MutableRefObject<{ nodeId: string; time: number } | null>;
  // State
  selectedNodes: Set<string>;
  isConnecting: boolean;
  connectingFrom: string | null;
  // Setters
  setEditingNode: (node: TapestryNode | null) => void;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  setProfileCharacter: (node: TapestryNode | null) => void;
  setIsConnecting: (value: boolean) => void;
  setConnectingFrom: (value: string | null) => void;
  setContextMenu: (menu: { x: number; y: number; nodeId?: string; groupId?: string } | null) => void;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
  saveState: (state: TapestryState) => void;
  handleDeleteSelected: () => void;
}

/**
 * Sets up all event handlers for a tapestry node.
 */
export function setupNodeEventHandlers({
  node,
  nodeGroup,
  lastTapRef,
  selectedNodes,
  isConnecting,
  connectingFrom,
  setEditingNode,
  setSelectedNodes,
  setProfileCharacter,
  setIsConnecting,
  setConnectingFrom,
  setContextMenu,
  setState,
  saveState,
  handleDeleteSelected,
}: NodeEventHandlerOptions): void {
  // Click handler with double-tap detection and connection mode
  nodeGroup.on('click', (event) => {
    event.stopPropagation();
    const now = Date.now();

    // Double-tap detection
    if (lastTapRef.current &&
        lastTapRef.current.nodeId === node.id &&
        now - lastTapRef.current.time < 300) {
      lastTapRef.current = null;
      setEditingNode(node);
      return;
    }

    lastTapRef.current = { nodeId: node.id, time: now };

    if (isConnecting && connectingFrom) {
      if (connectingFrom !== node.id) {
        setState(prev => {
          const exists = prev.connections.some(
            c => (c.sourceId === connectingFrom && c.targetId === node.id) ||
                 (c.sourceId === node.id && c.targetId === connectingFrom)
          );
          if (exists) return prev;

          const newState = {
            ...prev,
            connections: [...prev.connections, createConnection(connectingFrom, node.id)],
          };
          saveState(newState);
          return newState;
        });
      }
      setIsConnecting(false);
      setConnectingFrom(null);
    } else {
      // Shift+click adds to selection, regular click replaces selection
      if (event.shiftKey) {
        // Toggle this node in selection
        setSelectedNodes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(node.id)) {
            newSet.delete(node.id);
          } else {
            newSet.add(node.id);
          }
          return newSet;
        });
        // Don't change profile panel on shift+click
      } else {
        // Regular click - toggle single selection
        if (selectedNodes.has(node.id) && selectedNodes.size === 1) {
          setSelectedNodes(new Set());
          setProfileCharacter(null);
        } else {
          setSelectedNodes(new Set([node.id]));
          // Open profile panel for character nodes
          if (node.type === 'character') {
            setProfileCharacter(node);
          } else {
            setProfileCharacter(null);
          }
        }
      }
    }
  });

  // Double-click handler
  nodeGroup.on('dblclick', (event) => {
    event.stopPropagation();
    // Double-click on character opens profile panel
    if (node.type === 'character') {
      setProfileCharacter(node);
    } else {
      setEditingNode(node);
    }
  });

  // Right-click context menu
  nodeGroup.on('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Preserve multi-selection if clicked node is part of it
    const isPartOfSelection = selectedNodes.has(node.id) && selectedNodes.size > 1;

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });

    // Only change selection if clicked node wasn't already part of multi-selection
    if (!isPartOfSelection) {
      setSelectedNodes(new Set([node.id]));
    }
  });

  // Keyboard handler for accessibility (Enter/Space to select)
  nodeGroup.on('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();

      // Shift+Enter adds to selection, regular Enter replaces selection
      if (event.shiftKey) {
        setSelectedNodes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(node.id)) {
            newSet.delete(node.id);
          } else {
            newSet.add(node.id);
          }
          return newSet;
        });
      } else {
        // Regular Enter - toggle single selection
        if (selectedNodes.has(node.id) && selectedNodes.size === 1) {
          setSelectedNodes(new Set());
          setProfileCharacter(null);
        } else {
          setSelectedNodes(new Set([node.id]));
          if (node.type === 'character') {
            setProfileCharacter(node);
          } else {
            setProfileCharacter(null);
          }
        }
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      // Delete this node
      if (selectedNodes.has(node.id)) {
        handleDeleteSelected();
      }
    } else if (event.key === 'e' || event.key === 'E') {
      // Quick edit with 'e' key
      event.preventDefault();
      setEditingNode(node);
    }
  });

  // Focus/blur handlers for hover effect when focused
  nodeGroup.on('focus', () => {
    select(`[data-node-id="${node.id}"]`).classed('keyboard-focused', true);
  });

  nodeGroup.on('blur', () => {
    select(`[data-node-id="${node.id}"]`).classed('keyboard-focused', false);
  });
}
