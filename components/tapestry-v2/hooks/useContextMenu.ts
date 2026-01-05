'use client';

/**
 * useContextMenu - Right-click context menu for tapestry elements
 */

import { useState, useCallback, useEffect, type RefObject } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
  groupId?: string;
  connectionId?: string;
}

export interface UseContextMenuOptions {
  /** Reference to the container */
  containerRef: RefObject<SVGSVGElement | null>;
  /** Whether context menu is enabled */
  enabled?: boolean;
}

export interface UseContextMenuReturn {
  /** Current context menu state (null if closed) */
  contextMenu: ContextMenuState | null;
  /** Open context menu at position */
  openContextMenu: (state: ContextMenuState) => void;
  /** Close context menu */
  closeContextMenu: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useContextMenu({
  containerRef,
  enabled = true,
}: UseContextMenuOptions): UseContextMenuReturn {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const openContextMenu = useCallback((state: ContextMenuState) => {
    setContextMenu(state);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle right-click on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const target = event.target as Element;

      // Check what was clicked
      const nodeEl = target.closest('[data-node-id]');
      const groupEl = target.closest('.tapestry-group');
      const connEl = target.closest('[data-conn-id]');

      const state: ContextMenuState = {
        x: event.clientX,
        y: event.clientY,
      };

      if (nodeEl) {
        state.nodeId = nodeEl.getAttribute('data-node-id') || undefined;
      } else if (groupEl) {
        // Group ID from data attribute or class
        const groupId = groupEl.getAttribute('data-group-id');
        if (groupId) state.groupId = groupId;
      } else if (connEl) {
        state.connectionId = connEl.getAttribute('data-conn-id') || undefined;
      }

      setContextMenu(state);
    };

    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [containerRef, enabled]);

  // Close on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => {
      setContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    // Delay adding listener to avoid immediate close
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  return { contextMenu, openContextMenu, closeContextMenu };
}
