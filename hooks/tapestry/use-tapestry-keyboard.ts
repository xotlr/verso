/**
 * Tapestry Keyboard Shortcuts Hook
 *
 * Handles keyboard shortcuts for the tapestry canvas.
 * Dispatches to the appropriate handlers based on key combinations.
 */

import { useEffect } from 'react';
import { GRID_MAJOR_SPACING, GRID_MINOR_SPACING } from '@/types/tapestry';

interface UseTapestryKeyboardOptions {
  // History
  undo: () => void;
  redo: () => void;
  // Selection
  selectedNodes: Set<string>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Actions
  handleDeleteSelected: () => void;
  handleCopyNodes: () => void;
  handlePasteNodes: () => void;
  handleDuplicateSelected: () => void;
  handleNudgeSelected: (dx: number, dy: number) => void;
  handleCycleSelection: (direction: 1 | -1) => void;
  // State setters
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenu: React.Dispatch<React.SetStateAction<{
    x: number;
    y: number;
    nodeId?: string;
    groupId?: string;
    connectionId?: string;
  } | null>>;
}

/**
 * Sets up keyboard shortcuts for the tapestry canvas.
 * Shortcuts are only active when not focused on an input element.
 */
export function useTapestryKeyboard({
  undo,
  redo,
  selectedNodes,
  setSelectedNodes,
  handleDeleteSelected,
  handleCopyNodes,
  handlePasteNodes,
  handleDuplicateSelected,
  handleNudgeSelected,
  handleCycleSelection,
  setIsConnecting,
  setContextMenu,
}: UseTapestryKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if tapestry container is focused or no specific element is focused
      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement ||
                             activeEl instanceof HTMLTextAreaElement ||
                             activeEl?.getAttribute('contenteditable') === 'true';
      if (isInputFocused) return;

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete/Backspace - delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Escape - clear selection and cancel connecting mode
      if (e.key === 'Escape') {
        setSelectedNodes(new Set());
        setIsConnecting(false);
        setContextMenu(null);
        return;
      }

      // Cmd/Ctrl+D - duplicate selected nodes
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Cmd/Ctrl+C - copy selected nodes to clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNodes.size > 0) {
        e.preventDefault();
        handleCopyNodes();
        return;
      }

      // Cmd/Ctrl+V - paste nodes from clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePasteNodes();
        return;
      }

      // Arrow keys - nudge selected nodes (Shift for larger nudge)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNodes.size > 0) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? GRID_MAJOR_SPACING : GRID_MINOR_SPACING;
        const dx = e.key === 'ArrowRight' ? nudgeAmount : e.key === 'ArrowLeft' ? -nudgeAmount : 0;
        const dy = e.key === 'ArrowDown' ? nudgeAmount : e.key === 'ArrowUp' ? -nudgeAmount : 0;
        handleNudgeSelected(dx, dy);
        return;
      }

      // Tab - cycle through nodes (Shift+Tab for reverse)
      if (e.key === 'Tab') {
        e.preventDefault();
        handleCycleSelection(e.shiftKey ? -1 : 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    selectedNodes,
    setSelectedNodes,
    handleDeleteSelected,
    handleCopyNodes,
    handlePasteNodes,
    handleDuplicateSelected,
    handleNudgeSelected,
    handleCycleSelection,
    setIsConnecting,
    setContextMenu,
  ]);
}
