import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { Node } from 'prosemirror-model';

export const smartClickPluginKey = new PluginKey('smartClick');

/**
 * Plugin that moves cursor to nearest editable line when clicking anywhere in the document.
 * This provides word-processor-like behavior where clicking margins or decorations
 * intelligently places the cursor in the nearest editable content.
 */
export function createSmartClickPlugin() {
  return new Plugin({
    key: smartClickPluginKey,

    props: {
      handleClick(view: EditorView, pos: number, event: MouseEvent) {
        const { state } = view;
        const { doc } = state;

        // Get the clicked position's resolved node
        const $pos = doc.resolve(pos);

        // Check if we clicked on an editable textblock
        const isTextblock = $pos.parent.isTextblock;

        if (isTextblock) {
          // Already in editable content, use default behavior
          return false;
        }

        // Find nearest editable block
        const nearestPos = findNearestEditableBlock(doc, pos);

        if (nearestPos !== null) {
          // Move cursor to start of nearest editable block
          const tr = state.tr.setSelection(
            TextSelection.near(doc.resolve(nearestPos))
          );
          view.dispatch(tr.scrollIntoView());
          view.focus();
          return true; // Prevent default
        }

        return false; // Use default behavior
      }
    }
  });
}

/**
 * Find the nearest editable block to a clicked position.
 * Walks through the document and calculates distance to each textblock.
 */
function findNearestEditableBlock(doc: Node, clickedPos: number): number | null {
  let nearestPos: number | null = null;
  let minDistance = Infinity;

  // Walk through all blocks in the document
  doc.forEach((node: Node, offset: number) => {
    if (node.isTextblock) {
      // Calculate distance from clicked position
      const blockStart = offset;
      const blockEnd = offset + node.nodeSize;

      let distance: number;
      if (clickedPos < blockStart) {
        // Clicked before this block
        distance = blockStart - clickedPos;
      } else if (clickedPos > blockEnd) {
        // Clicked after this block
        distance = clickedPos - blockEnd;
      } else {
        // Clicked inside this block (shouldn't happen, but handle it)
        distance = 0;
      }

      // Track nearest block
      if (distance < minDistance) {
        minDistance = distance;
        // Position cursor at start of block (+1 to be inside the node)
        nearestPos = blockStart + 1;
      }
    }
  });

  return nearestPos;
}
